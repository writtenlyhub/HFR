/**
 * DevStay Admin CMS — Content Sanitization & Validation Utilities
 */

/**
 * Validates that an email address is well-formed.
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  const trimmed = email.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(trimmed);
}

/**
 * Validates phone numbers (supports international formats, plus sign, spaces, dashes).
 */
export function validatePhoneNumber(phone: string): boolean {
  if (!phone || typeof phone !== "string") return false;
  const trimmed = phone.trim();
  // Accepts standard international formats: +91 141 289 4400, +1 (555) 123-4567, etc.
  const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s./0-9]{6,20}$/;
  return phoneRegex.test(trimmed);
}

/**
 * Validates URLs ensuring safe protocols (http, https, mailto, tel, or relative anchors/paths).
 * Strictly forbids javascript:, data:, vbscript: to eliminate XSS injection vectors.
 */
export function validateSafeUrl(url: string): { valid: boolean; error?: string } {
  if (!url || typeof url !== "string") {
    return { valid: false, error: "URL cannot be empty." };
  }

  const trimmed = url.trim();

  // Relative URLs & Anchors are permitted for internal navigation
  if (trimmed.startsWith("/") || trimmed.startsWith("#")) {
    return { valid: true };
  }

  // Explicitly deny dangerous schemes
  const lower = trimmed.toLowerCase();
  if (
    lower.startsWith("javascript:") ||
    lower.startsWith("data:") ||
    lower.startsWith("vbscript:")
  ) {
    return {
      valid: false,
      error: "Security violation: Insecure URL protocol detected.",
    };
  }

  try {
    const parsed = new URL(trimmed);
    const allowedProtocols = ["http:", "https:", "mailto:", "tel:"];
    if (!allowedProtocols.includes(parsed.protocol)) {
      return {
        valid: false,
        error: `Protocol "${parsed.protocol}" is not permitted. Only HTTP, HTTPS, mailto, and tel are allowed.`,
      };
    }
    return { valid: true };
  } catch {
    return { valid: false, error: "Malformed URL format." };
  }
}

/**
 * Sanitizes rich text content by stripping dangerous tags, scripts, and inline event handlers.
 */
export function sanitizeRichText(input: string): string {
  if (!input || typeof input !== "string") return "";

  let sanitized = input;

  // Remove script tags and contents
  sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "");

  // Remove iframe, object, embed tags
  sanitized = sanitized.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, "");
  sanitized = sanitized.replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, "");
  sanitized = sanitized.replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, "");

  // Strip inline event attributes like onclick, onload, onerror, etc.
  sanitized = sanitized.replace(/\son\w+\s*=\s*["'][^"']*["']/gi, "");
  sanitized = sanitized.replace(/\son\w+\s*=\s*[^>\s]+/gi, "");

  // Strip javascript: hrefs
  sanitized = sanitized.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"');

  return sanitized.trim();
}
