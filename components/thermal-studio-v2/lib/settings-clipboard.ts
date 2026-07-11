import type { ThermalV2Isotherm, ThermalV2Tuning } from "@/components/thermal-studio-v2/types";

/** W1 Copy/Paste settings — module-level clipboard (doc: "one image → paste onto many"). */
export type SettingsClip = {
  palette: string;
  span: { lo: number; hi: number } | null;
  tuning: ThermalV2Tuning;
  isotherm: ThermalV2Isotherm;
};

let clip: SettingsClip | null = null;

export function copySettingsToClipboard(next: SettingsClip): void {
  clip = next;
}

export function getClipboardSettings(): SettingsClip | null {
  return clip;
}
