import type { BrandTheme } from "./types";

export function orgThemeFromRow(row: Record<string, unknown> | null | undefined): Partial<BrandTheme> {
  if (!row) return {};
  const logo = row.logoUrl ?? row.logo_url;
  return {
    logoUrl: typeof logo === "string" ? logo : null,
    primaryColor: typeof row.primary_color === "string" ? row.primary_color : typeof row.primaryColor === "string" ? row.primaryColor : undefined,
    secondaryColor: typeof row.secondary_color === "string" ? row.secondary_color : typeof row.secondaryColor === "string" ? row.secondaryColor : undefined,
    accentColor: typeof row.accent_color === "string" ? row.accent_color : typeof row.accentColor === "string" ? row.accentColor : undefined,
    pageBgColor: typeof row.page_bg_color === "string" ? row.page_bg_color : typeof row.pageBgColor === "string" ? row.pageBgColor : undefined,
    surfaceColor: typeof row.surface_color === "string" ? row.surface_color : typeof row.surfaceColor === "string" ? row.surfaceColor : undefined,
    textColor: typeof row.text_color === "string" ? row.text_color : typeof row.textColor === "string" ? row.textColor : undefined,
    mutedTextColor: typeof row.muted_text_color === "string" ? row.muted_text_color : typeof row.mutedTextColor === "string" ? row.mutedTextColor : undefined,
    logoTreatment: row.logo_treatment === "light" || row.logo_treatment === "dark" || row.logoTreatment === "light" || row.logoTreatment === "dark"
      ? ((row.logo_treatment ?? row.logoTreatment) as BrandTheme["logoTreatment"])
      : undefined,
    showPoweredBy: typeof row.show_powered_by === "boolean" ? row.show_powered_by : typeof row.showPoweredBy === "boolean" ? row.showPoweredBy : undefined,
    logoOpacity: typeof row.logo_opacity === "number" ? row.logo_opacity : typeof row.logoOpacity === "number" ? row.logoOpacity : undefined,
    companyName: typeof row.company_name === "string" ? row.company_name : typeof row.companyName === "string" ? row.companyName : undefined,
  };
}
