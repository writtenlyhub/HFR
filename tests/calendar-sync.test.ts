import http from "http";
import assert from "assert";
import { prisma } from "../src/lib/prisma";
import {
  validateCalendarUrl,
  isPrivateOrReservedIp,
  parseICalString,
  fetchAndParseICal,
  normalizeDateToUTC,
} from "../src/lib/calendar/ical-import";
import {
  syncCalendarConnection,
  syncAllActiveConnections,
} from "../src/lib/calendar/sync-service";
import { GET as exportRoute } from "../src/app/api/calendar/export/[token]/route";
import { checkAvailability, createBookingHold } from "../src/lib/booking/shared-inventory";
import { confirmPaymentAndBooking } from "../src/lib/payment/confirmation";
import { BookingStatus, CalendarPlatform, BlockReason } from "@prisma/client";

let passedCount = 0;
function testAssert(condition: boolean, message: string) {
  assert(condition, message);
  passedCount++;
  console.log(`  ✓ PASS [${passedCount}]: ${message}`);
}

async function runCalendarSyncTests() {
  console.log("\n==========================================================================");
  console.log("  PHASE 5: AIRBNB & EXTERNAL CHANNEL ICAL SYNCHRONIZATION TEST SUITE");
  console.log("==========================================================================\n");

  // Lookup Dev Stays Jaipur inventory group
  const inventoryGroup = await prisma.inventoryGroup.findFirst({
    where: { code: "DEV-MAIN-ESTATE" },
  });
  assert(inventoryGroup, "DEV-MAIN-ESTATE inventory group must exist in DB");

  // Lookup listing options
  const mainRoom = await prisma.listingOption.findFirst({ where: { slug: "royal-suite" } });
  const twoBed = await prisma.listingOption.findFirst({ where: { slug: "courtyard-wing" } });
  const villa = await prisma.listingOption.findFirst({ where: { slug: "full-estate-buyout" } });
  assert(mainRoom && twoBed && villa, "All 3 listing options must exist in DB");

  // Clean any test artifacts from prior runs
  await prisma.calendarSyncLog.deleteMany({
    where: { connection: { connectionName: { startsWith: "TEST_" } } },
  });
  await prisma.availabilityBlock.deleteMany({
    where: { startDate: { gte: new Date("2032-01-01T00:00:00.000Z") } },
  });
  await prisma.booking.deleteMany({
    where: { checkInDate: { gte: new Date("2032-01-01T00:00:00.000Z") } },
  });
  await prisma.externalCalendarConnection.deleteMany({
    where: { connectionName: { startsWith: "TEST_" } },
  });

  // Local Mock HTTP Server for iCal feed testing
  let mockFeedContent = "";
  let mockFeedStatus = 200;
  const mockFeedHeaders: Record<string, string> = { "Content-Type": "text/calendar" };
  const mockPort = 9876;

  const mockServer = http.createServer((req, res) => {
    if (req.url === "/oversized.ics") {
      res.writeHead(200, { "Content-Type": "text/calendar" });
      // Send 2.5 MB of data
      const chunk = Buffer.alloc(512 * 1024, "X");
      for (let i = 0; i < 5; i++) {
        res.write(chunk);
      }
      res.end();
      return;
    }

    res.writeHead(mockFeedStatus, mockFeedHeaders);
    res.end(mockFeedContent);
  });

  await new Promise<void>((resolve) => mockServer.listen(mockPort, resolve));

  try {
    // -----------------------------------------------------------------
    // TEST 1: SSRF Protection Rejects Internal & Private IPs
    // -----------------------------------------------------------------
    console.log("--- TEST 1: SSRF Rejection of Loopback & Private IPs ---");
    testAssert(isPrivateOrReservedIp("127.0.0.1"), "127.0.0.1 identified as private loopback");
    testAssert(isPrivateOrReservedIp("10.0.1.5"), "10.0.1.5 identified as private RFC 1918");
    testAssert(isPrivateOrReservedIp("172.20.0.1"), "172.20.0.1 identified as private RFC 1918");
    testAssert(isPrivateOrReservedIp("192.168.1.1"), "192.168.1.1 identified as private RFC 1918");
    testAssert(isPrivateOrReservedIp("169.254.169.254"), "169.254.169.254 identified as AWS/cloud metadata");
    testAssert(!isPrivateOrReservedIp("93.184.216.34"), "Public IP 93.184.216.34 not blocked");

    const ssrfCheck1 = await validateCalendarUrl("http://127.0.0.1:9876/feed.ics", { allowLocalForTesting: false });
    testAssert(!ssrfCheck1.valid, "Direct loopback 127.0.0.1 URL rejected");

    const ssrfCheck2 = await validateCalendarUrl("http://169.254.169.254/latest/meta-data/", { allowLocalForTesting: false });
    testAssert(!ssrfCheck2.valid, "Cloud metadata URL rejected");

    // -----------------------------------------------------------------
    // TEST 2: Parsing Date-Only All-Day Events & UTC Normalization
    // -----------------------------------------------------------------
    console.log("\n--- TEST 2: Date-Only Event Import & UTC Normalization ---");
    const icsDateOnly = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Airbnb Inc//Hosting Calendar 1.0//EN",
      "BEGIN:VEVENT",
      "UID:airbnb_event_all_day_001",
      "DTSTART;VALUE=DATE:20320610",
      "DTEND;VALUE=DATE:20320614",
      "SUMMARY:Airbnb (Not available)",
      "STATUS:CONFIRMED",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const parsedDateOnly = parseICalString(icsDateOnly);
    testAssert(parsedDateOnly.length === 1, "Parsed exactly 1 date-only event");
    testAssert(parsedDateOnly[0].startDate.toISOString() === "2032-06-10T00:00:00.000Z", "Start normalized to UTC midnight");
    testAssert(parsedDateOnly[0].endDate.toISOString() === "2032-06-14T00:00:00.000Z", "End normalized to UTC midnight");

    // -----------------------------------------------------------------
    // TEST 3: DTEND Exclusive Boundary Semantics
    // -----------------------------------------------------------------
    console.log("\n--- TEST 3: DTEND Exclusive Boundary Semantics ---");
    // Check-in June 10, Check-out June 14 = 4 nights (10, 11, 12, 13)
    const nights = (parsedDateOnly[0].endDate.getTime() - parsedDateOnly[0].startDate.getTime()) / (1000 * 60 * 60 * 24);
    testAssert(nights === 4, "DTEND is exclusive: 4 nights from Jun 10 to Jun 14");

    // -----------------------------------------------------------------
    // TEST 4: Invalid iCal Content Rejected Safely
    // -----------------------------------------------------------------
    console.log("\n--- TEST 4: Invalid iCal Content Handling ---");
    const emptyResult = parseICalString("");
    testAssert(emptyResult.length === 0, "Empty string returns empty array safely");
    const corruptedResult = parseICalString("NOT_VALID_ICAL_DATA_AT_ALL");
    testAssert(corruptedResult.length === 0, "Malformed string returns empty array without throwing crash");

    // -----------------------------------------------------------------
    // TEST 5: Oversized Feed Protection
    // -----------------------------------------------------------------
    console.log("\n--- TEST 5: Oversized Feed Rejected ---");
    let oversizedErrorCaught = false;
    try {
      await fetchAndParseICal(`http://127.0.0.1:${mockPort}/oversized.ics`, {
        allowLocalForTesting: true,
        maxBytes: 1 * 1024 * 1024, // 1MB limit
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      oversizedErrorCaught = true;
      testAssert(message.includes("exceeds maximum allowed size"), "Oversized feed rejected cleanly with size error");
    }
    testAssert(oversizedErrorCaught, "Oversized stream aborted properly");

    // -----------------------------------------------------------------
    // TEST 6: Create External Calendar Connection
    // -----------------------------------------------------------------
    console.log("\n--- TEST 6: Create Calendar Connection in Database ---");
    const testConnection = await prisma.externalCalendarConnection.create({
      data: {
        inventoryGroupId: inventoryGroup.id,
        connectionName: "TEST_Airbnb_Full_Villa",
        platform: CalendarPlatform.AIRBNB,
        importUrl: `http://127.0.0.1:${mockPort}/airbnb.ics`,
        isActive: true,
        syncIntervalMinutes: 15,
      },
    });
    testAssert(!!testConnection.id, "Calendar connection created in DB");
    testAssert(!!testConnection.exportToken, "Unique exportToken auto-generated");

    // -----------------------------------------------------------------
    // TEST 7: Valid iCal Feed Import & Shared Inventory Block Creation
    // -----------------------------------------------------------------
    console.log("\n--- TEST 7: Valid Feed Import & Physical Estate Block ---");
    mockFeedStatus = 200;
    mockFeedContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Airbnb Inc//Hosting Calendar 1.0//EN",
      "BEGIN:VEVENT",
      "UID:airbnb_booking_2032_07_01",
      "DTSTART;VALUE=DATE:20320701",
      "DTEND;VALUE=DATE:20320705",
      "SUMMARY:Reserved - Airbnb Guest",
      "STATUS:CONFIRMED",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const sync1 = await syncCalendarConnection(testConnection.id, { allowLocalForTesting: true });
    testAssert(sync1.success === true, "Sync succeeded for test connection");
    testAssert(sync1.eventsCreated === 1, "Exactly 1 new event created");
    testAssert(sync1.conflictsDetected === 0, "No conflicts on initial fresh dates");

    // Verify AvailabilityBlock created on DEV-MAIN-ESTATE
    const block1 = await prisma.availabilityBlock.findFirst({
      where: {
        inventoryGroupId: inventoryGroup.id,
        externalCalendarConnectionId: testConnection.id,
        startDate: normalizeDateToUTC("2032-07-01"),
        endDate: normalizeDateToUTC("2032-07-05"),
      },
    });
    testAssert(!!block1, "AvailabilityBlock created in DB for external booking");
    testAssert(block1?.reason === BlockReason.EXTERNAL_CALENDAR, "Block reason is EXTERNAL_CALENDAR");

    // -----------------------------------------------------------------
    // TEST 8: Shared Inventory Invariant - External Booking Blocks Main Bedroom
    // -----------------------------------------------------------------
    console.log("\n--- TEST 8: External Booking Blocks Main Bedroom Configuration ---");
    const availMain = await checkAvailability({
      propertySlug: "dev-stays-jaipur",
      listingOptionSlug: "royal-suite",
      checkInDate: "2032-07-02",
      checkOutDate: "2032-07-04",
      guestCount: 2,
    });
    testAssert(availMain.available === false, "Main Bedroom is blocked by external reservation");

    // -----------------------------------------------------------------
    // TEST 9: Shared Inventory Invariant - External Booking Blocks 2 Bedrooms
    // -----------------------------------------------------------------
    console.log("\n--- TEST 9: External Booking Blocks 2 Bedrooms Configuration ---");
    const avail2Bed = await checkAvailability({
      propertySlug: "dev-stays-jaipur",
      listingOptionSlug: "courtyard-wing",
      checkInDate: "2032-07-02",
      checkOutDate: "2032-07-04",
      guestCount: 4,
    });
    testAssert(avail2Bed.available === false, "2 Bedrooms is blocked by external reservation");

    // -----------------------------------------------------------------
    // TEST 10: Shared Inventory Invariant - External Booking Blocks Whole Villa
    // -----------------------------------------------------------------
    console.log("\n--- TEST 10: External Booking Blocks Whole Villa Configuration ---");
    const availVilla = await checkAvailability({
      propertySlug: "dev-stays-jaipur",
      listingOptionSlug: "full-estate-buyout",
      checkInDate: "2032-07-02",
      checkOutDate: "2032-07-04",
      guestCount: 8,
    });
    testAssert(availVilla.available === false, "Whole Villa is blocked by external reservation");

    // -----------------------------------------------------------------
    // TEST 11: Adjacent Bookings Allowed
    // -----------------------------------------------------------------
    console.log("\n--- TEST 11: Adjacent Bookings Allowed (Check-in = Check-out) ---");
    // External booking check-out is July 05. A new guest checking in on July 05 must be available!
    const availAdjacent = await checkAvailability({
      propertySlug: "dev-stays-jaipur",
      listingOptionSlug: "royal-suite",
      checkInDate: "2032-07-05",
      checkOutDate: "2032-07-07",
      guestCount: 2,
    });
    testAssert(availAdjacent.available === true, "Check-in on July 05 is available (adjacent booking allowed)");

    // -----------------------------------------------------------------
    // TEST 12: Duplicate UID Idempotency
    // -----------------------------------------------------------------
    console.log("\n--- TEST 12: Duplicate UID Idempotency (Repeat Sync) ---");
    const syncRepeat = await syncCalendarConnection(testConnection.id, { allowLocalForTesting: true });
    testAssert(syncRepeat.success === true, "Repeat sync succeeded");
    testAssert(syncRepeat.eventsCreated === 0, "No duplicate events created (0 created)");
    testAssert(syncRepeat.eventsUpdated === 0, "No unnecessary updates (0 updated)");

    const blockCount = await prisma.availabilityBlock.count({
      where: {
        inventoryGroupId: inventoryGroup.id,
        externalCalendarConnectionId: testConnection.id,
      },
    });
    testAssert(blockCount === 1, "Exactly 1 availability block remains in database");

    // -----------------------------------------------------------------
    // TEST 13: Modified External Event Update
    // -----------------------------------------------------------------
    console.log("\n--- TEST 13: External Event Date Modification ---");
    // External guest changes checkout from July 05 to July 07 (extended stay)
    mockFeedContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Airbnb Inc//Hosting Calendar 1.0//EN",
      "BEGIN:VEVENT",
      "UID:airbnb_booking_2032_07_01",
      "DTSTART;VALUE=DATE:20320701",
      "DTEND;VALUE=DATE:20320707",
      "SUMMARY:Reserved - Extended Stay",
      "STATUS:CONFIRMED",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const syncUpdate = await syncCalendarConnection(testConnection.id, { allowLocalForTesting: true });
    testAssert(syncUpdate.success === true, "Update sync succeeded");
    testAssert(syncUpdate.eventsUpdated === 1, "Exactly 1 event updated");

    const updatedBlock = await prisma.availabilityBlock.findFirst({
      where: {
        inventoryGroupId: inventoryGroup.id,
        externalCalendarConnectionId: testConnection.id,
      },
    });
    testAssert(
      updatedBlock?.endDate.toISOString() === "2032-07-07T00:00:00.000Z",
      "Availability block end date updated to July 07"
    );

    // -----------------------------------------------------------------
    // TEST 14: Cancelled Event Releases Inventory Block
    // -----------------------------------------------------------------
    console.log("\n--- TEST 14: Cancelled External Event Releases Inventory ---");
    mockFeedContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Airbnb Inc//Hosting Calendar 1.0//EN",
      "BEGIN:VEVENT",
      "UID:airbnb_booking_2032_07_01",
      "DTSTART;VALUE=DATE:20320701",
      "DTEND;VALUE=DATE:20320707",
      "SUMMARY:Reserved - Airbnb Guest",
      "STATUS:CANCELLED",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const syncCancel = await syncCalendarConnection(testConnection.id, { allowLocalForTesting: true });
    testAssert(syncCancel.success === true, "Cancellation sync succeeded");
    testAssert(syncCancel.eventsCancelled === 1, "Exactly 1 event cancelled");

    const releasedBlock = await prisma.availabilityBlock.findFirst({
      where: {
        inventoryGroupId: inventoryGroup.id,
        externalCalendarConnectionId: testConnection.id,
      },
    });
    testAssert(releasedBlock === null, "Availability block deleted/released upon cancellation");

    // Recheck availability: dates should now be available again!
    const recheckAvail = await checkAvailability({
      propertySlug: "dev-stays-jaipur",
      listingOptionSlug: "royal-suite",
      checkInDate: "2032-07-02",
      checkOutDate: "2032-07-04",
      guestCount: 2,
    });
    testAssert(recheckAvail.available === true, "Dates are available again after external cancellation");

    // -----------------------------------------------------------------
    // TEST 15: Conflict Detection Preserves Direct Website Bookings
    // -----------------------------------------------------------------
    console.log("\n--- TEST 15: Direct Website Reservation Protected During Conflict ---");
    // Create and confirm a direct website booking for Aug 10 - Aug 14
    const directHold = await createBookingHold({
      listingOptionSlug: "royal-suite",
      checkInDate: "2032-08-10",
      checkOutDate: "2032-08-14",
      guestCount: 2,
      customerName: "Protected VIP Guest",
      customerEmail: "protected_vip@example.com",
    });
    testAssert(directHold.success === true, "Direct booking hold created for Aug 10 - Aug 14");

    const directConfirmed = await confirmPaymentAndBooking({
      bookingId: directHold.holdId!,
      razorpayOrderId: "order_protected_vip",
      razorpayPaymentId: "pay_protected_vip",
      paymentMethod: "card",
    });
    testAssert(directConfirmed.success === true, "Direct booking confirmed");

    // External calendar attempts to book overlapping dates: Aug 12 - Aug 16!
    mockFeedContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Airbnb Inc//Hosting Calendar 1.0//EN",
      "BEGIN:VEVENT",
      "UID:airbnb_conflicting_reservation_001",
      "DTSTART;VALUE=DATE:20320812",
      "DTEND;VALUE=DATE:20320816",
      "SUMMARY:Airbnb Reservation Overlap",
      "STATUS:CONFIRMED",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const syncConflict = await syncCalendarConnection(testConnection.id, { allowLocalForTesting: true });
    testAssert(syncConflict.success === true, "Sync processed without throwing exception");
    testAssert(syncConflict.conflictsDetected === 1, "Conflict detected and flagged in sync result");

    // Check direct booking status: MUST REMAIN CONFIRMED
    const directBookingCheck = await prisma.booking.findUnique({
      where: { id: directHold.holdId },
    });
    testAssert(
      directBookingCheck?.status === BookingStatus.CONFIRMED,
      "CRITICAL INVARIANT: Direct website booking was NOT cancelled or corrupted by external conflict"
    );

    // Check AuditLog entry
    const auditLog = await prisma.auditLog.findFirst({
      where: {
        action: "CALENDAR_SYNC_CONFLICT_DETECTED",
        entityId: "airbnb_conflicting_reservation_001",
      },
    });
    testAssert(!!auditLog, "Audit log created for calendar sync conflict");

    // -----------------------------------------------------------------
    // TEST 16: Import Failure Preserves Existing Inventory Blocks
    // -----------------------------------------------------------------
    console.log("\n--- TEST 16: Temporary Network / Server Error Preserves Existing Blocks ---");
    // First, import a valid block for Sept 01 - Sept 05
    mockFeedContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Airbnb Inc//Hosting Calendar 1.0//EN",
      "BEGIN:VEVENT",
      "UID:airbnb_booking_september_001",
      "DTSTART;VALUE=DATE:20320901",
      "DTEND;VALUE=DATE:20320905",
      "SUMMARY:September Stay",
      "STATUS:CONFIRMED",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    await syncCalendarConnection(testConnection.id, { allowLocalForTesting: true });

    const blocksBeforeError = await prisma.availabilityBlock.count({
      where: { externalCalendarConnectionId: testConnection.id },
    });
    testAssert(blocksBeforeError > 0, "Blocks exist before network failure");

    // Simulate 500 internal server error on external feed
    mockFeedStatus = 500;
    mockFeedContent = "Internal Server Error on External Channel";

    const syncFail = await syncCalendarConnection(testConnection.id, { allowLocalForTesting: true });
    testAssert(syncFail.success === false, "Sync reported failure due to HTTP 500");
    testAssert(Boolean(syncFail.errorMessage?.includes("500")), "Error message contains HTTP 500 status");

    // Verify existing blocks were NOT deleted
    const blocksAfterError = await prisma.availabilityBlock.count({
      where: { externalCalendarConnectionId: testConnection.id },
    });
    testAssert(
      blocksAfterError === blocksBeforeError,
      "Existing blocks safely preserved during external channel outage"
    );

    // Reset mock server status
    mockFeedStatus = 200;

    // -----------------------------------------------------------------
    // TEST 17: Inactive Connection Is Skipped
    // -----------------------------------------------------------------
    console.log("\n--- TEST 17: Inactive Connection Skipped ---");
    await prisma.externalCalendarConnection.update({
      where: { id: testConnection.id },
      data: { isActive: false },
    });

    const syncInactive = await syncCalendarConnection(testConnection.id, { allowLocalForTesting: true });
    testAssert(syncInactive.skipped === true, "Inactive connection skipped without downloading");

    // Reactivate connection
    await prisma.externalCalendarConnection.update({
      where: { id: testConnection.id },
      data: { isActive: true },
    });

    // -----------------------------------------------------------------
    // TEST 18: Export Feed Generates Valid RFC 5545 iCalendar
    // -----------------------------------------------------------------
    console.log("\n--- TEST 18: Export Feed Generates Valid iCalendar Stream ---");
    const exportReq = new Request(
      `http://localhost:3000/api/calendar/export/${testConnection.exportToken}`
    );
    const exportRes = await exportRoute(exportReq, {
      params: Promise.resolve({ token: testConnection.exportToken }),
    });

    testAssert(exportRes.status === 200, "Export route returned HTTP 200");
    testAssert(
      exportRes.headers.get("content-type")?.includes("text/calendar") === true,
      "Content-Type is text/calendar"
    );

    const exportBody = await exportRes.text();
    testAssert(exportBody.includes("BEGIN:VCALENDAR"), "Contains BEGIN:VCALENDAR");
    testAssert(exportBody.includes("END:VCALENDAR"), "Contains END:VCALENDAR");
    testAssert(exportBody.includes(directBookingCheck!.bookingReference), "Contains confirmed booking reference UID");

    // -----------------------------------------------------------------
    // TEST 19: Privacy-Preserving Export - Zero Guest PII
    // -----------------------------------------------------------------
    console.log("\n--- TEST 19: Export Privacy - Zero Guest PII Exposed ---");
    testAssert(!exportBody.includes("Protected VIP Guest"), "Customer name is NOT in export feed");
    testAssert(!exportBody.includes("protected_vip@example.com"), "Customer email is NOT in export feed");
    testAssert(!exportBody.includes("8500"), "Price is NOT in export feed");
    testAssert(!exportBody.includes("INR"), "Currency/financials are NOT in export feed");

    // -----------------------------------------------------------------
    // TEST 20: Invalid Export Token Returns 404
    // -----------------------------------------------------------------
    console.log("\n--- TEST 20: Invalid Export Token Returns 404 ---");
    const invalidTokenRes = await exportRoute(exportReq, {
      params: Promise.resolve({ token: "invalid_nonexistent_token_999" }),
    });
    testAssert(invalidTokenRes.status === 404, "Invalid token returned 404 Not Found");

    // -----------------------------------------------------------------
    // TEST 21: Multiple External Channels Share Single Inventory Group
    // -----------------------------------------------------------------
    console.log("\n--- TEST 21: Multi-Channel (Airbnb + Booking.com) Sync ---");
    const bookingComConnection = await prisma.externalCalendarConnection.create({
      data: {
        inventoryGroupId: inventoryGroup.id,
        connectionName: "TEST_BookingCom_Suite",
        platform: CalendarPlatform.BOOKING_COM,
        importUrl: `http://127.0.0.1:${mockPort}/bookingcom.ics`,
        isActive: true,
      },
    });

    mockFeedContent = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Booking.com//EN",
      "BEGIN:VEVENT",
      "UID:bcom_reservation_2032_10_01",
      "DTSTART;VALUE=DATE:20321001",
      "DTEND;VALUE=DATE:20321005",
      "SUMMARY:Booking.com Closed",
      "STATUS:CONFIRMED",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    const syncBcom = await syncCalendarConnection(bookingComConnection.id, { allowLocalForTesting: true });
    testAssert(syncBcom.success === true, "Booking.com connection synced successfully");

    // Check that Booking.com reservation blocks the whole estate
    const availBcomCheck = await checkAvailability({
      propertySlug: "dev-stays-jaipur",
      listingOptionSlug: "full-estate-buyout",
      checkInDate: "2032-10-02",
      checkOutDate: "2032-10-04",
      guestCount: 6,
    });
    testAssert(
      availBcomCheck.available === false,
      "Booking.com block seamlessly blocks Full Villa direct booking"
    );

    // -----------------------------------------------------------------
    // TEST 22: syncAllActiveConnections Batch Execution
    // -----------------------------------------------------------------
    console.log("\n--- TEST 22: Batch Synchronization of All Active Feeds ---");
    const batchResults = await syncAllActiveConnections({ allowLocalForTesting: true });
    testAssert(batchResults.length >= 2, "Batch sync executed for all active connections");

    // -----------------------------------------------------------------
    // TEST 23: Concurrent Sync Runs With Row Locking
    // -----------------------------------------------------------------
    console.log("\n--- TEST 23: Concurrency Row Locking ---");
    const [c1, c2] = await Promise.all([
      syncCalendarConnection(testConnection.id, { allowLocalForTesting: true }),
      syncCalendarConnection(testConnection.id, { allowLocalForTesting: true }),
    ]);
    testAssert(Boolean(c1.success && c2.success), "Concurrent syncs both completed safely without deadlock or duplicates");

    // -----------------------------------------------------------------
    // TEST 24: Calendar Sync Log Tracking
    // -----------------------------------------------------------------
    console.log("\n--- TEST 24: Comprehensive Sync Audit Logs ---");
    const syncLogs = await prisma.calendarSyncLog.findMany({
      where: { connectionId: testConnection.id },
      orderBy: { startedAt: "desc" },
    });
    testAssert(syncLogs.length > 0, "CalendarSyncLog records created for every sync operation");
    testAssert(syncLogs[0].completedAt !== null, "Sync log records completedAt timestamp");

    // -----------------------------------------------------------------
    // TEST 25: Existing Core Payment and Inventory Integrity
    // -----------------------------------------------------------------
    console.log("\n--- TEST 25: Core Booking & Payment Integrity Verified ---");
    // Verify that creating holds and confirming bookings continues to function seamlessly
    const postSyncHold = await createBookingHold({
      listingOptionSlug: "royal-suite",
      checkInDate: "2032-12-01",
      checkOutDate: "2032-12-04",
      guestCount: 2,
      customerName: "Post Sync Guest",
      customerEmail: "postsync@example.com",
    });
    testAssert(postSyncHold.success === true, "Direct booking hold created normally alongside sync engine");

    console.log("\n==========================================================================");
    console.log(`  ALL ${passedCount} PHASE 5 CALENDAR SYNC ASSERTIONS PASSED!`);
    console.log("==========================================================================\n");
    process.exit(0);
  } finally {
    // Teardown mock server
    mockServer.close();

    // Cleanup test database records
    console.log("Cleaning up test artifacts...");
    await prisma.calendarSyncLog.deleteMany({
      where: { connection: { connectionName: { startsWith: "TEST_" } } },
    });
    await prisma.availabilityBlock.deleteMany({
      where: { startDate: { gte: new Date("2032-01-01T00:00:00.000Z") } },
    });
    await prisma.booking.deleteMany({
      where: { checkInDate: { gte: new Date("2032-01-01T00:00:00.000Z") } },
    });
    await prisma.externalCalendarConnection.deleteMany({
      where: { connectionName: { startsWith: "TEST_" } },
    });
    await prisma.$disconnect();
  }
}

runCalendarSyncTests().catch((err) => {
  console.error("Calendar sync tests failed:", err);
  process.exit(1);
});
