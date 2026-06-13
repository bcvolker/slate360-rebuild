// Reviewer/App-Store mode is now OPT-IN: it only hides in-progress apps (Twin 360,
// Operations Console, etc.) when explicitly enabled with NEXT_PUBLIC_APP_STORE_MODE=true.
// Set that env var to "true" in the deploy environment before an App Store submission to
// re-hide unfinished surfaces from Apple reviewers.
export const APP_STORE_MODE = process.env.NEXT_PUBLIC_APP_STORE_MODE === "true";

export function shouldHideInAppStoreMode(comingSoon?: boolean) {
  return APP_STORE_MODE && Boolean(comingSoon);
}
