/**
 * Batch inspection profiles — named presets that bundle the decode params, anomaly
 * thresholds, palette, and report template for a kind of survey (e.g. "Electrical
 * Hotspot", "Roof Moisture"), so the operator can apply a known configuration to a
 * batch in one click.
 *
 * Stored in localStorage for now (Thermal Studio is single-operator/CEO-only). The
 * CRUD surface is deliberately small so it can be swapped to an org-scoped table
 * later without touching callers.
 */

export type InspectionProfile = {
  id: string;
  name: string;
  decode: {
    emissivity: number;
    reflected_c: number;
    distance_m?: number;
    humidity_pct?: number;
  };
  thresholds: {
    hot_delta_c: number;
    cold_delta_c: number;
    min_area_px: number;
  };
  palette?: string;
  report_template_id?: string;
};

const STORAGE_KEY = "slate360.thermal.inspectionProfiles";

export const SEED_PROFILES: InspectionProfile[] = [
  {
    id: "seed-electrical-hotspot",
    name: "Electrical Hotspot Survey",
    decode: { emissivity: 0.95, reflected_c: 20 },
    thresholds: { hot_delta_c: 10, cold_delta_c: 8, min_area_px: 6 },
    palette: "Iron",
    report_template_id: "seed-electrical",
  },
  {
    id: "seed-roof-moisture",
    name: "Roof Moisture (ASTM C1153)",
    decode: { emissivity: 0.93, reflected_c: 20 },
    thresholds: { hot_delta_c: 6, cold_delta_c: 4, min_area_px: 40 },
    palette: "Inferno",
    report_template_id: "seed-roof",
  },
];

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `p${Date.now()}`;
}

export function listProfiles(): InspectionProfile[] {
  if (typeof window === "undefined") return SEED_PROFILES;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED_PROFILES;
    const parsed = JSON.parse(raw) as InspectionProfile[];
    return Array.isArray(parsed) && parsed.length ? parsed : SEED_PROFILES;
  } catch {
    return SEED_PROFILES;
  }
}

function persist(profiles: InspectionProfile[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
  } catch {
    // storage full / unavailable — non-fatal
  }
}

/** Insert or update a profile (by id); returns the new list. */
export function saveProfile(profile: Omit<InspectionProfile, "id"> & { id?: string }): InspectionProfile[] {
  const list = listProfiles();
  const id = profile.id ?? makeId();
  const next = profile.id
    ? list.map((p) => (p.id === profile.id ? { ...(profile as InspectionProfile), id } : p))
    : [...list, { ...(profile as InspectionProfile), id }];
  persist(next);
  return next;
}

export function deleteProfile(id: string): InspectionProfile[] {
  const next = listProfiles().filter((p) => p.id !== id);
  persist(next);
  return next;
}
