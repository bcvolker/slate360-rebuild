"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Box, FileText, MessageSquare, Share2 } from "lucide-react";
import { projectDetailTokens as t } from "@/components/projects/project-detail-tokens";
import { SharePortalDialog } from "@/components/projects/SharePortalDialog";

type CaptureEpoch = {
  date: string;
  twinReady: boolean;
  walkthroughs: Array<{ id: string; title: string; capturedAt: string; building: string | null; floor: string | null; posterUrl: string | null; href: string }>;
};

type PortalData = {
  project: { id: string; name: string };
  hero: CaptureEpoch["walkthroughs"][number] | null;
  epochs: CaptureEpoch[];
  twin: { spaceId: string; title: string } | null;
  compareAvailable: boolean;
  items: Array<{ id: string; type: string; title: string; status: string; commentCount: number; createdAt: string; locatorHref: string | null }>;
  documents: Array<{ id: string; type: string; title: string; createdAt: string }>;
};

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatShort(value: string): string {
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function MondayProjectHero({ projectId }: { projectId: string }) {
  const [data, setData] = useState<PortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/projects/${projectId}/hero`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!cancelled) setData(json);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  if (loading) {
    return <div className={`${t.sectionCard} h-64 animate-pulse`} aria-hidden />;
  }
  if (!data) return null;

  const openItems = data.items.filter((i) => i.status !== "closed").slice(0, 4);
  const recentDocs = data.documents.slice(0, 4);

  return (
    <div className="space-y-5">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-xl border border-white/10 bg-white/[0.03]">
        {data.hero?.posterUrl ? (
          <div className="relative aspect-[21/9] w-full overflow-hidden bg-[var(--graphite-canvas)] sm:aspect-[3/1]">
            {/* eslint-disable-next-line @next/next/no-img-element -- signed/proxied binary, not a static asset */}
            <img src={data.hero.posterUrl} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--graphite-canvas)] via-[color-mix(in_srgb,var(--graphite-canvas)_45%,transparent)] to-transparent" />
          </div>
        ) : (
          <div className="flex aspect-[21/9] w-full items-center justify-center bg-[var(--graphite-canvas)] sm:aspect-[3/1]">
            <p className="font-mono text-xs uppercase tracking-wide text-[var(--graphite-muted)]">Next capture will appear here</p>
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 p-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <p className="font-mono text-[11px] uppercase tracking-wide text-[var(--graphite-muted)]">Latest visual conditions</p>
            {data.hero ? (
              <>
                <h2 className="mt-1 truncate text-xl font-semibold text-[var(--graphite-text-header)]">{data.hero.title}</h2>
                <p className="mt-1 text-sm text-[var(--graphite-muted)]">
                  {formatDate(data.hero.capturedAt)}
                  {data.hero.building ? ` · ${data.hero.building}` : ""}
                  {data.hero.floor ? ` · ${data.hero.floor}` : ""}
                </p>
              </>
            ) : (
              <h2 className="mt-1 text-xl font-semibold text-[var(--graphite-text-header)]">No capture yet</h2>
            )}
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              className="inline-flex min-h-11 items-center gap-2 rounded-md border border-white/15 bg-white/[0.06] px-4 text-sm font-semibold text-[var(--graphite-text-header)] hover:bg-white/[0.1]"
            >
              <Share2 className="h-4 w-4" /> Share portal
            </button>
            {data.hero ? (
              <Link
                href={data.hero.href}
                className="inline-flex min-h-11 items-center gap-2 rounded-md bg-[var(--graphite-primary)] px-4 text-sm font-semibold text-[var(--graphite-canvas)]"
              >
                Open latest <ArrowRight className="h-4 w-4" />
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      {/* Capture history */}
      {data.epochs.length > 0 ? (
        <section>
          <p className={`${t.eyebrow} mb-3`}>Capture history</p>
          <div className="flex gap-3 overflow-x-auto pb-1">
            {data.epochs.map((epoch) => {
              const first = epoch.walkthroughs[0];
              return (
                <Link
                  key={epoch.date}
                  href={first?.href ?? "#"}
                  className="w-40 shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white/[0.03] transition-colors hover:border-[color-mix(in_srgb,var(--graphite-primary)_40%,transparent)]"
                >
                  <div className="aspect-video w-full bg-[var(--graphite-canvas)]">
                    {first?.posterUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={first.posterUrl} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="p-2.5">
                    <p className="text-xs font-semibold text-[var(--graphite-text-header)]">{formatShort(epoch.date)}</p>
                    <p className="mt-0.5 text-[11px] text-[var(--graphite-muted)]">
                      {epoch.walkthroughs.length} walk{epoch.walkthroughs.length === 1 ? "" : "s"}
                      {epoch.twinReady ? " · Twin" : ""}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ) : null}

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Needs attention */}
        <section className={`${t.sectionCard} flex min-h-0 flex-col`}>
          <div className="flex items-center justify-between gap-2">
            <p className={t.eyebrow}>Needs attention</p>
            <Link href={`/projects/${projectId}/items`} className="text-xs font-semibold text-[var(--graphite-primary)]">
              View all
            </Link>
          </div>
          {openItems.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--graphite-muted)]">No open questions</p>
          ) : (
            <ul className="mt-3 space-y-1">
              {openItems.map((item) => (
                <li key={item.id}>
                  <Link href={item.locatorHref ?? `/projects/${projectId}/items`} className={t.activityRow}>
                    <MessageSquare className="h-4 w-4 shrink-0 text-[var(--graphite-muted)]" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[var(--graphite-text-header)]">{item.title}</p>
                      <p className="mt-0.5 text-xs text-[var(--graphite-muted)]">
                        {item.type} · {item.commentCount} repl{item.commentCount === 1 ? "y" : "ies"}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Documents */}
        <section className={`${t.sectionCard} flex min-h-0 flex-col`}>
          <div className="flex items-center justify-between gap-2">
            <p className={t.eyebrow}>Documents</p>
            <Link href={`/projects/${projectId}/slatedrop`} className="text-xs font-semibold text-[var(--graphite-primary)]">
              View all
            </Link>
          </div>
          {recentDocs.length === 0 ? (
            <p className="mt-3 text-sm text-[var(--graphite-muted)]">No documents yet</p>
          ) : (
            <ul className="mt-3 space-y-1">
              {recentDocs.map((doc) => (
                <li key={doc.id} className={t.activityRow}>
                  <FileText className="h-4 w-4 shrink-0 text-[var(--graphite-muted)]" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[var(--graphite-text-header)]">{doc.title}</p>
                    <p className="mt-0.5 text-xs text-[var(--graphite-muted)]">{formatShort(doc.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Twin */}
        <section className={`${t.sectionCard} flex min-h-0 flex-col`}>
          <p className={t.eyebrow}>Digital Twin</p>
          {data.twin ? (
            <Link
              href={`/digital-twins?space=${data.twin.spaceId}`}
              className="mt-3 flex min-h-11 items-center justify-between gap-2 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2.5 hover:border-[color-mix(in_srgb,var(--twin360-blue)_40%,transparent)]"
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-[var(--graphite-text-header)]">
                <Box className="h-4 w-4 text-[var(--twin360-blue)]" /> {data.twin.title}
              </span>
              <ArrowRight className="h-4 w-4 text-[var(--graphite-muted)]" />
            </Link>
          ) : (
            <p className="mt-3 text-sm text-[var(--graphite-muted)]">No Twin published for this project yet</p>
          )}
        </section>
      </div>

      {shareOpen ? <SharePortalDialog projectId={projectId} onClose={() => setShareOpen(false)} /> : null}
    </div>
  );
}
