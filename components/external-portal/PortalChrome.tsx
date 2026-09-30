import { ViewerBrandMark } from "@/components/shared/ViewerBrandMark";
import type { PortalLandingData } from "@/lib/spatial-walkthrough/portal-fixtures";
import { portalSections, type PortalSection } from "@/lib/spatial-walkthrough/portal-gating";

const link = "inline-flex min-h-12 items-center px-3 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--graphite-muted)]";
const on = "text-[var(--graphite-text-header)]";

const LABELS: Record<PortalSection, string> = {
  overview: "Overview",
  reality: "Reality",
  plan: "Plan",
  history: "History",
  documents: "Documents",
  items: "Items",
};

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

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[var(--graphite-canvas)] text-[var(--graphite-text-header)]">
      {data.operatorPreview ? (
        <p
          className="border-b border-white/10 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--graphite-muted)] sm:px-6"
          data-testid="portal-operator-preview"
        >
          Operator preview · this is what the client sees · link expires in 30 minutes
        </p>
      ) : null}
      <header className="flex flex-col gap-3 border-b border-white/10 px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <ViewerBrandMark logoUrl={data.brand.logoUrl} opacity={data.brand.logoOpacity ?? 0.88} />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{data.projectName}</p>
            <p className="truncate font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--graphite-muted)]">
              {[data.location, data.visitLabel].filter(Boolean).join(" · ")}
            </p>
          </div>
        </div>
        {sections.length > 1 ? (
          <nav className="flex flex-wrap gap-1" data-testid="portal-nav">
            {sections.map((id) => (
              <a
                key={id}
                href={id === "overview" ? `/portal/${t}` : `/portal/${t}/${id}`}
                className={`${link} ${active === id ? on : ""}`}
                data-active={active === id ? "true" : "false"}
              >
                {LABELS[id]}
              </a>
            ))}
          </nav>
        ) : null}
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}
