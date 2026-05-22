export type PortalTokenState =
  | "invalid"
  | "expired"
  | "revoked"
  | "max_views"
  | "denied"
  | "unavailable"
  | "empty"
  | "success"
  | "loading";

export const TOKEN_STATE_COPY: Record<
  PortalTokenState,
  { title: string; description: string }
> = {
  invalid: {
    title: "Link not recognized",
    description:
      "This link is invalid or no longer exists. Ask the sender to share a new link.",
  },
  expired: {
    title: "Link expired",
    description:
      "This secure link has expired. Request a new link from the project team.",
  },
  revoked: {
    title: "Link revoked",
    description:
      "Access to this content was revoked by the owner. Contact them if you still need it.",
  },
  max_views: {
    title: "View limit reached",
    description:
      "This link has reached its maximum number of views. Request a new link to continue.",
  },
  denied: {
    title: "Access not allowed",
    description:
      "You do not have permission to view or download this file with the current link.",
  },
  unavailable: {
    title: "Content unavailable",
    description:
      "The shared file or deliverable is no longer available. It may have been removed or archived.",
  },
  empty: {
    title: "Nothing to show yet",
    description:
      "This deliverable does not contain any items yet. Check back after the sender publishes content.",
  },
  success: {
    title: "Submitted",
    description: "Your response was received securely. You may close this window.",
  },
  loading: {
    title: "Loading",
    description: "Preparing your secure portal…",
  },
};
