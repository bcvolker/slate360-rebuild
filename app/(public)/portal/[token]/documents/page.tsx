import { TokenStatePage } from "@/components/external-portal";
import { PortalChrome } from "@/components/external-portal/PortalChrome";
import { loadPortalByToken } from "@/lib/spatial-walkthrough/load-portal-token";

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
  if (!data) {
    return <TokenStatePage state="unavailable" badge="Client portal" description="This link could not be opened." />;
  }
  const kinds = [...new Set(data.documents.map((d) => d.kind))];
  const docs = type ? data.documents.filter((d) => d.kind === type) : data.documents;

  return (
    <PortalChrome data={data} active="documents">
    <main className="px-4 py-6 sm:px-8" data-testid="portal-documents-page">
      <h1 className="mb-6 text-xl font-semibold">Documents</h1>
      <div className="mb-6 flex flex-wrap gap-2">
        <a href={`/portal/${token}/documents`} className="inline-flex min-h-12 items-center border border-white/20 px-4 text-sm">
          All
        </a>
        {kinds.map((kind) => (
          <a key={kind} href={`/portal/${token}/documents?type=${encodeURIComponent(kind)}`} className="inline-flex min-h-12 items-center border border-white/10 px-4 text-sm">
            {kind}
          </a>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {docs.map((doc) => (
          <article key={doc.id} className="border border-white/10" data-surface="static">
            <div className="aspect-[4/3] bg-white/[0.04]">
              {doc.thumbUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={doc.thumbUrl} alt="" className="h-full w-full object-cover" />
              ) : null}
            </div>
            <div className="p-3">
              <p className="text-sm">{doc.title}</p>
              <p className="font-mono text-[10px] uppercase text-[var(--graphite-muted)]">
                {doc.kind} · {doc.locatorHref ? "1 spatial reference" : "0 spatial references"}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <a href={doc.href} className="inline-flex min-h-12 items-center border border-white/20 px-3 text-sm">Open</a>
                {doc.locatorHref ? (
                  <a href={doc.locatorHref} className="inline-flex min-h-12 items-center border border-white/10 px-3 text-sm">
                    View locations
                  </a>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </div>
    </main>
    </PortalChrome>
  );
}
