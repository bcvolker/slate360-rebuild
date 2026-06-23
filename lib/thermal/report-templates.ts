/**
 * Professional thermography report templates.
 *
 * A template controls which sections appear, the standards/methodology/disclaimer
 * wording, and the severity scheme. Seeded defaults follow common ASTM / NFPA
 * inspection practice and are GENERIC — they require no certification and imply no
 * credential. Any user can clone a seed, edit it, and save their own named
 * templates (stored per-org). Optional author/inspector info is off by default.
 */

export type ReportSeverityLevel = { label: string; definition: string };

/**
 * Page layout for the findings section:
 *  - detail:  one image per page with the full FLIR-style sidebar (most detail)
 *  - two_up:  two images per page, condensed data (less blank space)
 *  - compact: dense grid, ~4 images per page with key readings (max coverage)
 */
export type ReportLayout = "detail" | "two_up" | "compact";

export type ReportSectionKey =
  | "cover"
  | "executive_summary"
  | "methodology"
  | "site_info"
  | "findings"
  | "severity_table"
  | "recommendations"
  | "disclaimer"
  | "signature";

export type ThermalReportTemplate = {
  id: string;
  /** Human name shown in the picker. */
  name: string;
  /** Discipline tag for grouping (roof, electrical, mechanical, general, forensic). */
  discipline: string;
  /** Section visibility toggles. */
  sections: Record<ReportSectionKey, boolean>;
  /** Standards referenced (e.g. "ASTM C1153"). */
  standards: string[];
  methodology_text: string;
  disclaimer_text: string;
  severity_levels: ReportSeverityLevel[];
  /** Branding: operator's uploaded logo. */
  show_logo: boolean;
  /** Optional author/inspector info (name/company) — OFF by default, no credential implied. */
  show_credentials: boolean;
  /** Findings page layout — defaults to "detail" (1 image/page). */
  layout?: ReportLayout;
  /** Read-only seed templates cannot be deleted (but can be cloned). */
  is_seed?: boolean;
};

const ALL_SECTIONS: Record<ReportSectionKey, boolean> = {
  cover: true,
  executive_summary: true,
  methodology: true,
  site_info: true,
  findings: true,
  severity_table: true,
  recommendations: true,
  disclaimer: true,
  signature: true,
};

export const DEFAULT_SEVERITY_LEVELS: ReportSeverityLevel[] = [
  { label: "Critical", definition: "Immediate safety risk or imminent failure — act now." },
  { label: "Severe", definition: "High risk of damage or significant business interruption." },
  { label: "Alert", definition: "Needs attention but not urgent; schedule follow-up." },
  { label: "Advisory", definition: "Informational / best-practice observation." },
];

const DISCLAIMER_BASE =
  "This report is based on non-destructive infrared thermography and represents conditions observed at the time of inspection. Thermographic findings are a screening tool and should be verified by qualified personnel using other appropriate diagnostic methods. This report does not constitute a structural, engineering, or moisture-intrusion evaluation. It is intended for the exclusive use of the client named herein.";

export const SEED_REPORT_TEMPLATES: ThermalReportTemplate[] = [
  {
    id: "seed-roof",
    name: "Roof / Building Envelope (ASTM C1153)",
    discipline: "roof",
    sections: { ...ALL_SECTIONS },
    standards: ["ASTM C1153", "ASTM C1060"],
    methodology_text:
      "The infrared inspection was performed in accordance with ASTM C1153 (Standard Practice for Locating Wet Insulation in Roofing Systems Using Infrared Imaging) and ASTM C1060. Environmental conditions (ambient temperature, relative humidity, wind speed, and solar loading) were recorded at the time of the survey. All thermal images were captured with a calibrated radiometric imager.",
    disclaimer_text:
      DISCLAIMER_BASE + " Suspected wet insulation should be confirmed with a moisture meter or core sampling.",
    severity_levels: DEFAULT_SEVERITY_LEVELS,
    show_logo: true,
    show_credentials: false,
    layout: "two_up",
    is_seed: true,
  },
  {
    id: "seed-electrical",
    name: "Electrical Systems (NFPA 70B / ASTM E1934)",
    discipline: "electrical",
    sections: { ...ALL_SECTIONS },
    standards: ["NFPA 70B", "ASTM E1934"],
    methodology_text:
      "Inspection performed in accordance with NFPA 70B and ASTM E1934. Equipment load conditions were noted at the time of survey; delta-T values are relative and must be interpreted with respect to equipment loading. All thermal images were captured with a calibrated radiometric imager.",
    disclaimer_text:
      DISCLAIMER_BASE + " Electrical findings should be corroborated against load data and verified by a licensed electrician.",
    severity_levels: DEFAULT_SEVERITY_LEVELS,
    show_logo: true,
    show_credentials: false,
    layout: "two_up",
    is_seed: true,
  },
  {
    id: "seed-mechanical",
    name: "Mechanical / HVAC (ASTM E1934)",
    discipline: "mechanical",
    sections: { ...ALL_SECTIONS },
    standards: ["ASTM E1934"],
    methodology_text:
      "Inspection performed in accordance with ASTM E1934 for electrical and mechanical equipment. Operating conditions and loads were recorded at the time of survey. All thermal images were captured with a calibrated radiometric imager.",
    disclaimer_text: DISCLAIMER_BASE,
    severity_levels: DEFAULT_SEVERITY_LEVELS,
    show_logo: true,
    show_credentials: false,
    layout: "two_up",
    is_seed: true,
  },
  {
    id: "seed-general",
    name: "General / Multi-Purpose",
    discipline: "general",
    sections: { ...ALL_SECTIONS, severity_table: true },
    standards: ["Infraspection Institute Guidelines"],
    methodology_text:
      "The infrared inspection followed Infraspection Institute standard guidelines. Environmental and operating conditions were recorded at the time of the survey. All thermal images were captured with a calibrated radiometric imager.",
    disclaimer_text: DISCLAIMER_BASE,
    severity_levels: DEFAULT_SEVERITY_LEVELS,
    show_logo: true,
    show_credentials: false,
    layout: "two_up",
    is_seed: true,
  },
  {
    id: "seed-forensic",
    name: "Detailed / Forensic",
    discipline: "forensic",
    sections: { ...ALL_SECTIONS },
    standards: ["ASTM C1153", "ASTM E1934", "Infraspection Institute Guidelines"],
    methodology_text:
      "A detailed forensic thermographic survey was conducted following applicable ASTM standards and Infraspection Institute guidelines, with comparative analysis and extended data tables. Full environmental and operating conditions were documented. All thermal images were captured with a calibrated radiometric imager.",
    disclaimer_text:
      DISCLAIMER_BASE + " This forensic report may be used to support further investigation; conclusions are limited to thermal evidence observed.",
    severity_levels: DEFAULT_SEVERITY_LEVELS,
    show_logo: true,
    show_credentials: false,
    layout: "two_up",
    is_seed: true,
  },
];

export function emptyTemplate(name: string): Omit<ThermalReportTemplate, "id"> {
  return {
    name,
    discipline: "general",
    sections: { ...ALL_SECTIONS },
    standards: [],
    methodology_text: "",
    disclaimer_text: DISCLAIMER_BASE,
    severity_levels: DEFAULT_SEVERITY_LEVELS,
    show_logo: true,
    show_credentials: false,
  };
}
