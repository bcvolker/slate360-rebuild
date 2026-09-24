"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { VnextOverviewErrorNotice } from "@/components/vnext/project/VnextOverviewErrorNotice";
import {
  DOCUMENTS_EMPTY_COPY,
  DOCUMENTS_FOLDER_EMPTY_COPY,
  DOCUMENTS_SEARCH_EMPTY_COPY,
} from "@/lib/vnext/documents/document-language";
import type { VnextClientDocument, VnextDocumentFolder, VnextSearchHit, VnextSearchKind } from "@/lib/vnext/documents/document-types";
import { filterSearchHits, searchKindsPresent } from "@/lib/vnext/documents/project-search";
import type { VnextProjectPlanSet } from "@/lib/vnext/plans/plan-types";
import { VnextProjectPlans } from "./VnextProjectPlans";

type Props = {
  documents: VnextClientDocument[];
  hits: VnextSearchHit[];
  folders: VnextDocumentFolder[];
  documentsBase: string;
  planSets?: VnextProjectPlanSet[];
  canUploadPlans?: boolean;
  projectId?: string | null;
  error?: string | null;
};

const FIELD =
  "min-h-[var(--vnext-touch)] border border-[var(--vnext-line)] bg-[var(--vnext-surface)] px-3 text-[length:var(--vnext-body)] text-[var(--vnext-ink)]";

const ACTION =
  "inline-flex min-h-[var(--vnext-touch)] min-w-[var(--vnext-touch)] items-center text-[length:var(--vnext-body)] text-[var(--vnext-accent)] no-underline";

export function VnextDocumentsBrowser(props: Props) {
  return (
    <Suspense fallback={null}>
      <DocumentsBrowserInner {...props} />
    </Suspense>
  );
}

function DocumentsBrowserInner({
  documents,
  hits,
  folders,
  documentsBase,
  planSets = [],
  canUploadPlans = false,
  projectId = null,
  error = null,
}: Props) {
  const router = useRouter();
  const pathname = usePathname() ?? documentsBase;
  const searchParams = useSearchParams();
  const urlQuery = searchParams?.get("q") ?? "";
  const folder = searchParams?.get("folder") ?? "all";
  const kind = (searchParams?.get("kind") ?? "all") as "all" | VnextSearchKind;
  const [query, setQuery] = useState(urlQuery);

  useEffect(() => {
    setQuery(urlQuery);
  }, [urlQuery]);

  const searching = query.trim().length > 0;
  const visibleDocs = documents.filter((document) => folder === "all" || document.folderId === folder);
  const results = filterSearchHits(hits, query, kind);
  const kinds = searchKindsPresent(hits);

  function pushParams(next: { q?: string; folder?: string; kind?: string }) {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    const q = next.q ?? urlQuery;
    const nextFolder = next.folder ?? folder;
    const nextKind = next.kind ?? kind;
    if (q.trim()) params.set("q", q.trim());
    else params.delete("q");
    if (nextFolder && nextFolder !== "all") params.set("folder", nextFolder);
    else params.delete("folder");
    if (nextKind && nextKind !== "all") params.set("kind", nextKind);
    else params.delete("kind");
    const search = params.toString();
    router.push(search ? `${pathname}?${search}` : pathname);
  }

  return (
    <div className="vnext-portfolio mx-auto w-full px-[var(--vnext-pad-x)] py-[var(--vnext-pad-y)]" data-vnext-documents="list">
      <div className="flex items-baseline justify-between gap-3">
        <h1 className="m-0 text-[length:var(--vnext-title)] font-semibold tracking-tight text-[var(--vnext-ink)]">Documents</h1>
        {!error && !searching && documents.length > 0 ? (
          <p className="m-0 text-[length:var(--vnext-meta)] text-[var(--vnext-ink-muted)]">
            {visibleDocs.length} {visibleDocs.length === 1 ? "document" : "documents"}
          </p>
        ) : null}
      </div>

      {error ? <VnextOverviewErrorNotice message={error} /> : null}

      {!error && (documents.length > 0 || hits.length > 0) ? (
        <form
          className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center"
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            pushParams({ q: query });
          }}
        >
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search this project"
            placeholder="Search this project"
            className={`${FIELD} w-full min-w-0 sm:flex-1`}
          />
          {!searching && folders.length > 1 ? (
            <select
              aria-label="Filter by folder"
              value={folder}
              onChange={(event) => pushParams({ folder: event.target.value })}
              className={FIELD}
            >
              <option value="all">All folders</option>
              {folders.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.label}
                </option>
              ))}
            </select>
          ) : null}
          {searching && kinds.length > 1 ? (
            <select
              aria-label="Filter results"
              value={kind}
              onChange={(event) => pushParams({ q: query, kind: event.target.value })}
              className={FIELD}
            >
              <option value="all">All results</option>
              {kinds.map((entry) => (
                <option key={entry} value={entry}>
                  {entry === "document" ? "Documents" : entry === "item" ? "Items" : "Plans"}
                </option>
              ))}
            </select>
          ) : null}
        </form>
      ) : null}

      {!error && !searching && documents.length === 0 && planSets.length === 0 && !canUploadPlans ? (
        <p className="m-0 mt-4 border border-[var(--vnext-line)] bg-[var(--vnext-surface)] px-4 py-5 text-[length:var(--vnext-body)] text-[var(--vnext-ink-secondary)]">
          {DOCUMENTS_EMPTY_COPY}
        </p>
      ) : null}

      {!error && !searching && documents.length > 0 ? (
        <DocumentList documents={visibleDocs} documentsBase={documentsBase} empty={visibleDocs.length === 0} />
      ) : null}

      {!error && !searching && folder === "all" ? (
        <VnextProjectPlans planSets={planSets} canUpload={canUploadPlans} projectId={projectId} />
      ) : null}

      {!error && searching ? <SearchList results={results} /> : null}
    </div>
  );
}

