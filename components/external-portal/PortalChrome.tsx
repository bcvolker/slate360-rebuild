import type { PortalLandingData } from "@/lib/spatial-walkthrough/portal-fixtures";
import { portalSections, type PortalSection } from "@/lib/spatial-walkthrough/portal-gating";
import { PortalBrandMark, portalAccentStyle } from "./PortalBrandMark";

const LABELS: Record<PortalSection, string> = {
  overview: "Overview",
  reality: "3D Scan & 360",
  plan: "Plans",
  history: "History",
  documents: "Documents",
  items: "Items",
};

/** "2026-08-17" → "Aug 17, 2026" (the capture date, not a time zone shift). */
function siteVisitDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(`${iso.slice(0, 10)}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

/** Light client portal frame (theme B): same palette and wordmark as slate360.ai. */
export function PortalChrome({
  data,
  active,
  children,
}: {
  data: PortalLandingData;
  active: PortalSection;
  children: React.ReactNode;
}) {
  const t = data.token;
  // Fail closed: without resolved capabilities only Overview shows.
  const sections = portalSections(data.capabilities);
  const visit = siteVisitDate(data.visitLabel);
  const meta = [data.location, visit ? `Site visit ${visit}` : null].filter(Boolean).join(" · ");
  // Client product language (vNext): name the scan/360 section after what is actually shared.
  const caps = data.capabilities;
  const has360 = Boolean(caps?.walkthrough || caps?.stations);
  const realityLabel = caps?.twin && has360 ? "3D Scan & 360" : caps?.twin ? "3D Scan" : "360 / Walkthrough";

  return (
    <div
      className="flex min-h-[100dvh] flex-col bg-[var(--portal-canvas)] text-[var(--portal-ink)]"
      style={portalAccentStyle(data.brand.accentColor)}
      data-portal-theme="light"
    >
      {data.operatorPreview ? (
        <p
          className="border-b border-[var(--portal-line)] bg-[var(--portal-canvas-alt)] px-4 py-2 text-xs font-medium text-[var(--portal-ink-muted)] sm:px-6"
          data-testid="portal-operator-preview"
        >
          Operator preview · this is what the client sees · link expires in 30 minutes
        </p>
      ) : null}
      <header className="border-b border-[var(--portal-line)] bg-[var(--portal-surface)]">
        <div className="mx-auto flex w-full max-w-[1120px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
          <PortalBrandMark logoUrl={data.brand.logoUrl} name={data.brandName} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[var(--portal-ink)]">{data.projectName}</p>
            {meta ? <p className="text-xs text-[var(--portal-ink-muted)]">{meta}</p> : null}
          </div>
        </div>
        {sections.length > 1 ? (
          <nav className="mx-auto flex w-full max-w-[1120px] flex-wrap px-1 sm:gap-1 sm:px-4" data-testid="portal-nav" aria-label="Portal sections">
            {sections.map((id) => {
              const on = active === id;
              return (
                <a
                  key={id}
                  href={id === "overview" ? `/portal/${t}` : `/portal/${t}/${id}`}
                  className={`inline-flex min-h-12 shrink-0 items-center border-b-2 px-2.5 text-[13px] font-medium transition-colors sm:px-3 sm:text-sm ${
                    on
                      ? "border-[var(--portal-accent)] text-[var(--portal-ink)]"
                      : "border-transparent text-[var(--portal-ink-muted)] hover:text-[var(--portal-ink)]"
                  }`}
                  aria-current={on ? "page" : undefined}
                  data-active={on ? "true" : "false"}
                >
                  {id === "reality" ? realityLabel : LABELS[id]}
                </a>
              );
            })}
          </nav>
        ) : null}
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}
