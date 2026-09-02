"use client";

import { useEffect, useState } from "react";
import { FileText, Box, GitCompare } from "lucide-react";
import { PortalDenied, PortalPasswordGate } from "@/components/portal/PortalLocked";
import { AskAboutProject } from "@/components/portal/AskAboutProject";

type BrandTheme = {
  logoUrl: string | null;
  primaryColor: string;
  accentColor: string;
  pageBgColor: string;
  surfaceColor: string;
  textColor: string;
  mutedTextColor: string;
  showPoweredBy: boolean;
};

type Walkthrough = { id: string; title: string; capturedAt: string; building: string | null; floor: string | null; posterUrl: string | null; href: string };
type Epoch = { date: string; twinReady: boolean; walkthroughs: Walkthrough[] };
type Item = { id: string; type: string; title: string; status: string; priority: string; createdAt: string; commentCount: number; locatorHref: string | null };
type Doc = { id: string; type: string; title: string; createdAt: string };

type PortalPayload = {
  project: { id: string; name: string };
  brand: BrandTheme;
  companyName: string;
  hero: Walkthrough | null;
  epochs: Epoch[];
  twin: { spaceId: string; title: string } | null;
  compareAvailable: boolean;
  items: Item[];
  documents: Doc[];
  permissions: { canComment: boolean; canCreateItems: boolean; canSeeDocuments: boolean; canMeasure: boolean; allowDownload: boolean };
};

