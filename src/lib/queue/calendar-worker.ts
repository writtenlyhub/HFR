import { Worker, Job } from "bullmq";
import { getRedisClient } from "./redis";
import { CalendarSyncJobData, scheduleCalendarSync } from "./calendar-queue";
import { syncCalendarConnection } from "../calendar/sync-service";
import { prisma } from "@/lib/prisma";

const CALENDAR_QUEUE_NAME = "calendar-sync";

let calendarWorker: Worker<CalendarSyncJobData> | null = null;

/**
 * Initializes the BullMQ worker for processing external calendar synchronization.
 */
export function initCalendarWorker(): Worker<CalendarSyncJobData> {
  if (!calendarWorker) {
    const redis = getRedisClient();
    calendarWorker = new Worker<CalendarSyncJobData>(
      CALENDAR_QUEUE_NAME,
      async (job: Job<CalendarSyncJobData>) => {
        const { connectionId, triggerSource, allowLocalForTesting } = job.data;
        console.log(
          `[BullMQ:Calendar] Processing calendar sync for connection: ${connectionId} (source: ${triggerSource})...`
        );

        // Perform synchronization
        const result = await syncCalendarConnection(connectionId, {
          allowLocalForTesting,
        });

        if (!result.success) {
          console.warn(
            `[BullMQ:Calendar] Connection ${connectionId} sync failed: ${result.errorMessage}`
          );
          throw new Error(result.errorMessage || "Calendar sync failed");
        }

        console.log(
          `[BullMQ:Calendar] Connection ${connectionId} sync succeeded: ${result.eventsProcessed} processed, ${result.eventsCreated} created, ${result.eventsUpdated} updated, ${result.eventsCancelled} cancelled, ${result.conflictsDetected} conflicts.`
        );

        // For scheduled recurring runs, automatically re-schedule the next execution
        if (triggerSource === "SCHEDULED") {
          const conn = await prisma.externalCalendarConnection.findUnique({
            where: { id: connectionId },
            select: { isActive: true, syncIntervalMinutes: true },
          });

          if (conn && conn.isActive) {
            const nextDelayMs = (conn.syncIntervalMinutes || 15) * 60 * 1000;
            await scheduleCalendarSync(connectionId, {
              delayMs: nextDelayMs,
              triggerSource: "SCHEDULED",
              allowLocalForTesting,
            });
            console.log(
              `[BullMQ:Calendar] Enqueued recurring sync for ${connectionId} in ${
                nextDelayMs / 60000
              } minutes.`
            );
          }
        }
      },
      {
        connection: redis,
        concurrency: 3,
      }
    );

    calendarWorker.on("failed", (job, err) => {
      console.error(
        `[BullMQ:Calendar] Sync job ${job?.id} (connection: ${job?.data.connectionId}) failed on attempt ${job?.attemptsMade}:`,
        err.message
      );
    });

    calendarWorker.on("completed", (job) => {
      console.log(`[BullMQ:Calendar] Sync job ${job.id} completed successfully.`);
    });
  }

  return calendarWorker;
}

/**
 * Cleanly closes the BullMQ calendar worker.
 */
export async function closeCalendarWorker(): Promise<void> {
  if (calendarWorker) {
    await calendarWorker.close();
    calendarWorker = null;
  }
}

