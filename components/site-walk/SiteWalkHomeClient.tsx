"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Camera, FileText, FolderOpen } from "lucide-react";
import { SiteWalkShell } from "@/components/site-walk/SiteWalkShell";
import { buildCaptureLaunchUrl } from "@/lib/site-walk/capture-v2-config";
import type { HubProject, HubSummary, HubWalk } from "@/lib/types/site-walk";
import type { HubDeliverableRow } from "@/lib/types/site-walk-hub";

type Props = {
  orgName: string | null;
  projects: HubProject[];
  walks: HubWalk[];
  summary: HubSummary;
  deliverables: HubDeliverableRow[];
};

export function SiteWalkHomeClient({ orgName, projects, walks, summary, deliverables }: Props) {
  const router = useRouter();

  async function handleQuickCapture() {
    const dateLabel = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const res = await fetch("/api/site-walk/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: `Quick Walk — ${dateLabel}`,
        session_type: "general",
        metadata: { started_at: new Date().toISOString(), started_from: "hub_quick" },
      }),
    });
    if (!res.ok) return;
    const body = (await res.json()) as { session?: { id?: string } };
    if (!body.session?.id) return;
    router.push(buildCaptureLaunchUrl({ session: body.session.id, quick: "camera" }));
  }

  return (
    <SiteWalkShell orgName={orgName}>
      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto p-4 pb-24">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-[#A3AED0]">Site Walk</p>
          <h1 className="mt-2 text-2xl font-semibold text-[#FFFFFF]">
            {orgName ? `${orgName} · Field Hub` : "Site Walk Hub"}
          </h1>
          <p className="mt-3 text-sm text-[#F8FAFC]">
            Single-handed field tracking, predictive tag chips classification, and instant document
            deliverable field report compilation.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => void handleQuickCapture()}
            className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 text-left transition-all hover:bg-white/[0.04] active:scale-[0.99]"
          >
            <Camera className="h-5 w-5 text-[#00E699]" />
            <span className="font-medium text-[#FFFFFF]">Start Quick Capture</span>
          </button>
          <Link
            href="/site-walk/walks"
            className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 transition-all hover:bg-white/[0.04]"
          >
            <FolderOpen className="h-5 w-5 text-[#00E699]" />
            <span className="font-medium text-[#FFFFFF]">Open Walk Sessions</span>
          </Link>
          <Link
            href="/site-walk/deliverables"
            className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 transition-all hover:bg-white/[0.04]"
          >
            <FileText className="h-5 w-5 text-[#00E699]" />
            <span className="font-medium text-[#FFFFFF]">Deliverables</span>
          </Link>
          <Link
            href="/design-studio"
            className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4 transition-all hover:bg-white/[0.04]"
          >
            <ArrowRight className="h-5 w-5 text-[#00E699]" />
            <span className="font-medium text-[#FFFFFF]">Digital Twins</span>
          </Link>
        </div>

        <section className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-[#FFFFFF]">Recent Walks</h2>
            <span className="text-xs text-[#A3AED0]">{walks.length} total</span>
          </div>
          <ul className="mt-4 space-y-3">
            {walks.slice(0, 5).map((walk) => (
              <li key={walk.id}>
                <Link
                  href={`/site-walk/walks/${walk.id}`}
                  className="flex items-center justify-between rounded-xl border border-white/[0.05] px-3 py-2 text-sm transition-colors hover:bg-white/[0.03]"
                >
                  <span className="truncate text-[#F8FAFC]">{walk.title}</span>
                  <span className="shrink-0 text-xs text-[#A3AED0]">{walk.itemCount} items</span>
                </Link>
              </li>
            ))}
            {walks.length === 0 ? (
              <li className="text-sm text-[#A3AED0]">No walks yet. Start a quick capture to begin.</li>
            ) : null}
          </ul>
        </section>

        <section className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-[#FFFFFF]">Projects</h2>
            <span className="text-xs text-[#A3AED0]">{projects.length} active</span>
          </div>
          <ul className="mt-4 space-y-3">
            {projects.slice(0, 4).map((project) => (
              <li key={project.id} className="text-sm text-[#F8FAFC]">
                {project.name}
              </li>
            ))}
            {projects.length === 0 ? (
              <li className="text-sm text-[#A3AED0]">No projects linked yet.</li>
            ) : null}
          </ul>
        </section>

        {deliverables.length > 0 ? (
          <section className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
            <h2 className="text-sm font-semibold text-[#FFFFFF]">Recent Deliverables</h2>
            <ul className="mt-4 space-y-3">
              {deliverables.slice(0, 4).map((item) => (
                <li key={item.id} className="text-sm text-[#F8FAFC]">
                  {item.title}
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </SiteWalkShell>
  );
}