function fmt(value: string): string {
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function fmtShort(value: string): string {
  return new Date(value).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function PortalClient({ token }: { token: string }) {
  const [data, setData] = useState<PortalPayload | null>(null);
  const [state, setState] = useState<"loading" | "needs-password" | "denied" | "ready">("loading");
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);

  async function load() {
    const res = await fetch(`/api/portal/${token}`);
    if (res.status === 401) {
      const body = await res.json().catch(() => ({}));
      setState(body?.needsPassword ? "needs-password" : "denied");
      return;
    }
    if (!res.ok) {
      setState("denied");
      return;
    }
    setData(await res.json());
    setState("ready");
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function unlock() {
    setPasswordError(null);
    const res = await fetch(`/api/portal/${token}/unlock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: password }),
    });
    if (!res.ok) {
      setPasswordError("That code didn't work. Try again.");
      return;
    }
    await load();
  }

  if (state === "loading") {
    return <div className="flex min-h-screen items-center justify-center bg-[#0B0F15]" aria-busy="true" />;
  }

  if (state === "denied") return <PortalDenied />;

  if (state === "needs-password") {
    return <PortalPasswordGate password={password} onPassword={setPassword} error={passwordError} onSubmit={unlock} />;
  }

  if (!data) return null;
  const { brand } = data;
  const openItems = data.items.filter((i) => i.status !== "closed");

  return (
    <div
      className="min-h-screen"
      style={{
        // @ts-expect-error -- custom properties
        "--portal-bg": brand.pageBgColor,
        "--portal-surface": brand.surfaceColor,
        "--portal-text": brand.textColor,
        "--portal-muted": brand.mutedTextColor,
        "--portal-accent": brand.accentColor,
        background: "var(--portal-bg)",
        color: "var(--portal-text)",
      }}
    >
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5 sm:px-8">
        <div className="flex items-center gap-3">
          {brand.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={brand.logoUrl} alt="" className="h-7 w-auto opacity-90" style={{ opacity: 0.85 }} />
          ) : (
            <p className="font-mono text-sm font-semibold uppercase tracking-wide">{data.companyName}</p>
          )}
        </div>
        <p className="hidden text-sm sm:block" style={{ color: "var(--portal-muted)" }}>
          {data.project.name}
        </p>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-20 sm:px-8">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-2xl" style={{ background: "var(--portal-surface)" }}>
          {data.hero?.posterUrl ? (
            <div className="relative aspect-[16/9] w-full sm:aspect-[21/9]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={data.hero.posterUrl} alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            </div>
          ) : (
            <div className="flex aspect-[16/9] w-full items-center justify-center sm:aspect-[21/9]">
              <p className="text-sm" style={{ color: "var(--portal-muted)" }}>
                Your first capture will appear here
              </p>
            </div>
          )}
          {data.hero ? (
            <div className="absolute inset-x-0 bottom-0 flex flex-col gap-3 p-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-white/70">{fmt(data.hero.capturedAt)}</p>
                <h1 className="mt-1 text-xl font-semibold text-white sm:text-2xl">{data.hero.title}</h1>
              </div>
              <a
                href={data.hero.href}
                className="inline-flex min-h-11 items-center justify-center rounded-lg px-5 text-sm font-semibold text-white"
                style={{ background: "var(--portal-accent)" }}
              >
                Open latest walkthrough
              </a>
            </div>
          ) : null}
        </section>

        {/* Capture history */}
        {data.epochs.length > 1 ? (
          <section className="mt-8">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--portal-muted)" }}>
              Capture history
            </p>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {data.epochs.map((epoch) => (
                <a
                  key={epoch.date}
                  href={epoch.walkthroughs[0]?.href ?? "#"}
                  className="w-36 shrink-0 overflow-hidden rounded-xl"
                  style={{ background: "var(--portal-surface)" }}
                >
                  <div className="aspect-video w-full bg-black/20">
                    {epoch.walkthroughs[0]?.posterUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={epoch.walkthroughs[0].posterUrl} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <p className="px-2.5 py-2 text-xs font-medium">{fmtShort(epoch.date)}</p>
                </a>
              ))}
            </div>
          </section>
        ) : null}

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {/* Twin */}
          {data.twin ? (
            <a
              href={`/digital-twins?space=${data.twin.spaceId}`}
              className="flex min-h-11 items-center gap-3 rounded-xl px-4 py-4"
              style={{ background: "var(--portal-surface)" }}
            >
              <Box className="h-5 w-5" style={{ color: "var(--portal-accent)" }} />
              <div>
                <p className="text-sm font-semibold">Digital Twin</p>
                <p className="text-xs" style={{ color: "var(--portal-muted)" }}>
                  Measured, walkable 3D
                </p>
              </div>
            </a>
          ) : null}

          {/* Compare */}
          {data.compareAvailable ? (
            <div className="flex min-h-11 items-center gap-3 rounded-xl px-4 py-4" style={{ background: "var(--portal-surface)" }}>
              <GitCompare className="h-5 w-5" style={{ color: "var(--portal-accent)" }} />
              <div>
                <p className="text-sm font-semibold">Compare captures</p>
                <p className="text-xs" style={{ color: "var(--portal-muted)" }}>
                  Coming soon for this project
                </p>
              </div>
            </div>
          ) : null}
        </div>

        {/* Needs your reply */}
        <section className="mt-8">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--portal-muted)" }}>
              Needs your reply
            </p>
          </div>
          {openItems.length === 0 ? (
            <p className="rounded-xl px-4 py-4 text-sm" style={{ background: "var(--portal-surface)", color: "var(--portal-muted)" }}>
              No open questions
            </p>
          ) : (
            <ul className="space-y-2">
              {openItems.map((item) => (
                <li key={item.id} className="rounded-xl px-4 py-3" style={{ background: "var(--portal-surface)" }}>
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="mt-0.5 text-xs" style={{ color: "var(--portal-muted)" }}>
                    {item.type} · {fmtShort(item.createdAt)} · {item.commentCount} repl{item.commentCount === 1 ? "y" : "ies"}
                  </p>
                </li>
              ))}
            </ul>
          )}
          {data.permissions.canCreateItems ? <AskAboutProject token={token} projectId={data.project.id} onCreated={load} /> : null}
        </section>

        {/* Documents */}
        {data.permissions.canSeeDocuments ? (
          <section className="mt-8">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--portal-muted)" }}>
              Documents
            </p>
            {data.documents.length === 0 ? (
              <p className="rounded-xl px-4 py-4 text-sm" style={{ background: "var(--portal-surface)", color: "var(--portal-muted)" }}>
                No documents shared yet
              </p>
            ) : (
              <ul className="space-y-2">
                {data.documents.map((doc) => (
                  <li key={doc.id} className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ background: "var(--portal-surface)" }}>
                    <FileText className="h-4 w-4 shrink-0" style={{ color: "var(--portal-muted)" }} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{doc.title}</p>
                      <p className="text-xs" style={{ color: "var(--portal-muted)" }}>
                        {fmtShort(doc.createdAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}
      </main>

      {brand.showPoweredBy ? (
        <footer className="pb-6 text-center">
          <p className="text-[11px]" style={{ color: "var(--portal-muted)" }}>
            Powered by Slate360
          </p>
        </footer>
      ) : null}
    </div>
  );
}
