/** Display name from profiles. Never falls back to an email address. */
export function authorLabelFromProfile(
  profile: {
    display_name?: string | null;
    first_name?: string | null;
    last_name?: string | null;
  } | null | undefined,
): string {
  const display = profile?.display_name?.trim();
  if (display) return display;
  const name = [profile?.first_name, profile?.last_name]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(" ");
  return name || "Project team";
}
