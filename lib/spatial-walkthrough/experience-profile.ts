/**
 * Viewer experience profile. Spatial engine is unchanged; chrome/features
 * consume this config. Portal may pass `profile` on the share payload later.
 */
export const EXPERIENCE_PROFILES = ["construction", "marketing", "facilities", "wayfinding"] as const;

export type ExperienceProfile = (typeof EXPERIENCE_PROFILES)[number];

export type ExperienceProfileConfig = {
  profile: ExperienceProfile;
  history: boolean;
  items: boolean;
  documents: boolean;
  compare: boolean;
  measure: boolean;
  technical: boolean;
  guidedTour: boolean;
  chapters: boolean;
  narration: boolean;
  branding: boolean;
  shareEmbed: boolean;
  hideProjectManagement: boolean;
  equipmentPins: boolean;
  floorPlan: boolean;
  destination: boolean;
  path: boolean;
  stations: boolean;
};

const MARKETING: ExperienceProfileConfig = {
  profile: "marketing",
  history: false,
  items: false,
  documents: true,
  compare: false,
  measure: false,
  technical: false,
  guidedTour: true,
  chapters: true,
  narration: true,
  branding: true,
  shareEmbed: true,
  hideProjectManagement: true,
  equipmentPins: false,
  floorPlan: false,
  destination: false,
  path: false,
  stations: true,
};

export function parseExperienceProfile(raw: unknown): ExperienceProfile {
  const v = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  return (EXPERIENCE_PROFILES as readonly string[]).includes(v) ? (v as ExperienceProfile) : "marketing";
}

export function configForProfile(profile: ExperienceProfile): ExperienceProfileConfig {
  if (profile === "construction") {
    return {
      ...MARKETING,
      profile,
      history: true,
      items: true,
      documents: true,
      compare: true,
      measure: true,
      technical: true,
      hideProjectManagement: false,
      guidedTour: false,
      narration: false,
    };
  }
  if (profile === "facilities") {
    return {
      ...MARKETING,
      profile,
      history: true,
      items: false,
      documents: true,
      measure: true,
      equipmentPins: true,
      floorPlan: true,
      hideProjectManagement: true,
      guidedTour: false,
      narration: false,
    };
  }
  if (profile === "wayfinding") {
    return {
      ...MARKETING,
      profile,
      documents: false,
      guidedTour: false,
      narration: false,
      branding: true,
      destination: true,
      path: true,
      stations: true,
      hideProjectManagement: true,
    };
  }
  return { ...MARKETING, profile: "marketing" };
}