function DocumentList({
  documents,
  documentsBase,
  empty,
}: {
  documents: VnextClientDocument[];
  documentsBase: string;
  empty: boolean;
}) {
  if (empty) {
    return (
      <p className="m-0 mt-4 border border-[var(--vnext-line)] bg-[var(--vnext-surface)] px-4 py-5 text-[length:var(--vnext-body)] text-[var(--vnext-ink-secondary)]">
        {DOCUMENTS_FOLDER_EMPTY_COPY}
      </p>
    );
  }
  return (
    <ul className="m-0 mt-4 list-none border border-[var(--vnext-line)] bg-[var(--vnext-surface)] p-0">
      {documents.map((document) => (
        <li key={document.id} className="border-b border-[var(--vnext-line)] px-4 py-3 last:border-b-0">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href={`${documentsBase}/${document.id}`}
              className="flex min-h-[var(--vnext-touch)] min-w-0 flex-1 flex-col justify-center text-[var(--vnext-ink)] no-underline"
            >
              <span className="truncate text-[length:var(--vnext-body)] font-medium">{document.displayName}</span>
              <span className="mt-0.5 truncate text-[length:var(--vnext-meta)] text-[var(--vnext-ink-muted)]">
                {[document.typeLabel, document.folderLabel, document.dateLabel].filter(Boolean).join(" · ")}
              </span>
            </Link>
            <span className="flex shrink-0 items-center gap-4">
              {document.canOpen && document.openHref ? (
                <a className={ACTION} href={document.openHref}>
                  Open
                </a>
              ) : null}
              {document.canDownload && document.downloadHref ? (
                <a className={ACTION} href={document.downloadHref}>
                  Download
                </a>
              ) : null}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

function SearchList({ results }: { results: VnextSearchHit[] }) {
  if (results.length === 0) {
    return (
      <p className="m-0 mt-4 border border-[var(--vnext-line)] bg-[var(--vnext-surface)] px-4 py-5 text-[length:var(--vnext-body)] text-[var(--vnext-ink-secondary)]">
        {DOCUMENTS_SEARCH_EMPTY_COPY}
      </p>
    );
  }
  return (
    <ul className="m-0 mt-4 list-none border border-[var(--vnext-line)] bg-[var(--vnext-surface)] p-0" data-vnext-search-results="true">
      {results.map((hit) => (
        <li key={`${hit.kind}-${hit.id}`} className="border-b border-[var(--vnext-line)] last:border-b-0">
          <Link href={hit.href} className="flex min-h-[var(--vnext-touch)] flex-col justify-center px-4 py-3 text-[var(--vnext-ink)] no-underline">
            <span className="truncate text-[length:var(--vnext-body)] font-medium">{hit.title}</span>
            <span className="mt-0.5 truncate text-[length:var(--vnext-meta)] text-[var(--vnext-ink-muted)]">{hit.context}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
