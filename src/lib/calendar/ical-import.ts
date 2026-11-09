import dns from "dns";
import * as nodeIcal from "node-ical";

export interface ParsedCalendarEvent {
  externalUid: string;
  summary: string;
  startDate: Date;
  endDate: Date;
  status: "CONFIRMED" | "CANCELLED";
  externalLastModified?: Date;
  rawMetadata?: Record<string, unknown>;
}

export interface UrlValidationResult {
  valid: boolean;
  reason?: string;
  resolvedIp?: string;
}

export interface FetchICalOptions {
  timeoutMs?: number;
  maxBytes?: number;
  allowHttp?: boolean;
  allowLocalForTesting?: boolean;
}

const DEFAULT_TIMEOUT_MS = 10000;
const DEFAULT_MAX_BYTES = 2 * 1024 * 1024; // 2 MB

/**
 * Checks whether an IPv4 or IPv6 address belongs to private, loopback, link-local,
 * or cloud metadata IP ranges to prevent SSRF vulnerabilities.
 */
export function isPrivateOrReservedIp(ip: string): boolean {
  // Handle IPv4-mapped IPv6 addresses (e.g. ::ffff:127.0.0.1)
  let cleanIp = ip.toLowerCase();
  if (cleanIp.startsWith("::ffff:")) {
    cleanIp = cleanIp.slice(7);
  }

  // IPv6 loopback / local / unique local
  if (cleanIp === "::1" || cleanIp === "::" || cleanIp.startsWith("fe80:") || cleanIp.startsWith("fc") || cleanIp.startsWith("fd")) {
    return true;
  }

  // IPv4 validation
  const ipv4Match = cleanIp.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!ipv4Match) {
    return false;
  }

  const [, o1Str, o2Str, o3Str, o4Str] = ipv4Match;
  const o1 = parseInt(o1Str, 10);
  const o2 = parseInt(o2Str, 10);
  const o3 = parseInt(o3Str, 10);
  const o4 = parseInt(o4Str, 10);

  if (o1 > 255 || o2 > 255 || o3 > 255 || o4 > 255) {
    return true; // Malformed IP treated as unsafe
  }

  // 0.0.0.0/8 (Current network)
  if (o1 === 0) return true;

  // 127.0.0.0/8 (Loopback addresses)
  if (o1 === 127) return true;

  // 10.0.0.0/8 (RFC 1918 Private)
  if (o1 === 10) return true;

  // 172.16.0.0/12 (RFC 1918 Private: 172.16.0.0 - 172.31.255.255)
  if (o1 === 172 && o2 >= 16 && o2 <= 31) return true;

  // 192.168.0.0/16 (RFC 1918 Private)
  if (o1 === 192 && o2 === 168) return true;

  // 169.254.0.0/16 (Link-Local / AWS/GCP/Azure Instance Metadata 169.254.169.254)
  if (o1 === 169 && o2 === 254) return true;

  // 224.0.0.0/4 (Multicast)
  if (o1 >= 224 && o1 <= 239) return true;

  // 240.0.0.0/4 (Reserved / Future use)
  if (o1 >= 240) return true;

  // 255.255.255.255 (Broadcast)
  if (o1 === 255 && o2 === 255 && o3 === 255 && o4 === 255) return true;

  return false;
}

/**
 * Validates external calendar feed URLs against SSRF vectors.
 */
