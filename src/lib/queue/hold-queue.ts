import { Queue, Worker, Job } from "bullmq";
import { getRedisClient } from "./redis";
import { releaseHold } from "../booking/shared-inventory";

const QUEUE_NAME = "booking-holds";

export interface HoldJobData {
  bookingId: string;
  bookingReference: string;
}

let holdQueue: Queue<HoldJobData> | null = null;
let holdWorker: Worker<HoldJobData> | null = null;

export function getHoldQueue(): Queue<HoldJobData> {
  if (!holdQueue) {
    const redis = getRedisClient();
    holdQueue = new Queue<HoldJobData>(QUEUE_NAME, {
      connection: redis,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: "exponential",
          delay: 5000,
        },
        removeOnComplete: 100,
        removeOnFail: 200,
      },
    });
  }
  return holdQueue;
}

/**
 * Schedules hold expiration after the specified delay (default 15 minutes).
 */
export async function scheduleHoldExpiration(
  bookingId: string,
  bookingReference: string,
  delayMs = 15 * 60 * 1000
): Promise<void> {
  try {
    const queue = getHoldQueue();
    await queue.add(
      "expire-hold",
      { bookingId, bookingReference },
      {
        delay: delayMs,
        jobId: `hold-${bookingId}`, // unique job ID prevents duplicates
      }
    );
    console.log(
      `[BullMQ] Scheduled hold expiration for ${bookingReference} in ${delayMs / 1000}s`
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error(`[BullMQ] Failed to schedule hold expiration for ${bookingReference}:`, errorMsg);
    // Even if BullMQ queueing fails, PostgreSQL query-level expiration serves as a fail-safe!
  }
}

/**
 * Initializes the BullMQ worker to process hold expirations.
 */
export function initHoldWorker(): Worker<HoldJobData> {
  if (!holdWorker) {
    const redis = getRedisClient();
    holdWorker = new Worker<HoldJobData>(
      QUEUE_NAME,
      async (job: Job<HoldJobData>) => {
        const { bookingId, bookingReference } = job.data;
        console.log(`[BullMQ] Processing hold expiration for ${bookingReference}...`);
        const released = await releaseHold(bookingId);
        if (released) {
          console.log(`[BullMQ] Hold successfully expired and released: ${bookingReference}`);
        } else {
          console.log(
            `[BullMQ] Hold release skipped (already confirmed or expired): ${bookingReference}`
          );
        }
      },
      {
        connection: redis,
        concurrency: 5,
      }
    );

    holdWorker.on("failed", (job, err) => {
      console.error(`[BullMQ] Hold expiration job ${job?.id} failed:`, err);
    });
  }
  return holdWorker;
}
