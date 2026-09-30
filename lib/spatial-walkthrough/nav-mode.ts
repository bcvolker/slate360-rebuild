export const NAV_MODES = ["explore", "play", "briefing"] as const;

export type NavMode = (typeof NAV_MODES)[number];

export const NAV_MODE_LABEL: Record<NavMode, string> = {
  explore: "Explore",
  play: "Play Walk",
  briefing: "Guided Briefing",
};

export function isNavMode(value: string): value is NavMode {
  return (NAV_MODES as readonly string[]).includes(value);
}
