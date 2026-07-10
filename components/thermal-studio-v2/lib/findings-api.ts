/** Autosave for the operator's findings note — same PATCH contract the old UI uses. */
export function saveFindings(captureId: string, findings: string): void {
  fetch(`/api/ops/thermal/captures/${captureId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ findings }),
  }).catch(() => {});
}
