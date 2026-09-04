import { ViewerBrandMark } from "@/components/shared/ViewerBrandMark";
import type { PortalLandingData } from "@/lib/spatial-walkthrough/portal-fixtures";

const link = "inline-flex min-h-12 items-center px-3 font-mono text-[10px] uppercase tracking-[0.12em] text-[var(--graphite-muted)]";
const on = "text-[var(--graphite-text-header)]";

export function PortalChrome({
  data,
  active,
  children,
}: {
  data: PortalLandingData;
  active: "overview" | "reality" | "plan" | "history" | "documents" | "items";
  children: React.ReactNode;
}) {
  const t = data.token;
  const items = [
    ["overview", "Overview", `/portal/${t}`],
    ["reality", "Reality", `/portal/${t}/reality`],
    ["plan", "Plan", `/portal/${t}/plan`],
    ["history", "History", `/portal/${t}/history`],
    ["documents", "Documents", `/portal/${t}/documents`],
    ["items", "Items", `/portal/${t}/items`],
  ] as const;

  return (
    <div className="flex min-h-[100dvh] flex-col bg-[var(--graphite-canvas)] text-[var(--graphite-text-header)]">
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
        <nav className="flex flex-wrap gap-1" data-testid="portal-nav">
          {items.map(([id, label, href]) => (
            <a key={id} href={href} className={`${link} ${active === id ? on : ""}`} data-active={active === id ? "true" : "false"}>
              {label}
            </a>
          ))}
        </nav>
      </header>
      <div className="flex-1">{children}</div>
    </div>
  );
}
