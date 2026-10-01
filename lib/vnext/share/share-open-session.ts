export const SHARE_OPEN_COOKIE = "s360_share_open";

/** Presence of the cookie means this browser session already counted. It is not an access grant. */
export function decideShareOpen(input: { active: boolean; counted: boolean }): "claim" | "skip" {
  if (!input.active || input.counted) return "skip";
  return "claim";
}

export function shareOpenCookiePath(token: string): string {
  return `/share/project/${token}`;
}
