/** Project / share brand. Never invent mystery initials. */

export type LogoTreatment = "auto" | "light" | "dark";

export type ProjectBrand = {
  slate360Mark: boolean;
  clientLogoUrl: string | null;
  clientDisplayName: string | null;
  projectLogoUrl: string | null;
  accentColor: string | null;
  coverImageUrl: string | null;
  logoTreatment: LogoTreatment;
  presentedBy: string | null;
  poweredBySlate360: boolean;
  whiteLabel: boolean;
};

export type ShareBrand = ProjectBrand & {
  snapshotAt: string;
};

const SLATE: ProjectBrand = {
  slate360Mark: true,
  clientLogoUrl: null,
  clientDisplayName: null,
  projectLogoUrl: null,
  accentColor: null,
  coverImageUrl: null,
  logoTreatment: "auto",
  presentedBy: null,
  poweredBySlate360: true,
  whiteLabel: false,
};

function str(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function resolveProjectBrand(raw: Record<string, unknown> | null | undefined): ProjectBrand {
  const o = raw ?? {};
  const clientLogoUrl = str(o.clientLogoUrl) || str(o.logoUrl);
  const clientDisplayName = str(o.clientDisplayName) || str(o.companyName);
  const whiteLabel = o.whiteLabel === true;
  const hasClient = Boolean(clientLogoUrl || clientDisplayName);
  return {
    slate360Mark: whiteLabel ? false : true,
    clientLogoUrl,
    clientDisplayName,
    projectLogoUrl: str(o.projectLogoUrl),
    accentColor: str(o.accentColor) || str(o.accent),
    coverImageUrl: str(o.coverImageUrl) || str(o.coverUrl),
    logoTreatment: o.logoTreatment === "light" || o.logoTreatment === "dark" ? o.logoTreatment : "auto",
    presentedBy: str(o.presentedBy) || clientDisplayName,
    poweredBySlate360: whiteLabel ? o.poweredBySlate360 !== false : true,
    whiteLabel,
    ...(!hasClient ? { clientLogoUrl: null, clientDisplayName: null } : {}),
  };
}

export function snapshotShareBrand(brand: ProjectBrand, at = new Date().toISOString()): ShareBrand {
  return { ...brand, snapshotAt: at };
}

export function brandMarkAlt(brand: ProjectBrand): string {
  return brand.clientDisplayName || "Slate360";
}

/** Initials only when a real client name exists for the tooltip. */
export function brandInitials(brand: ProjectBrand): { letters: string; label: string } | null {
  const name = brand.clientDisplayName;
  if (!name) return null;
  const parts = name.split(/\s+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
  if (!letters) return null;
  return { letters, label: name };
}

export function defaultPaidBrand(): ProjectBrand {
  return { ...SLATE, slate360Mark: true, poweredBySlate360: true };
}
