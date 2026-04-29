import * as Sentry from "@sentry/nextjs";

/** Strip PII fields from any plain object recursively. */
function scrubPII(obj: Record<string, unknown>): Record<string, unknown> {
  const blocked = new Set(["token", "secret", "password", "authorization"]);
  const cleaned: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (blocked.has(key.toLowerCase())) {
      cleaned[key] = "[REDACTED]";
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      cleaned[key] = scrubPII(value as Record<string, unknown>);
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: readSampleRate(process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE, 0.1),
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: readSampleRate(process.env.NEXT_PUBLIC_SENTRY_REPLAY_ERROR_SAMPLE_RATE, 0.1),
  enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
  beforeSend(event) {
    // Scrub Authorization headers from request context
    if (event.request?.headers) {
      const headers = { ...event.request.headers };
      delete headers["authorization"];
      delete headers["Authorization"];
      delete headers["cookie"];
      delete headers["Cookie"];
      event.request.headers = headers;
    }

    // Scrub sensitive fields from request body
    if (event.request?.data && typeof event.request.data === "object") {
      event.request.data = scrubPII(
        event.request.data as Record<string, unknown>
      );
    }

    // Scrub breadcrumb data payloads
    if (event.breadcrumbs) {
      for (const crumb of event.breadcrumbs) {
        if (crumb.data && typeof crumb.data === "object") {
          crumb.data = scrubPII(crumb.data as Record<string, unknown>);
        }
      }
    }

    return event;
  },
});

function readSampleRate(value: string | undefined, fallback: number) {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(1, Math.max(0, parsed)) : fallback;
}
