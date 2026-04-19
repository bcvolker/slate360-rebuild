export const BETA_MODE = process.env.NEXT_PUBLIC_BETA_MODE !== "false";
export const BETA_TESTER_CAP = 100;

export function isBetaMode(): boolean { return BETA_MODE; }

// Grayed-out CTA copy used everywhere monetization is disabled.
export const BETA_DISABLED_LABELS = {
  subscribe: "Subscribing opens at launch",
  upgrade: "Upgrade unlocks at launch",
  buyCredits: "Credit packs unlock at launch",
  addCollaborator: "Add seats at launch",
} as const;