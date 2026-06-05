/** Dev-only UI sandbox — never enabled in production deploys. */
export function isDevScreensEnabled() {
  if (process.env.NODE_ENV === "production") return false;
  if (process.env.NEXT_PUBLIC_DEV_SCREENS === "false") return false;
  return true;
}
