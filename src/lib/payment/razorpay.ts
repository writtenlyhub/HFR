import Razorpay from "razorpay";
import crypto from "crypto";

const keyId = process.env.RAZORPAY_KEY_ID || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_DevStaysJaipur2026";
const keySecret = process.env.RAZORPAY_KEY_SECRET || "test_SecretDevStays2026";
const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET || "rzp_whsec_devstays_test";

/**
 * Razorpay SDK instance initialized with server credentials.
 */
export const razorpay = new Razorpay({
  key_id: keyId,
  key_secret: keySecret,
});

/**
 * Returns whether Razorpay has valid production/test credentials configured.
 */
export function isRazorpayConfigured(): boolean {
  return Boolean(keyId && keySecret);
}

/**
 * Verifies Razorpay checkout payment signature using constant-time HMAC-SHA256 comparison.
 * Signature formula: HMAC_SHA256(order_id + "|" + payment_id, secret)
 */
export function verifyRazorpayPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  if (!orderId || !paymentId || !signature) return false;

  const expectedSignature = crypto
    .createHmac("sha256", keySecret)
    .update(`${orderId}|${paymentId}`)
    .digest("hex");

  try {
    const expectedBuf = Buffer.from(expectedSignature, "utf8");
    const actualBuf = Buffer.from(signature, "utf8");

    if (expectedBuf.length !== actualBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuf, actualBuf);
  } catch {
    return false;
  }
}

/**
 * Verifies Razorpay webhook signature using constant-time HMAC-SHA256 comparison.
 * Signature formula: HMAC_SHA256(rawRequestBody, webhookSecret)
 */
export function verifyRazorpayWebhookSignature(
  rawBody: string,
  signature: string
): boolean {
  if (!rawBody || !signature) return false;

  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(rawBody)
    .digest("hex");

  try {
    const expectedBuf = Buffer.from(expectedSignature, "utf8");
    const actualBuf = Buffer.from(signature, "utf8");

    if (expectedBuf.length !== actualBuf.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedBuf, actualBuf);
  } catch {
    return false;
  }
}
