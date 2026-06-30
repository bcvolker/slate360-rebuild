/**
 * Canonical action + entity labels for the unified Slate360 shell — the single source
 * of truth that kills label drift ("New Walk" / "Start a Walk" / "New Work" / "New Worksite").
 * Import these everywhere a CTA, ⌘K command, empty state, or toast names an action, so the
 * same intent reads identically across Dashboard, Site Walk, Twin 360, desktop, and mobile.
 *
 * Verb set is CLOSED: New · Upload · Start · Open · Share · Create · Review · Resume · Done · Back.
 * "Start" is reserved for MOBILE field capture only (desktop never implies it can capture —
 * desktop = upload/assemble/author). See docs/design/SLATE360_UNIFIED_SHELL.md.
 */

export const SHELL_ACTION = {
  // Create digital records (containers)
  newProject: "New Project",
  newWalk: "New Walk", // Site Walk desktop container
  newModel: "New Model", // Twin 360 desktop container
  newDeliverable: "New Deliverable",
  newFolder: "New Folder",

  // Field capture — MOBILE ONLY
  startWalk: "Start Walk",
  startScan: "Start Scan",
  resumeCapture: "Resume capture",

  // Desktop ingest (never "Start" on desktop)
  upload: "Upload",
  continueOnPhone: "Continue on phone",

  // Lifecycle spine
  review: "Review",
  done: "Done",
  back: "Back",

  // Distribute / open
  share: "Share",
  open: "Open",
  openSlateDrop: "Open SlateDrop",
  createSecureLink: "Create secure link",
  requestUpload: "Request upload",
} as const;

/** Canonical entity nouns (parallel across apps). */
export const SHELL_ENTITY = {
  project: "Project",
  // Site Walk
  walk: "Walk", // session
  stop: "Stop", // unit of capture
  deliverable: "Deliverable", // output
  // Twin 360
  scan: "Scan", // session
  clip: "Clip", // unit of capture
  model: "Model", // output
  // Shared
  file: "File",
  contact: "Contact",
} as const;

/** Banned variants — grep targets for a CI lint so the drift can't return. */
export const SHELL_BANNED_LABELS = [
  "New Work",
  "New Worksite",
  "Start a Walk",
  "Start a Scan",
  "Create New Workspace",
  "New Twin",
  "Generate Report",
  "Make Report",
] as const;