export async function validateCalendarUrl(
  urlString: string,
  options: { allowHttp?: boolean; allowLocalForTesting?: boolean } = {}
): Promise<UrlValidationResult> {
  if (!urlString || typeof urlString !== "string") {
    return { valid: false, reason: "Missing or invalid URL format" };
  }

  let parsed: URL;
  try {
    parsed = new URL(urlString.trim());
  } catch {
    return { valid: false, reason: "Invalid URL string" };
  }

  // Protocol enforcement: https only unless testing specifies allowHttp
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return { valid: false, reason: `Unsupported protocol: ${parsed.protocol}. Must be https or http.` };
  }

  if (parsed.protocol === "http:" && !options.allowHttp && process.env.NODE_ENV === "production") {
    return { valid: false, reason: "Insecure http protocol not permitted in production environment." };
  }

  const hostname = parsed.hostname.toLowerCase();

  // Common blacklisted hostnames
  if (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    if (!options.allowLocalForTesting) {
      return { valid: false, reason: `Forbidden hostname: ${hostname} (internal/loopback)` };
    }
  }

  // If hostname is directly an IP literal or resolves to an IP
  try {
    const addresses = await dns.promises.lookup(hostname, { all: true });
    if (!addresses || addresses.length === 0) {
      return { valid: false, reason: `Failed to resolve hostname: ${hostname}` };
    }

    for (const addr of addresses) {
      if (isPrivateOrReservedIp(addr.address)) {
        if (!options.allowLocalForTesting) {
          return {
            valid: false,
            reason: `Hostname ${hostname} resolves to blocked private/reserved IP: ${addr.address}`,
            resolvedIp: addr.address,
          };
        }
      }
    }

    return { valid: true, resolvedIp: addresses[0]?.address };
  } catch (err: unknown) {
    // If testing with an arbitrary mock domain that doesn't exist in DNS, check if it's explicitly allowed
    if (options.allowLocalForTesting) {
      return { valid: true };
    }
    const message = err instanceof Error ? err.message : String(err);
    return { valid: false, reason: `DNS lookup failed for ${hostname}: ${message}` };
  }
}

/**
 * Normalizes any Date or ISO string to UTC midnight (00:00:00.000Z).
 * Correctly accounts for node-ical's `dateOnly` flag on calendar-day events.
 */
export function normalizeDateToUTC(dateInput: unknown): Date {
  if (!dateInput) return new Date();

  // If node-ical marked this as dateOnly (e.g. DTSTART;VALUE=DATE:20320610),
  // the calendar date values reside in local year, month, and date getters.
  if (dateInput && typeof dateInput === "object" && "dateOnly" in dateInput && (dateInput as { dateOnly: boolean }).dateOnly) {
    const dObj = dateInput as unknown as Date;
    return new Date(
      Date.UTC(
        dObj.getFullYear(),
        dObj.getMonth(),
        dObj.getDate(),
        0,
        0,
        0,
        0
      )
    );
  }

  // If it's a string in YYYYMMDD or YYYY-MM-DD format
  if (typeof dateInput === "string") {
    const clean = dateInput.trim();
    if (/^\d{8}$/.test(clean)) {
      const year = parseInt(clean.slice(0, 4), 10);
      const month = parseInt(clean.slice(4, 6), 10) - 1;
      const day = parseInt(clean.slice(6, 8), 10);
      return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
      const [y, m, d] = clean.split("-").map(Number);
      return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
    }
  }

  const d = new Date(dateInput as string | number | Date);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0, 0));
}

/**
 * Safely parses raw iCalendar (.ics) string content into normalized calendar events.
 */
