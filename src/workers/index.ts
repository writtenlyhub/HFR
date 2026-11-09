import { initHoldWorker, closeHoldWorker } from "@/lib/queue/hold-queue";
import { initCalendarWorker, closeCalendarWorker } from "@/lib/queue/calendar-worker";
import { closeCalendarQueue, scheduleAllActiveCalendarSyncs } from "@/lib/queue/calendar-queue";
import { prisma } from "@/lib/prisma";
import { releaseHold } from "@/lib/booking/shared-inventory";
import { BookingStatus } from "@prisma/client";

let isInitialized = false;

/**
 * Runs a startup sweep to release any holds that expired while the service was stopped.
 */
export async function sweepExpiredHoldsOnBoot(): Promise<number> {
  try {
    const now = new Date();
    const expiredPendingBookings = await prisma.booking.findMany({
      where: {
        status: BookingStatus.PENDING_HOLD,
        holdExpiresAt: { lte: now },
      },
      select: { id: true, bookingReference: true },
    });

    let count = 0;
    for (const b of expiredPendingBookings) {
      const released = await releaseHold(b.id);
      if (released) {
        count++;
        console.log(`[WorkerBoot] Released stale hold on boot: ${b.bookingReference}`);
      }
    }

    if (count > 0) {
      console.log(`[WorkerBoot] Startup sweep released ${count} stale expired booking hold(s).`);
    }
    return count;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("[WorkerBoot] Stale hold sweep encountered warning:", msg);
    return 0;
  }
}

/**
 * Initializes all background workers with duplicate-initialization protection.
 */
export async function startBackgroundWorkers() {
  if (isInitialized) {
    console.log("[Workers] Background workers already initialized in this process.");
    return;
  }

  isInitialized = true;
  console.log("\n========================================================");
  console.log("  HOTEL FEDERATION — BACKGROUND WORKERS STARTING");
  console.log("========================================================");

  // 1. Sweep stale holds on boot
  await sweepExpiredHoldsOnBoot();

  // 2. Initialize Hold Worker (concurrency: 5)
  const holdWorker = initHoldWorker();
  console.log(`[Workers] Hold Expiration Worker active: ${holdWorker.name}`);

  // 3. Initialize Calendar Sync Worker (concurrency: 3)
  const calendarWorker = initCalendarWorker();
  console.log(`[Workers] Calendar Synchronization Worker active: ${calendarWorker.name}`);

  // 4. Schedule active calendar connections
  try {
    const scheduledCount = await scheduleAllActiveCalendarSyncs();
    console.log(`[Workers] Scheduled ${scheduledCount} active calendar connection(s).`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn("[Workers] Failed to schedule initial calendar syncs:", msg);
  }

  console.log("[Workers] All background workers operational.\n");

  // Handle graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`\n[Workers] Received ${signal}. Initiating graceful shutdown...`);
    try {
      await Promise.allSettled([
        closeHoldWorker(),
        closeCalendarWorker(),
        closeCalendarQueue(),
        prisma.$disconnect(),
      ]);
      console.log("[Workers] All workers shut down cleanly.");
    } catch (err) {
      console.error("[Workers] Error during shutdown:", err);
    }
  };

  process.once("SIGTERM", () => shutdown("SIGTERM"));
  process.once("SIGINT", () => shutdown("SIGINT"));
}

// If executed directly from CLI: `node/tsx src/workers/index.ts`
if (require.main === module || (typeof process !== "undefined" && process.argv[1]?.includes("workers"))) {
  startBackgroundWorkers().catch((err) => {
    console.error("[Workers] Fatal startup error:", err);
    process.exit(1);
  });
}
