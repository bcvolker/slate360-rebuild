"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { MobileHomeListRow, mobileTokens } from "@/components/mobile-system";

/**
 * Light-lift, one-tap deliverable generation for the mobile walk-review screen.
 *
 * Each option calls a server-side generator (status-report or quick-deliverable)
 * that builds a templated block array from the walk's captured items — no heavy
 * authoring on-device. Rich block-editor / interactive deliverables are
 * desktop-only, hence the "more on desktop" footer.
 *
 * On success we route to where the deliverable can be shared/sent: the project's
 * Deliverables tab when the walk is attached to a project, otherwise the
 * Site Walk deliverables list (ad-hoc walks).
 */

type GenerateOption = {
  key: "status_report" | "punchlist" | "photo_log" | "field_report" | "slideshow";
  title: string;
  meta: string;
};

const OPTIONS: GenerateOption[] = [
  { key: "slideshow", title: "Slideshow", meta: "Click-through photo deck to send to clients" },
  { key: "status_report", title: "Status report", meta: "Open vs. resolved summary for leadership" },
  { key: "punchlist", title: "Punch list", meta: "Outstanding items by priority" },
  { key: "photo_log", title: "Photo log", meta: "Every captured photo, in order" },
  { key: "field_report", title: "Field report", meta: "Full chronological record of the walk" },
];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
  projectId: string | null;
};

export function CaptureV2GenerateDeliverableSheet({
  open,
  onOpenChange,
  sessionId,
  projectId,
}: Props) {
  const router = useRouter();
  const [busyKey, setBusyKey] = useState<GenerateOption["key"] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate(option: GenerateOption) {
    setBusyKey(option.key);
    setError(null);
    try {
      const { url, body } =
        option.key === "status_report"
          ? { url: `/api/site-walk/sessions/${sessionId}/status-report`, body: "{}" }
          : {
              url: `/api/site-walk/sessions/${sessionId}/quick-deliverable`,
              body: JSON.stringify({ type: option.key }),
            };

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) throw new Error(data?.error ?? "Could not generate deliverable");

      onOpenChange(false);
      router.push(projectId ? `/projects/${encodeURIComponent(projectId)}/deliverables` : "/site-walk/deliverables");
      router.refresh();
    } catch (generateError) {
      setError(generateError instanceof Error ? generateError.message : "Could not generate deliverable");
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[min(80dvh,560px)] rounded-t-3xl border-t border-[var(--surface-zinc-border)] bg-[var(--surface-zinc)] p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] sm:max-w-none"
      >
        <SheetHeader className="text-left">
          <span className={mobileTokens.siteWalkHomeSectionLabelAccent} aria-hidden />
          <SheetTitle className={mobileTokens.appHomeSectionLabel}>Generate deliverable</SheetTitle>
        </SheetHeader>
        <div className="mt-4 max-h-[min(56dvh,420px)] space-y-2 overflow-y-auto overscroll-contain">
          {OPTIONS.map((option) => (
            <MobileHomeListRow
              key={option.key}
              title={option.title}
              meta={busyKey === option.key ? "Generating…" : option.meta}
              metaTone={busyKey === option.key ? "primary" : "neutral"}
              onClick={() => {
                if (busyKey) return;
                void generate(option);
              }}
            />
          ))}
          {error ? (
            <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-200">
              {error}
            </p>
          ) : null}
          <p className={`px-1 pt-2 ${mobileTokens.mobileHomeHeroSubtext}`}>
            Need a custom layout, slideshow, or interactive viewer? Open this walk on desktop.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}
