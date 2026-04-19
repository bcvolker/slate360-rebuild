import "server-only";

/**
 * Minimal Twilio SMS client using their REST API directly — avoids adding
 * the `twilio` SDK as a runtime dependency. Falls back to a no-op log when
 * env vars are missing so dev/test never breaks.
 *
 * Required env (production):
 *   TWILIO_ACCOUNT_SID
 *   TWILIO_AUTH_TOKEN
 *   TWILIO_FROM   (E.164 number, e.g. +13105551234)
 */

export type SmsResult =
  | { ok: true; messageSid: string }
  | { ok: false; reason: "missing_config" | "invalid_number" | "send_failed"; detail?: string };

const E164 = /^\+[1-9]\d{6,14}$/;

export function isValidPhone(phone: string | null | undefined): boolean {
  return typeof phone === "string" && E164.test(phone.trim());
}

export async function sendSms(opts: { to: string; body: string }): Promise<SmsResult> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM;

  if (!accountSid || !authToken || !from) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[sms] Twilio env not configured — would send:", opts);
    }
    return { ok: false, reason: "missing_config" };
  }

  if (!isValidPhone(opts.to)) {
    return { ok: false, reason: "invalid_number", detail: opts.to };
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64");
  const params = new URLSearchParams({ To: opts.to, From: from, Body: opts.body });

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return { ok: false, reason: "send_failed", detail: `${res.status} ${detail.slice(0, 240)}` };
    }

    const json = (await res.json()) as { sid?: string };
    return { ok: true, messageSid: json.sid ?? "" };
  } catch (err) {
    return { ok: false, reason: "send_failed", detail: err instanceof Error ? err.message : String(err) };
  }
}
