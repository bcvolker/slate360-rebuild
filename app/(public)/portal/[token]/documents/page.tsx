import { redirect } from "next/navigation";
import { TokenStatePage } from "@/components/external-portal";
import { PortalChrome } from "@/components/external-portal/PortalChrome";
import { PortalList, PortalPage, docKindLabel, portalRow, portalSecondaryBtn } from "@/components/external-portal/PortalPage";
import { loadPortalByToken } from "@/lib/spatial-walkthrough/load-portal-token";
import { sectionAllowed } from "@/lib/spatial-walkthrough/portal-gating";

export const dynamic = "force-dynamic";

export default async function PortalDocumentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const { token } = await params;
  const { type } = await searchParams;
  const data = await loadPortalByToken(token);
  if (!data) return <TokenStatePage state="unavailable" badge="Client portal" description="This link could not be opened." />;
  if (!sectionAllowed(data, "documents")) redirect(`/portal/${token}`);

  const kinds = [...new Set(data.documents.map((d) => d.kind))];
  const docs = type ? data.documents.filter((d) => d.kind === type) : data.documents;
  const base = `/portal/${token}/documents`;
  const filters = [
    { label: "All", href: base, active: !type, count: data.documents.length },
    ...kinds.map((k) => ({
      label: docKindLabel(k),
      href: `${base}?type=${encodeURIComponent(k)}`,
      active: type === k,
      count: data.documents.filter((d) => d.kind === k).length,
    })),
  ];

  return (
    <PortalChrome data={data} active="documents">
      <PortalPage
        title="Documents"
        meta={`${data.documents.length} shared ${data.documents.length === 1 ? "document" : "documents"}`}
        filters={kinds.length > 1 ? filters : undefined}
        testId="portal-documents-page"
      >
        <PortalList count={docs.length} empty="No documents of this type.">
          {docs.map((doc) => (
            <div key={doc.id} className={portalRow} data-surface="static">
              <a href={doc.href} className="min-w-0 sm:flex-1">
                <span className="block break-words text-sm font-semibold text-[var(--portal-ink)]">{doc.title}</span>
                <span className="block text-xs text-[var(--portal-ink-muted)]">
                  {docKindLabel(doc.kind)}
                  {doc.locatorHref ? " · pinned in the walkthrough" : ""}
                </span>
              </a>
              <span className="flex shrink-0 gap-2">
                {doc.locatorHref ? (
                  <a href={doc.locatorHref} className={portalSecondaryBtn}>
                    See in walkthrough
                  </a>
                ) : null}
                <a href={doc.href} className={portalSecondaryBtn}>
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
