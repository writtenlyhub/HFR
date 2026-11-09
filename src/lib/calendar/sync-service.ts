import { prisma } from "@/lib/prisma";
import { BlockReason, BookingStatus } from "@prisma/client";
import { fetchAndParseICal, ParsedCalendarEvent } from "./ical-import";

export interface SyncResult {
  success: boolean;
  connectionId: string;
  connectionName: string;
  eventsProcessed: number;
  eventsCreated: number;
  eventsUpdated: number;
  eventsCancelled: number;
  conflictsDetected: number;
  errorMessage?: string;
  skipped?: boolean;
}

export interface SyncOptions {
  allowLocalForTesting?: boolean;
  timeoutMs?: number;
  maxBytes?: number;
}

/**
 * Synchronizes an external calendar connection (Airbnb, Booking.com, VRBO, etc.)
 * with the Dev Stays Jaipur shared inventory.
 *
 * Implements strict row locking and atomic inventory block updates.
 * Preserves confirmed website bookings in the event of external calendar conflicts.
 */
export async function syncCalendarConnection(
  connectionId: string,
  options: SyncOptions = {}
): Promise<SyncResult> {
  const connection = await prisma.externalCalendarConnection.findUnique({
    where: { id: connectionId },
    include: {
      inventoryGroup: true,
      listingOption: true,
    },
  });

  if (!connection) {
    throw new Error(`Calendar connection not found: ${connectionId}`);
  }

  if (!connection.isActive) {
    return {
      success: true,
      connectionId,
      connectionName: connection.connectionName,
      eventsProcessed: 0,
      eventsCreated: 0,
      eventsUpdated: 0,
      eventsCancelled: 0,
      conflictsDetected: 0,
      skipped: true,
      errorMessage: "Connection is inactive",
    };
  }

  if (!connection.importUrl) {
    const errorMsg = "No import URL configured for calendar connection";
    await prisma.externalCalendarConnection.update({
      where: { id: connection.id },
      data: {
        lastSyncedAt: new Date(),
        lastSyncStatus: "FAILED",
        lastSyncError: errorMsg,
      },
    });
    return {
      success: false,
      connectionId,
      connectionName: connection.connectionName,
      eventsProcessed: 0,
      eventsCreated: 0,
      eventsUpdated: 0,
      eventsCancelled: 0,
      conflictsDetected: 0,
      errorMessage: errorMsg,
    };
  }

  // 1. Initialize Sync Log
  const syncLog = await prisma.calendarSyncLog.create({
    data: {
      connectionId: connection.id,
      syncType: "IMPORT",
      status: "IN_PROGRESS",
      startedAt: new Date(),
    },
  });

  // 2. Fetch and parse external calendar
  let parsedEvents: ParsedCalendarEvent[];
  try {
    parsedEvents = await fetchAndParseICal(connection.importUrl, {
      allowLocalForTesting: options.allowLocalForTesting,
      timeoutMs: options.timeoutMs,
      maxBytes: options.maxBytes,
    });
  } catch (fetchErr: unknown) {
    const fetchMsg = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
    const errorMsg = `Calendar fetch/parse failed: ${fetchMsg}`;

    // Update connection status and error
    await prisma.externalCalendarConnection.update({
      where: { id: connection.id },
      data: {
        lastSyncedAt: new Date(),
        lastSyncStatus: "FAILED",
        lastSyncError: errorMsg,
      },
    });

    // Update sync log
    await prisma.calendarSyncLog.update({
      where: { id: syncLog.id },
      data: {
        status: "FAILED",
        errorMessage: errorMsg,
        completedAt: new Date(),
      },
    });

    return {
      success: false,
      connectionId,
      connectionName: connection.connectionName,
      eventsProcessed: 0,
      eventsCreated: 0,
      eventsUpdated: 0,
      eventsCancelled: 0,
      conflictsDetected: 0,
      errorMessage: errorMsg,
    };
  }

  // 3. Process events inside an atomic transaction with row locking
  const result = await prisma.$transaction(
    async (tx) => {
      // Lock the inventory group row to guarantee serial access
      await tx.$executeRaw`
        SELECT id FROM inventory_groups 
        WHERE id = ${connection.inventoryGroupId} 
        FOR UPDATE
      `;

      // Fetch all existing events for this connection
      const existingEvents = await tx.externalCalendarEvent.findMany({
        where: { connectionId: connection.id },
      });

      const existingEventMap = new Map(existingEvents.map((e) => [e.externalUid, e]));
      const feedUids = new Set<string>();

      let eventsProcessed = 0;
      let eventsCreated = 0;
      let eventsUpdated = 0;
      let eventsCancelled = 0;
      let conflictsDetected = 0;

      for (const event of parsedEvents) {
        eventsProcessed++;
        feedUids.add(event.externalUid);

        // Check for conflicting confirmed website reservations
        const conflictingBookings = await tx.booking.findMany({
          where: {
            inventoryGroupId: connection.inventoryGroupId,
            status: { in: [BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN] },
            checkInDate: { lt: event.endDate },
            checkOutDate: { gt: event.startDate },
          },
        });

        const hasConflict = conflictingBookings.length > 0;
        if (hasConflict) {
          conflictsDetected++;
          // Record audit log for conflict awareness
          await tx.auditLog.create({
            data: {
              action: "CALENDAR_SYNC_CONFLICT_DETECTED",
              entityType: "ExternalCalendarEvent",
              entityId: event.externalUid,
              metadata: {
                connectionId: connection.id,
                platform: connection.platform,
                eventUid: event.externalUid,
                summary: event.summary,
                eventDates: {
                  start: event.startDate.toISOString(),
                  end: event.endDate.toISOString(),
                },
                conflictingBookings: conflictingBookings.map((b) => ({
                  id: b.id,
                  bookingReference: b.bookingReference,
                  customerName: b.customerName,
                  checkInDate: b.checkInDate.toISOString(),
                  checkOutDate: b.checkOutDate.toISOString(),
                })),
              },
            },
          });
        }

        const existingEvent = existingEventMap.get(event.externalUid);

        // Scenario A: Event is CANCELLED in feed
        if (event.status === "CANCELLED") {
          if (existingEvent && existingEvent.status !== "CANCELLED") {
            await tx.externalCalendarEvent.update({
              where: { id: existingEvent.id },
              data: {
                status: "CANCELLED",
                externalLastModified: event.externalLastModified,
              },
            });

            // Remove associated availability block
            await tx.availabilityBlock.deleteMany({
              where: { externalCalendarEventId: existingEvent.id },
            });

            eventsCancelled++;
          }
          continue;
        }

        // Scenario B: Existing Event
        if (existingEvent) {
          const datesChanged =
            existingEvent.startDate.getTime() !== event.startDate.getTime() ||
            existingEvent.endDate.getTime() !== event.endDate.getTime();

          const statusChanged = existingEvent.status !== "CONFIRMED";
          const summaryChanged = existingEvent.summary !== event.summary;

          if (datesChanged || statusChanged || summaryChanged) {
            // Update event record
            await tx.externalCalendarEvent.update({
              where: { id: existingEvent.id },
              data: {
                startDate: event.startDate,
                endDate: event.endDate,
                summary: event.summary,
                status: "CONFIRMED",
                externalLastModified: event.externalLastModified,
                rawMetadata: {
                  ...(event.rawMetadata || {}),
                  hasConflict,
                },
              },
            });

            // Update availability block: remove old and create fresh for new dates
            await tx.availabilityBlock.deleteMany({
              where: { externalCalendarEventId: existingEvent.id },
            });

            await tx.availabilityBlock.create({
              data: {
                inventoryGroupId: connection.inventoryGroupId,
                externalCalendarEventId: existingEvent.id,
                externalCalendarConnectionId: connection.id,
                startDate: event.startDate,
                endDate: event.endDate,
                reason: BlockReason.EXTERNAL_CALENDAR,
                notes: `External Calendar (${connection.platform}): ${event.summary}${
                  hasConflict ? " [CONFLICT WITH DIRECT BOOKING]" : ""
                }`,
              },
            });

            eventsUpdated++;
          }
        } else {
          // Scenario C: New Event
          const newEvent = await tx.externalCalendarEvent.create({
            data: {
              connectionId: connection.id,
              externalUid: event.externalUid,
              summary: event.summary,
              startDate: event.startDate,
              endDate: event.endDate,
              status: "CONFIRMED",
              externalLastModified: event.externalLastModified,
              rawMetadata: {
                ...(event.rawMetadata || {}),
                hasConflict,
              },
            },
          });

          await tx.availabilityBlock.create({
            data: {
              inventoryGroupId: connection.inventoryGroupId,
              externalCalendarEventId: newEvent.id,
              externalCalendarConnectionId: connection.id,
              startDate: event.startDate,
              endDate: event.endDate,
              reason: BlockReason.EXTERNAL_CALENDAR,
              notes: `External Calendar (${connection.platform}): ${event.summary}${
                hasConflict ? " [CONFLICT WITH DIRECT BOOKING]" : ""
              }`,
            },
          });

          eventsCreated++;
        }
      }

      // Scenario D: Events removed from feed (implicit cancellation)
      for (const existingEvent of existingEvents) {
        if (!feedUids.has(existingEvent.externalUid) && existingEvent.status === "CONFIRMED") {
          await tx.externalCalendarEvent.update({
            where: { id: existingEvent.id },
            data: { status: "CANCELLED" },
          });

          await tx.availabilityBlock.deleteMany({
            where: { externalCalendarEventId: existingEvent.id },
          });

          eventsCancelled++;
        }
      }

      // Update connection sync state
      const nextSyncAt = new Date(Date.now() + connection.syncIntervalMinutes * 60 * 1000);
      const lastSyncStatus = conflictsDetected > 0 ? "WARNING" : "SUCCESS";
      const lastSyncError =
        conflictsDetected > 0
          ? `${conflictsDetected} conflict(s) detected with existing confirmed website booking(s)`
          : null;

      await tx.externalCalendarConnection.update({
        where: { id: connection.id },
        data: {
          lastSyncedAt: new Date(),
          nextSyncAt,
          lastSyncStatus,
          lastSyncError,
        },
      });

      // Update sync log entry
      await tx.calendarSyncLog.update({
        where: { id: syncLog.id },
        data: {
          status: lastSyncStatus,
          eventsProcessed,
          eventsCreated,
          eventsUpdated,
          eventsCancelled,
          conflictsDetected,
          errorMessage: lastSyncError,
          completedAt: new Date(),
        },
      });

      return {
        eventsProcessed,
        eventsCreated,
        eventsUpdated,
        eventsCancelled,
        conflictsDetected,
        lastSyncStatus,
        lastSyncError,
      };
    },
    { timeout: 30000 }
  );

  return {
    success: true,
    connectionId,
    connectionName: connection.connectionName,
    eventsProcessed: result.eventsProcessed,
    eventsCreated: result.eventsCreated,
    eventsUpdated: result.eventsUpdated,
    eventsCancelled: result.eventsCancelled,
    conflictsDetected: result.conflictsDetected,
    errorMessage: result.lastSyncError || undefined,
  };
}

/**
 * Syncs all active external calendar connections across properties.
 */
export async function syncAllActiveConnections(options: SyncOptions = {}): Promise<SyncResult[]> {
  const activeConnections = await prisma.externalCalendarConnection.findMany({
    where: { isActive: true },
    select: { id: true, connectionName: true },
  });

  const results: SyncResult[] = [];
  for (const conn of activeConnections) {
    try {
      const res = await syncCalendarConnection(conn.id, options);
      results.push(res);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      results.push({
        success: false,
        connectionId: conn.id,
        connectionName: conn.connectionName,
        eventsProcessed: 0,
        eventsCreated: 0,
        eventsUpdated: 0,
        eventsCancelled: 0,
        conflictsDetected: 0,
        errorMessage: message,
      });
    }
  }

  return results;
}
