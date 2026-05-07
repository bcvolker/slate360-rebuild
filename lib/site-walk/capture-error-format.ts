export function formatCaptureError(error: unknown, fallback = "Capture failed before the upload could attach. Check the console trace and try again.") {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return fallback;
}