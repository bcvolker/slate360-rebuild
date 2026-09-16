"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, FileText, MessageCircleQuestion, Box, Film, Map, Share2 } from "lucide-react";
import type { ClientChapter, ClientProjectData } from "@/lib/dashboard/load-client-project";
import { ClientShareManager } from "./ClientShareManager";
import { dashboardDesktopTokens as t } from "./dashboard-tokens";

function when(iso: string): string {
  // Date-only strings (scan dates) must not shift a day when rendered west of UTC.
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(iso);
  const d = new Date(dateOnly ? `${iso}T00:00:00` : iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function ChapterIcon({ kind }: { kind: ClientChapter["kind"] }) {
  const cls = "h-10 w-10 text-[var(--mkt-accent)]";
  if (kind === "walkthrough" || kind === "video") return <Film className={cls} strokeWidth={1} />;
  if (kind === "tour" || kind === "ortho") return <Map className={cls} strokeWidth={1} />;
  return <Box className={cls} strokeWidth={1} />;
}

function ChapterCard({ chapter, onShare }: { chapter: ClientChapter; onShare?: () => void }) {
  return (
    <div className="relative">
      <Link
        href={chapter.href}
        className="group relative block aspect-video overflow-hidden rounded-xl border border-[var(--mkt-line)] bg-[var(--mkt-canvas-alt)]"
      >
        {chapter.posterUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={chapter.posterUrl} alt={chapter.title} decoding="async" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <ChapterIcon kind={chapter.kind} />
          </div>
        )}
        {chapter.posterUrl ? <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" /> : null}
        <div className="absolute inset-x-0 bottom-0 p-3 pr-14">
          <p className={`text-sm font-semibold ${chapter.posterUrl ? "text-white" : "text-[var(--mkt-ink)]"}`}>{chapter.title}</p>
        </div>
      </Link>
      {onShare ? (
        <button
          type="button"
          onClick={onShare}
          aria-label={`Share ${chapter.title}`}
          className="absolute bottom-2.5 right-2.5 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[var(--mkt-line)] bg-[var(--mkt-surface)]/95 text-[var(--mkt-ink)] hover:text-[var(--mkt-accent)]"
        >
          <Share2 className="h-4 w-4" aria-hidden />
        </button>
      ) : null}
    </div>
  );
}

/**
 * Authenticated client view of one project: scans as dates, published chapters
 * as cards, documents by folder, open questions. Product-agnostic copy only
 * (docs/design/CLIENT_PROJECT_PACKAGE_2026-09.md).
 */
export function ClientProjectPackage({ data, mockShares }: { data: ClientProjectData; mockShares?: boolean }) {
  const [selected, setSelected] = useState(0);
  const [sharing, setSharing] = useState<ClientChapter | null>(null);
  const scan = data.scans[selected] ?? null;
  const folders = [...new Set(data.documents.map((d) => d.folder))];

  return (
    <div className="flex h-full min-h-0 flex-col gap-6 overflow-y-auto pb-8">
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1">
          <Link href="/client-home" className="inline-flex min-h-10 items-center gap-1.5 text-sm text-[var(--mkt-ink-muted)] hover:text-[var(--mkt-ink)]">
            <ArrowLeft className="h-4 w-4" aria-hidden /> Your projects
          </Link>
          <h1 className="mt-1 text-2xl font-semibold text-[var(--mkt-ink)]">{data.project.name}</h1>
          {data.project.location ? <p className="mt-0.5 text-sm text-[var(--mkt-ink-muted)]">{data.project.location}</p> : null}
        </div>
        {data.brand.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={data.brand.logoUrl} alt={data.brand.companyName ?? "Client logo"} className="h-8 w-auto max-w-[140px] shrink-0 self-start object-contain sm:h-10 sm:max-w-[160px]" />
        ) : null}
      </div>

      {data.scans.length === 0 ? (
        <div className={t.emptyState}>
          <p className="text-base font-semibold text-[var(--mkt-ink)]">Nothing published yet</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-[var(--mkt-ink-muted)]">
            Results appear here as soon as each scan is finished and uploaded.
          </p>
        </div>
      ) : (
        <>
          <div>
            <p className={`${t.sectionLabel} mb-2`}>Scans</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {data.scans.map((s, i) => (
                <button
                  key={s.date}
                  type="button"
                  onClick={() => setSelected(i)}
                  className={`inline-flex min-h-12 shrink-0 items-center rounded-lg border px-4 text-sm font-medium transition-colors ${
                    i === selected
                      ? "border-[var(--mkt-accent-line)] bg-[var(--mkt-accent-soft)] text-[var(--mkt-accent)]"
                      : "border-[var(--mkt-line)] bg-[var(--mkt-surface)] text-[var(--mkt-ink-muted)] hover:text-[var(--mkt-ink)]"
                  }`}
                >
                  {when(s.date)}
                  {i === 0 ? <span className="ml-2 text-xs font-normal">Latest</span> : null}
                </button>
              ))}
            </div>
          </div>

          {scan ? (
            <div>
              <p className={`${t.sectionLabel} mb-2`}>{when(scan.date)}</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {scan.chapters.map((c) => (
                  <ChapterCard key={c.id} chapter={c} onShare={c.shareRef ? () => setSharing(c) : undefined} />
                ))}
              </div>
            </div>
          ) : null}
        </>
      )}

      {(data.documents.length > 0 || data.questions.length > 0 || data.askHref) ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
          {data.documents.length > 0 ? (
            <section>
              <p className={`${t.sectionLabel} mb-2`}>Documents</p>
              <div className="flex flex-col gap-4">
                {folders.map((folder) => (
                  <div key={folder}>
                    <p className="mb-1.5 text-xs font-semibold text-[var(--mkt-ink-muted)]">{folder}</p>
                    <div className="flex flex-col gap-1.5">
                      {data.documents.filter((d) => d.folder === folder).map((d) => (
                        <Link key={d.id} href={d.href} className={`${t.listRow} min-h-12`}>
                          <span className="flex min-w-0 flex-1 items-center gap-2.5">
                            <FileText className="h-4 w-4 shrink-0 text-[var(--mkt-accent)]" aria-hidden />
                            <span className="truncate text-sm text-[var(--mkt-ink)]">{d.title}</span>
                          </span>
                          <span className="shrink-0 text-xs text-[var(--mkt-ink-muted)]">{when(d.createdAt)}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section>
            <div className="mb-2 flex items-center justify-between">
              <p className={t.sectionLabel}>Questions</p>
              {data.askHref ? (
                <Link href={data.askHref} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-[var(--mkt-accent)] px-3 text-xs font-semibold text-white">
                  <MessageCircleQuestion className="h-3.5 w-3.5" aria-hidden /> Ask a question
                </Link>
              ) : null}
            </div>
            {data.questions.length === 0 ? (
              <p className="text-sm text-[var(--mkt-ink-muted)]">No open questions.</p>
            ) : (
              <div className="flex flex-col gap-1.5">
                {data.questions.map((q) => (
                  <Link key={q.id} href={q.href} className={`${t.listRow} min-h-12`}>
                    <span className="min-w-0 flex-1 truncate text-sm text-[var(--mkt-ink)]">{q.title}</span>
                    <span className="shrink-0 text-xs capitalize text-[var(--mkt-ink-muted)]">{q.status}</span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      ) : null}

      {data.brand.showPoweredBy ? (
        <p className="mt-auto text-xs text-[var(--mkt-ink-muted)]">Powered by Slate360</p>
      ) : null}

      {sharing?.shareRef ? (
        <ClientShareManager
          projectId={data.project.id}
          walkthroughId={sharing.shareRef.walkthroughId}
          chapterTitle={`${sharing.title} · ${when(sharing.capturedAt)}`}
          defaultLabel={`${data.project.name} — ${sharing.title}`}
          onClose={() => setSharing(null)}
          mock={mockShares}
        />
      ) : null}
    </div>
  );
}
