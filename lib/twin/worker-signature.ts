import { createHmac, timingSafeEqual } from "node:crypto";

export function signWorkerPayload(rawBody: string, secret: string): string {
  return createHmac("sha256", secret).update(rawBody).digest("hex");
}

export function verifyWorkerSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string | undefined,
): boolean {
  if (!signatureHeader || !secret) return false;

  const expected = signWorkerPayload(rawBody, secret);
  const provided = signatureHeader.startsWith("sha256=")
    ? signatureHeader.slice(7)
    : signatureHeader;

  if (expected.length !== provided.length) return false;

  try {
    return timingSafeEqual(Buffer.from(expected, "utf8"), Buffer.from(provided, "utf8"));
  } catch {
    return false;
  }
}
