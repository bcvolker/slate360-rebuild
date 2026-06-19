/**
 * Emissivity reference library — standard published values for common inspection
 * surfaces, grouped by discipline. Used by the Inspect tuning panel so the operator
 * can set emissivity from a known material instead of guessing a number.
 *
 * Values are typical mid-IR (8–14µm) emissivities from standard thermography
 * references; real surfaces vary with finish, oxidation, and angle — treat as a
 * starting point, then refine against a reference temperature on site.
 */

export type EmissivityMaterial = {
  material: string;
  emissivity: number;
  category: "Building" | "Roofing" | "Electrical" | "Mechanical" | "Metal" | "General";
  note?: string;
};

export const EMISSIVITY_MATERIALS: EmissivityMaterial[] = [
  // Building envelope
  { material: "Concrete", emissivity: 0.95, category: "Building" },
  { material: "Brick (common red)", emissivity: 0.93, category: "Building" },
  { material: "Plaster / drywall", emissivity: 0.91, category: "Building" },
  { material: "Wood (planed)", emissivity: 0.9, category: "Building" },
  { material: "Glass (smooth)", emissivity: 0.92, category: "Building", note: "Highly reflective at angle" },
  { material: "Paint (non-metallic)", emissivity: 0.94, category: "Building" },
  // Roofing
  { material: "Asphalt / built-up roof", emissivity: 0.93, category: "Roofing" },
  { material: "EPDM membrane (black)", emissivity: 0.94, category: "Roofing" },
  { material: "TPO membrane (white)", emissivity: 0.89, category: "Roofing" },
  { material: "Gravel ballast", emissivity: 0.92, category: "Roofing" },
  // Electrical
  { material: "Electrical insulation / plastic", emissivity: 0.94, category: "Electrical" },
  { material: "Painted bus bar", emissivity: 0.92, category: "Electrical" },
  { material: "Bare copper (oxidized)", emissivity: 0.6, category: "Electrical", note: "Polished copper far lower (~0.04)" },
  { material: "Rubber / cable jacket", emissivity: 0.95, category: "Electrical" },
  // Mechanical / metal
  { material: "Cast iron (oxidized)", emissivity: 0.8, category: "Mechanical" },
  { material: "Steel (oxidized)", emissivity: 0.8, category: "Metal" },
  { material: "Steel (galvanized)", emissivity: 0.28, category: "Metal", note: "Reflective — verify with reference" },
  { material: "Stainless steel (dull)", emissivity: 0.85, category: "Metal" },
  { material: "Aluminum (anodized)", emissivity: 0.77, category: "Metal" },
  { material: "Aluminum (polished)", emissivity: 0.05, category: "Metal", note: "Very reflective — emissivity tape recommended" },
  // General
  { material: "Water", emissivity: 0.96, category: "General" },
  { material: "Human skin", emissivity: 0.98, category: "General" },
  { material: "Electrical tape (black)", emissivity: 0.95, category: "General", note: "Common emissivity reference" },
];
