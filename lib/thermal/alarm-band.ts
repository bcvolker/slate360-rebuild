/**
 * S5.6 alarm suite: turns an operator-chosen alarm mode into the effective
 * highlight band `renderHeatmap` already knows how to paint (in-band =
 * palette color, out-of-band = dimmed grayscale). Pure + grid-agnostic.
 */

import { dewPointC, insulationThresholdC } from "@/lib/thermal/psychrometrics";
import type { Isotherm } from "@/lib/thermal/probe-palettes";
import type { ThermalV2Alarm, ThermalV2Tuning } from "@/components/thermal-studio-v2/types";

export function computeAlarmBand(alarm: ThermalV2Alarm, tuning: ThermalV2Tuning, gridMin: number, gridMax: number): Isotherm | null {
  switch (alarm.mode) {
    case "off":
      return null;
    case "above":
      return { lo: alarm.lo ?? gridMax, hi: Infinity };
    case "below":
      return { lo: -Infinity, hi: alarm.hi ?? gridMin };
    case "interval":
      return { lo: alarm.lo ?? gridMin, hi: alarm.hi ?? gridMax };
    case "dewpoint": {
      // Air temp seeds from (and can be overridden vs) Tuning's atmospheric_c;
      // RH has no per-alarm override field — it always reads Tuning live, so
      // editing Tuning's humidity_pct updates the alarm without a duplicate control.
      const dp = dewPointC(alarm.indoor_c ?? tuning.atmospheric_c ?? 20, tuning.humidity_pct ?? 50);
      return { lo: -Infinity, hi: dp + (alarm.margin ?? 2) };
    }
    case "insulation": {
      const threshold = insulationThresholdC(alarm.indoor_c ?? 20, alarm.outdoor_c ?? 0, alarm.factor ?? 0.7);
      return { lo: -Infinity, hi: threshold };
    }
    default:
      return null;
  }
}