export function parseICalString(rawIcsContent: string): ParsedCalendarEvent[] {
  if (!rawIcsContent || typeof rawIcsContent !== "string") {
    return [];
  }

  let parsedData: ReturnType<typeof nodeIcal.sync.parseICS>;
  try {
    parsedData = nodeIcal.sync.parseICS(rawIcsContent);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to parse iCal structure: ${message}`);
  }

  const events: ParsedCalendarEvent[] = [];

  for (const key of Object.keys(parsedData)) {
    const item = parsedData[key];
    if (!item || item.type !== "VEVENT") {
      continue;
    }

    const event = item as nodeIcal.VEvent;

    const externalUid = event.uid || key;
    if (!externalUid) continue;

    if (!event.start) {
      continue;
    }

    const startDate = normalizeDateToUTC(event.start);

    // In RFC 5545, DTEND is exclusive.
    // If end date is missing or equal to start date, default to start + 1 day
    let endDate: Date;
    if (event.end) {
      endDate = normalizeDateToUTC(event.end);
      if (endDate.getTime() <= startDate.getTime()) {
        endDate = new Date(startDate.getTime() + 86400000);
      }
    } else {
      endDate = new Date(startDate.getTime() + 86400000);
    }

    // Determine event status: CANCELLED vs CONFIRMED
    const rawStatus = (event.status || "").toUpperCase();
    const status: "CONFIRMED" | "CANCELLED" = rawStatus === "CANCELLED" ? "CANCELLED" : "CONFIRMED";

    const summary = event.summary || "Reserved (External Channel)";

    let externalLastModified: Date | undefined;
    if (event.lastmodified) {
      externalLastModified = new Date(event.lastmodified);
    } else if (event.created) {
      externalLastModified = new Date(event.created);
    }

    events.push({
      externalUid: String(externalUid).trim(),
      summary: String(summary).trim(),
      startDate,
      endDate,
      status,
      externalLastModified,
      rawMetadata: {
        description: event.description,
        location: event.location,
        transparency: (event as unknown as Record<string, unknown>).transparency,
        sequence: (event as unknown as Record<string, unknown>).sequence,
      },
    });
  }

  return events;
}

/**
 * Downloads an iCal feed with timeout, stream byte limit, redirect validation,
 * and SSRF checks, then returns the parsed events.
 */
export async function fetchAndParseICal(
  calendarUrl: string,
  options: FetchICalOptions = {}
): Promise<ParsedCalendarEvent[]> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;

  let currentUrl = calendarUrl;
  let redirectCount = 0;
  const maxRedirects = 3;

  while (redirectCount <= maxRedirects) {
    // 1. SSRF check on current URL
    const validation = await validateCalendarUrl(currentUrl, {
      allowHttp: options.allowHttp,
      allowLocalForTesting: options.allowLocalForTesting,
    });

    if (!validation.valid) {
      throw new Error(`SSRF or invalid URL blocked: ${validation.reason}`);
    }

    // 2. Fetch with abort controller and manual redirect inspection
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    let res: Response;
    try {
      res = await fetch(currentUrl, {
        method: "GET",
        headers: {
          "User-Agent": "HotelFederation-CalendarSync/1.0 (+https://devstaysjaipur.com)",
          Accept: "text/calendar, application/json, text/plain, */*",
        },
        signal: controller.signal,
        redirect: "manual",
      });
    } catch (fetchErr: unknown) {
      clearTimeout(timeoutId);
      if (fetchErr instanceof Error && fetchErr.name === "AbortError") {
        throw new Error(`Calendar fetch timed out after ${timeoutMs}ms: ${currentUrl}`);
      }
      throw fetchErr;
    }

    clearTimeout(timeoutId);

    // 3. Handle redirects safely
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) {
        throw new Error(`Redirect response (${res.status}) missing Location header`);
      }
      currentUrl = new URL(location, currentUrl).toString();
      redirectCount++;
      if (redirectCount > maxRedirects) {
        throw new Error(`Exceeded maximum redirect count (${maxRedirects})`);
      }
      continue;
    }

    if (!res.ok) {
      throw new Error(`Failed to download calendar feed. HTTP Status: ${res.status} ${res.statusText}`);
    }

    // 4. Enforce Content-Length if present
    const contentLength = res.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > maxBytes) {
      throw new Error(`Calendar feed exceeds maximum allowed size of ${maxBytes} bytes`);
    }

    // 5. Read body stream with byte limiter
    const reader = res.body?.getReader();
    if (!reader) {
      const text = await res.text();
      if (Buffer.byteLength(text, "utf8") > maxBytes) {
        throw new Error(`Calendar feed exceeds maximum allowed size of ${maxBytes} bytes`);
      }
      return parseICalString(text);
    }

    const chunks: Uint8Array[] = [];
    let receivedBytes = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        receivedBytes += value.length;
        if (receivedBytes > maxBytes) {
          reader.cancel();
          throw new Error(`Calendar feed exceeds maximum allowed size of ${maxBytes} bytes`);
        }
        chunks.push(value);
      }
    }

    const totalBuffer = Buffer.concat(chunks);
    const icsContent = totalBuffer.toString("utf-8");
    return parseICalString(icsContent);
  }

  throw new Error("Unexpected end of fetch loop");
}
