import { Queue } from "bullmq";
import { getRedisClient } from "./redis";
import { prisma } from "@/lib/prisma";

const CALENDAR_QUEUE_NAME = "calendar-sync";

export interface CalendarSyncJobData {
  connectionId: string;
  triggerSource?: "SCHEDULED" | "MANUAL" | "WEBHOOK";
  allowLocalForTesting?: boolean;
}

let calendarQueue: Queue<CalendarSyncJobData> | null = null;

export function getCalendarSyncQueue(): Queue<CalendarSyncJobData> {
  if (!calendarQueue) {
    const redis = getRedisClient();
    calendarQueue = new Queue<CalendarSyncJobData>(CALENDAR_QUEUE_NAME, {
      connection: redis,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 10000,
        },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    });
  }
  return calendarQueue;
}

/**
 * Enqueues a sync job for a specific external calendar connection.
 */
export async function scheduleCalendarSync(
  connectionId: string,
  options: {
    delayMs?: number;
    triggerSource?: "SCHEDULED" | "MANUAL" | "WEBHOOK";
    allowLocalForTesting?: boolean;
  } = {}
): Promise<void> {
  try {
    const queue = getCalendarSyncQueue();
    const jobId =
      options.triggerSource === "MANUAL"
        ? `calendar-sync-manual-${connectionId}-${Date.now()}`
        : `calendar-sync-${connectionId}`;

    await queue.add(
      "sync-calendar",
      {
        connectionId,
        triggerSource: options.triggerSource || "SCHEDULED",
        allowLocalForTesting: options.allowLocalForTesting,
      },
      {
        delay: options.delayMs || 0,
        jobId,
      }
    );
    console.log(
      `[BullMQ:Calendar] Scheduled sync for connection ${connectionId} (source: ${
        options.triggerSource || "SCHEDULED"
      })`
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[BullMQ:Calendar] Failed to enqueue sync for ${connectionId}:`, errorMsg);
  }
}

/**
 * Enqueues sync jobs for all currently active external calendar connections.
 */
export async function scheduleAllActiveCalendarSyncs(): Promise<number> {
  const activeConnections = await prisma.externalCalendarConnection.findMany({
    where: { isActive: true },
    select: { id: true, syncIntervalMinutes: true },
  });

  for (const conn of activeConnections) {
    await scheduleCalendarSync(conn.id, { triggerSource: "SCHEDULED" });
  }

  return activeConnections.length;
}

/**
 * Closes the calendar queue cleanly.
 */
export async function closeCalendarQueue(): Promise<void> {
  if (calendarQueue) {
    await calendarQueue.close();
    calendarQueue = null;
  }
}
