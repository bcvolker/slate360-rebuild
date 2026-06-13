export type EmissivityPreset = {
  id: string;
  label: string;
  defaultEmissivity: number;
  description: string;
};

export const EMISSIVITY_PRESETS: readonly EmissivityPreset[] = [
  {
    id: "built_up_roof",
    label: "Built-up roof (default)",
    defaultEmissivity: 0.91,
    description: "Typical modified bitumen / asphalt membrane",
  },
  {
    id: "tpo_epdm",
    label: "TPO / EPDM membrane",
    defaultEmissivity: 0.95,
    description: "Single-ply white or black membrane",
  },
  {
    id: "metal_panel",
    label: "Metal panel",
    defaultEmissivity: 0.25,
    description: "Unpainted or lightly oxidized metal",
  },
  {
    id: "concrete",
    label: "Concrete",
    defaultEmissivity: 0.88,
    description: "Flat concrete deck or slab",
  },
  {
    id: "brick",
    label: "Brick / masonry",
    defaultEmissivity: 0.90,
    description: "Exterior masonry envelope",
  },
] as const;

export function resolveEmissivityPreset(id: string | undefined): EmissivityPreset {
  return EMISSIVITY_PRESETS.find((p) => p.id === id) ?? EMISSIVITY_PRESETS[0];
}
