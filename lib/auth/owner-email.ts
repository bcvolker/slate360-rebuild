/**
 * Canonical owner email check. `canAccessOperationsConsole` is this check.
 * Missing `CEO_EMAIL` never grants access.
 */
export function isOwnerEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  const ownerEmail = process.env.CEO_EMAIL;
  if (!ownerEmail) return false;
  return email.toLowerCase() === ownerEmail.toLowerCase();
}
