/**
 * Resolves a report template by id from the org templates table, falling back to
 * the built-in seeds. Returns a plain config the Modal report worker can consume.
 *
 * No personal credentials are baked in — `standards` and wording come entirely
 * from the selected template (or the operator's saved one).
 */

import { SEED_REPORT_TEMPLATES, type ThermalReportTemplate } from "@/lib/thermal/report-templates";

export type ResolvedReportTemplate = {
  id: string;
  name: string;
  discipline: string;
  sections: Record<string, boolean>;
  standards: string[];
  methodology_text: string;
  disclaimer_text: string;
  severity_levels: { label: string; definition: string }[];
  show_logo: boolean;
  show_credentials: boolean;
};

const DEFAULT_TEMPLATE_ID = "seed-general";

function toResolved(t: ThermalReportTemplate): ResolvedReportTemplate {
  return {
    id: t.id,
    name: t.name,
    discipline: t.discipline,
    sections: t.sections,
    standards: t.standards ?? [],
    methodology_text: t.methodology_text ?? "",
    disclaimer_text: t.disclaimer_text ?? "",
    severity_levels: t.severity_levels ?? [],
    show_logo: t.show_logo ?? true,
    show_credentials: t.show_credentials ?? false,
  };
}

function seedById(id: string | null | undefined): ThermalReportTemplate | undefined {
  if (!id) return undefined;
  return SEED_REPORT_TEMPLATES.find((t) => t.id === id);
}

/** Minimal Supabase-like client surface the resolver needs (works for app + trigger). */
type QueryClient = {
  from: (table: string) => {
    select: (cols: string) => {
      eq: (col: string, val: string) => {
        maybeSingle: () => Promise<{ data: { config: unknown } | null }>;
      };
    };
  };
};

/**
 * @param templateId  session.metadata.report_template_id (seed id or org template uuid)
 */
export async function resolveReportTemplate(
  client: QueryClient,
  templateId: string | null | undefined,
): Promise<ResolvedReportTemplate> {
  const seed = seedById(templateId);
  if (seed) return toResolved(seed);

  // Org-custom template stored in thermal_report_templates.config
  if (templateId) {
    try {
      const { data } = await client
        .from("thermal_report_templates")
        .select("config")
        .eq("id", templateId)
        .maybeSingle();
      const config = data?.config as Partial<ThermalReportTemplate> | undefined;
      if (config && typeof config === "object") {
        return toResolved({ id: templateId, ...(config as ThermalReportTemplate) });
      }
    } catch {
      // fall through to default
    }
  }

  return toResolved(seedById(DEFAULT_TEMPLATE_ID) ?? SEED_REPORT_TEMPLATES[0]);
}
