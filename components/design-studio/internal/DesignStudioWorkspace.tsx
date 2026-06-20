"use client";

import { useState, useCallback, useEffect } from "react";
import { PanelLeft, PanelRight, Plus, Layers, Loader2 } from "lucide-react";
import type { DesignSession, DesignVariant } from "@/lib/design-studio/internal-types";
import { useDesignVariantsRealtime } from "@/hooks/useDesignVariantsRealtime";
import { TwinImportPanel } from "./TwinImportPanel";
import { PromptComposer } from "./PromptComposer";
import { VariantStrip } from "./VariantStrip";
import { DesignViewer } from "./DesignViewer";

// Temporary test model so the interactive viewer controls can be exercised before
// real twin/variant previews are wired. Served from /public/uploads (tracked in git).
const TEST_MODEL_SRC = "/uploads/csb-stadium-nodraco.glb";

type WorkspaceTab = "explore" | "compare" | "exports";

const TABS: { id: WorkspaceTab; label: string }[] = [
  { id: "explore", label: "Explore" },
  { id: "compare", label: "Compare" },
  { id: "exports", label: "Exports" },
];

/**
 * No-scroll Design Studio workspace. The interactive viewer is the dominant
 * centerpiece (Brian's requirement): both side rails collapse so it can go
 * near-fullscreen, and the variant strip is a bottom overlay — never a column
 * that steals viewer space.
 */
