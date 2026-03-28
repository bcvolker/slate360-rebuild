/* ── Daily Logs shared types, helpers, constants ────────────────── */

export type DailyLog = {
  id: string;
  log_date: string;
  summary: string | null;
  weather_temp: number | null;
  weather_condition: string | null;
  weather_wind: string | null;
  weather_precip: string | null;
  crew_counts: Record<string, number> | null;
  equipment: string[] | null;
  visitors: string | null;
  safety_observations: string | null;
  delays: string | null;
  photos: string[] | null;
  created_at: string;
  updated_at: string | null;
};

export type DailyLogFormData = {
  log_date: string;
  summary: string;
  weather_temp: string;
  weather_condition: string;
  weather_wind: string;
  weather_precip: string;
  crew_text: string;
  equipment_text: string;
  visitors: string;
  safety_observations: string;
  delays: string;
};

export const EMPTY_FORM: DailyLogFormData = {
  log_date: new Date().toISOString().slice(0, 10),
  summary: "", weather_temp: "", weather_condition: "",
  weather_wind: "", weather_precip: "", crew_text: "",
  equipment_text: "", visitors: "", safety_observations: "", delays: "",
};

export function weatherCodeLabel(code: number): string {
  if (code === 0) return "Clear";
  if ([1, 2].includes(code)) return "Partly cloudy";
  if ([3].includes(code)) return "Cloudy";
  if ([45, 48].includes(code)) return "Fog";
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return "Rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow";
  if ([95, 96, 99].includes(code)) return "Thunderstorm";
  return "Unknown";
}

export function parseCrewText(text: string): Record<string, number> {
  const m: Record<string, number> = {};
  text.split("\n").filter(Boolean).forEach((line) => {
    const parts = line.split(":");
    if (parts.length >= 2) {
      const k = parts[0].trim();
      const v = parseInt(parts[1].trim(), 10);
      if (k && !isNaN(v)) m[k] = v;
    }
  });
  return m;
}

export function crewToText(crew: Record<string, number> | null): string {
  if (!crew) return "";
  return Object.entries(crew).map(([k, v]) => `${k}: ${v}`).join("\n");
}
