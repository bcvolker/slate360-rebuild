import { SlateIcon } from "@/components/shared/SlateIcon";

/**
 * Brand mark for light client surfaces: the client's own logo when they have one,
 * otherwise the same Slate360 icon + wordmark as slate360.ai's header.
 */
export function PortalBrandMark({ logoUrl, name }: { logoUrl?: string | null; name?: string | null }) {
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={logoUrl} alt={name ?? ""} className="h-8 w-auto max-w-[140px] object-contain" data-testid="client-logo" />
    );
  }
  return (
    <span className="flex shrink-0 items-center gap-2" data-testid="slate360-logo" aria-label="Slate360">
      <SlateIcon className="h-7 w-auto shrink-0" aria-hidden />
      <span className="text-[15px] font-semibold tracking-[0.13em]" aria-hidden>
        <span className="text-[var(--portal-ink)]">SLATE</span>
        <span className="text-[var(--portal-accent)]">360</span>
      </span>
    </span>
  );
}

/**
 * Inline style that swaps the portal accent for the org's own brand colour. The dark
 * theme default (a CSS var) is ignored: it is calibrated for dark backgrounds.
 */
export function portalAccentStyle(accent: string | null | undefined): React.CSSProperties | undefined {
  if (!accent || accent.trim().startsWith("var(")) return undefined;
  return { ["--portal-accent" as string]: accent };
}
