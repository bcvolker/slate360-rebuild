export type PrivacyProfile = "construction" | "marketing";

export function parsePrivacyProfile(value: unknown): PrivacyProfile {
  return value === "marketing" ? "marketing" : "construction";
}

/** Construction never uses a branded plate or generative fill. */
export function allowsBrandedNadir(profile: PrivacyProfile): boolean {
  return profile === "marketing";
}

export const CONSTRUCTION_PRIVACY = {
  profile: "construction" as const,
  fieldOfRegard: true,
  bakedNeutralMask: true,
  skipExcess: true,
  generativeFill: false,
  brandedNadir: false,
};

export const MARKETING_PRIVACY = {
  profile: "marketing" as const,
  fieldOfRegard: true,
  bakedNeutralMask: true,
  skipExcess: true,
  generativeFill: false,
  brandedNadir: true,
};
