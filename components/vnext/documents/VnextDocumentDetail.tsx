import Link from "next/link";
import type { VnextClientDocument } from "@/lib/vnext/documents/document-types";

type Props = {
  document: VnextClientDocument;
  documentsHref: string;
};

const ACTION =
  "inline-flex min-h-[var(--vnext-touch)] min-w-[var(--vnext-touch)] items-center px-1 text-[length:var(--vnext-body)] no-underline";

export function VnextDocumentDetail({ document, documentsHref }: Props) {
  const context = [document.typeLabel, document.folderLabel, document.dateLabel].filter(Boolean).join(" · ");
  return (
    <article
      className="vnext-portfolio mx-auto w-full px-[var(--vnext-pad-x)] py-[var(--vnext-pad-y)]"
      data-vnext-document-detail={document.id}
    >
      <Link
        href={documentsHref}
        className="inline-flex min-h-[var(--vnext-touch)] min-w-[var(--vnext-touch)] items-center text-[length:var(--vnext-meta)] text-[var(--vnext-ink-muted)] no-underline"
      >
        Documents
      </Link>
      <h1 className="m-0 mt-2 text-[length:var(--vnext-title)] font-semibold tracking-tight text-[var(--vnext-ink)]">
        {document.displayName}
      </h1>
      {context ? <p className="m-0 mt-1 text-[length:var(--vnext-body)] text-[var(--vnext-ink-secondary)]">{context}</p> : null}

      <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(16rem,0.85fr)] lg:items-start">
        <div className="min-w-0">
          {document.previewHref ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={document.previewHref} alt="" className="max-h-[32rem] w-auto max-w-full object-contain" />
          ) : (
            <p className="m-0 text-[length:var(--vnext-body)] text-[var(--vnext-ink)]">{document.filename}</p>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-5 border-t border-[var(--vnext-line)] pt-5 lg:border-l lg:border-t-0 lg:pl-6 lg:pt-0">
          {document.sizeLabel ? (
            <p className="m-0 text-[length:var(--vnext-meta)] text-[var(--vnext-ink-muted)]">{document.sizeLabel}</p>
          ) : null}
          <div className="flex flex-wrap items-center gap-4">
            {document.canOpen && document.openHref ? (
              <a className={`${ACTION} bg-[var(--vnext-accent)] px-5 font-medium text-white`} href={document.openHref}>
                Open
              </a>
            ) : null}
            {document.canDownload && document.downloadHref ? (
              <a className={`${ACTION} text-[var(--vnext-accent)]`} href={document.downloadHref}>
                Download
              </a>
            ) : null}
          </div>
          {document.sheetsHref ? (
            <Link
              href={document.sheetsHref}
              className="inline-flex min-h-[var(--vnext-touch)] min-w-[var(--vnext-touch)] items-center text-[length:var(--vnext-meta)] text-[var(--vnext-accent)] no-underline"
            >
              View sheets
            </Link>
          ) : null}
          {document.related ? (
            <Link
              href={document.related.href}
              className="inline-flex min-h-[var(--vnext-touch)] items-center text-[length:var(--vnext-meta)] text-[var(--vnext-accent)] no-underline"
            >
              Related item: {document.related.title}
            </Link>
          ) : null}
        </div>
      </div>
    </article>
  );
}
