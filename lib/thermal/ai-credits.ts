/**
 * S6-CR credit metering config (Addendum H2/H3/B4). The metering CODE ships
 * WITH S6 (pre-flight balance check + idempotent debit), but stays OFF by
 * default — Thermal Studio is CEO-only today and Brian's own use is
 * unmetered by design; the worker's per-org USD ledger cap is the real cost
 * backstop until this flag is revisited before any non-CEO exposure (S9 gate).
 */
export const THERMAL_AI_METERING_ENABLED = process.env.THERMAL_AI_METERING_ENABLED === "true";

/** Brian owns final pricing; ≥3× margin rule at 1 credit/image (see build log cost table). */
export const THERMAL_AI_CREDITS_PER_IMAGE = 1;
