import { redirect } from "next/navigation";
import { TokenStatePage } from "@/components/external-portal";
import { PortalChrome } from "@/components/external-portal/PortalChrome";
import { PortalList, PortalPage, portalRow, portalSecondaryBtn, sentence } from "@/components/external-portal/PortalPage";
import { loadPortalByToken } from "@/lib/spatial-walkthrough/load-portal-token";
import { sectionAllowed } from "@/lib/spatial-walkthrough/portal-gating";

export const dynamic = "force-dynamic";

const isClosed = (status: string) => status === "closed" || status === "resolved";

export default async function PortalItemsPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { token } = await params;
  const { status } = await searchParams;
  const data = await loadPortalByToken(token);
  if (!data) return <TokenStatePage state="unavailable" badge="Client portal" description="This link could not be opened." />;
  if (!sectionAllowed(data, "items")) redirect(`/portal/${token}`);

  const open = data.items.filter((i) => !isClosed(i.status));
  const closed = data.items.filter((i) => isClosed(i.status));
  const shown = status === "open" ? open : status === "closed" ? closed : data.items;
  const base = `/portal/${token}/items`;
  const filters =
    open.length && closed.length
      ? [
          { label: "All", href: base, active: !status, count: data.items.length },
          { label: "Open", href: `${base}?status=open`, active: status === "open", count: open.length },
          { label: "Closed", href: `${base}?status=closed`, active: status === "closed", count: closed.length },
        ]
      : undefined;

  return (
    <PortalChrome data={data} active="items">
      <PortalPage title="Items" meta={`${open.length} open · ${closed.length} closed`} filters={filters} testId="portal-items-page">
        <PortalList count={shown.length} empty={status === "closed" ? "No closed items." : status === "open" ? "No open items." : "No items yet."}>
          {shown.map((item) => (
            <div key={item.id} className={portalRow} data-surface="static">
              <a href={item.href} className="min-w-0 sm:flex-1">
                <span className="block break-words text-sm font-semibold text-[var(--portal-ink)]">{item.title}</span>
                <span className="block text-xs text-[var(--portal-ink-muted)]">
                  {sentence(item.type)} · {sentence(item.status)}
                </span>
              </a>
              <span className="flex shrink-0 gap-2">
                {item.locatorHref ? (
                  <a href={item.locatorHref} className={portalSecondaryBtn}>
                    See in walkthrough
                  </a>
                ) : null}
                <a href={item.href} className={portalSecondaryBtn}>
                  Open
                </a>
              </span>
            </div>
          ))}
        </PortalList>
      </PortalPage>
    </PortalChrome>
  );
}
