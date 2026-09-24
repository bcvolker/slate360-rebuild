const MAX_QUESTION_LENGTH = 4000;

export type PreparedQuestion =
  | { ok: true; body: string }
  | { ok: false; reason: "empty" | "too_long" };

export function prepareQuestionBody(raw: string): PreparedQuestion {
  const body = raw.trim();
  if (!body) return { ok: false, reason: "empty" };
  if (body.length > MAX_QUESTION_LENGTH) return { ok: false, reason: "too_long" };
  return { ok: true, body };
}

export function questionValidationMessage(reason: "empty" | "too_long"): string {
  if (reason === "empty") return "Write a question before sending.";
  return "That question is too long.";
}