export function DesignStudioWorkspace({ initialSessions }: { initialSessions: DesignSession[] }) {
  const [sessions, setSessions] = useState<DesignSession[]>(initialSessions);
  const [tab, setTab] = useState<WorkspaceTab>("explore");
  const [activeSessionId, setActiveSessionId] = useState<string | null>(initialSessions[0]?.id ?? null);
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [activeVariantId, setActiveVariantId] = useState<string | null>(null);

  const activeSession = sessions.find((s) => s.id === activeSessionId) ?? null;
  const { variants } = useDesignVariantsRealtime(activeSessionId);
  const activeVariant = variants.find((v) => v.id === activeVariantId) ?? null;

  // Default the active variant to the session's active one (or the latest) as
  // variants stream in.
  useEffect(() => {
    if (activeVariantId && variants.some((v) => v.id === activeVariantId)) return;
    const preferred = activeSession?.active_variant_id;
    const next = variants.find((v) => v.id === preferred) ?? variants[variants.length - 1] ?? null;
    setActiveVariantId(next?.id ?? null);
  }, [variants, activeSession?.active_variant_id, activeVariantId]);

  const onImported = useCallback((session: DesignSession) => {
    setSessions((prev) => [session, ...prev]);
    setActiveSessionId(session.id);
    setImportOpen(false);
  }, []);

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#0B0F15] text-slate-200">
      {/* Thin top bar */}
      <header className="flex h-11 shrink-0 items-center justify-between border-b border-white/10 px-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setLeftOpen((v) => !v)}
            className="rounded p-1 text-slate-400 hover:bg-white/5 hover:text-slate-200"
            title={leftOpen ? "Hide sessions" : "Show sessions"}
          >
            <PanelLeft className="size-4" />
          </button>
          <h1 className="text-sm font-semibold text-white">Design Studio</h1>
          <span className="max-w-[200px] truncate text-xs text-slate-500">{activeSession?.title ?? "No session"}</span>
        </div>
        <nav className="flex items-center gap-1">
          {TABS.map((tn) => (
            <button
              key={tn.id}
              onClick={() => setTab(tn.id)}
              className={`rounded-md px-3 py-1 text-xs transition ${
                tab === tn.id ? "bg-white/10 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              {tn.label}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <span className="text-xs tabular-nums text-slate-500" aria-label="GPU cost meter">
            $0.00
          </span>
          <button
            onClick={() => setRightOpen((v) => !v)}
            className="rounded p-1 text-slate-400 hover:bg-white/5 hover:text-slate-200"
            title={rightOpen ? "Hide prompt" : "Show prompt"}
          >
            <PanelRight className="size-4" />
          </button>
        </div>
      </header>

      {/* Body: viewer is flex-1 and dominates; rails collapse to nothing */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        {/* Left rail */}
        {leftOpen && (
          <aside className="flex w-[260px] shrink-0 flex-col gap-3 overflow-y-auto border-r border-white/10 p-3">
            <div className="flex items-center justify-between">
              <SectionLabel>Sessions</SectionLabel>
              <button
                onClick={() => setImportOpen((v) => !v)}
                className="flex items-center gap-1 rounded bg-white/10 px-2 py-1 text-[11px] text-white hover:bg-white/15"
              >
                <Plus className="size-3" /> Import twin
              </button>
            </div>
            {importOpen && <TwinImportPanel onImported={onImported} onClose={() => setImportOpen(false)} />}
            {sessions.length === 0 ? (
              <p className="text-xs text-slate-500">No sessions yet. Import a Digital Twin to begin.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {sessions.map((s) => (
                  <li key={s.id}>
                    <button
                      onClick={() => setActiveSessionId(s.id)}
                      className={`w-full truncate rounded-md px-2 py-1.5 text-left text-xs transition ${
                        s.id === activeSessionId ? "bg-white/10 text-white" : "text-slate-400 hover:bg-white/5"
                      }`}
                    >
                      {s.title}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        )}

        {/* Center: the hero viewer — fills all remaining space */}
        <main className="relative min-h-0 min-w-0 flex-1 overflow-hidden bg-black/50">
          {tab === "explore" && <ViewerStage session={activeSession} activeVariant={activeVariant} />}
          {tab === "compare" && <Centered label="Compare — select two variants to view side by side." />}
          {tab === "exports" && <Centered label="Exports — generated files and share links appear here." />}

          {/* Bottom variant strip overlay (toggle) — never steals viewer space */}
          {tab === "explore" && (
            <>
              <button
                onClick={() => setGalleryOpen((v) => !v)}
                className="absolute bottom-3 left-3 z-10 flex items-center gap-1 rounded-md bg-black/60 px-2 py-1 text-[11px] text-slate-200 backdrop-blur hover:bg-black/80"
              >
                <Layers className="size-3" /> Variants
              </button>
              {galleryOpen && (
                <div className="absolute inset-x-0 bottom-0 z-10 border-t border-white/10 bg-black/70 p-3 backdrop-blur">
                  <VariantStrip
                    variants={variants}
                    activeVariantId={activeVariantId}
                    onSelect={setActiveVariantId}
                  />
                </div>
              )}
            </>
          )}
        </main>

        {/* Right rail */}
        {rightOpen && (
          <aside className="flex w-[300px] shrink-0 flex-col gap-3 overflow-y-auto border-l border-white/10 p-3">
            <SectionLabel>Prompt</SectionLabel>
            <PromptComposer
              sessionId={activeSessionId}
              parentVariantId={activeVariantId}
              onSubmitted={(variantId) => {
                setActiveVariantId(variantId);
                setGalleryOpen(true);
              }}
            />
          </aside>
        )}
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h2 className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{children}</h2>;
}

function ViewerStage({
  session,
  activeVariant,
}: {
  session: DesignSession | null;
  activeVariant: DesignVariant | null;
}) {
  const [url, setUrl] = useState<string | null>(null);
  const [kind, setKind] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) {
      setUrl(null);
      setKind(null);
      setError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    const q = activeVariant ? `?variantId=${activeVariant.id}` : "";
    fetch(`/api/design-studio/sessions/${session.id}/asset-url${q}`)
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        if (d.url) {
          setUrl(d.url);
          setKind(d.viewerKind ?? null);
        } else {
          setError(d.error ?? "No model available");
        }
      })
      .catch(() => !cancelled && setError("Failed to load model"))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [session, activeVariant]);

  // No session → show the test model so controls are always exercisable.
  if (!session) {
    return (
      <div className="relative h-full w-full">
        <DesignViewer src={TEST_MODEL_SRC} alt="Test model" />
        <ViewerHint>Test model · drag to orbit · scroll to zoom</ViewerHint>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-slate-500">
        <Loader2 className="mr-2 size-4 animate-spin" /> Loading model…
      </div>
    );
  }

  // Gaussian splats need the splat viewer (later slice) — show a clear note.
  if (kind === "splat") {
    return (
      <Centered label="This twin is a Gaussian splat — the splat viewer is wired in a later slice. Import a GLB twin to view it here now." />
    );
  }

  if (url) {
    return (
      <div className="relative h-full w-full">
        <DesignViewer src={url} alt={activeVariant?.label ?? session.title} />
        <ViewerHint>{session.title} · drag to orbit · scroll to zoom</ViewerHint>
      </div>
    );
  }

  // Fallback (e.g. error / no key yet) → test model so the stage is never empty.
  return (
    <div className="relative h-full w-full">
      <DesignViewer src={TEST_MODEL_SRC} alt="Test model" />
      <ViewerHint>{error ? `Test model (${error})` : "Test model · drag to orbit · scroll to zoom"}</ViewerHint>
    </div>
  );
}

function ViewerHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="pointer-events-none absolute left-3 top-3 rounded bg-black/50 px-2 py-1 text-[10px] text-slate-400 backdrop-blur">
      {children}
    </div>
  );
}

function Centered({ label }: { label: string }) {
  return <div className="flex h-full items-center justify-center text-sm text-slate-600">{label}</div>;
}
