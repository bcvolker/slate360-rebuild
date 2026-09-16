"use client";

import { useState } from "react";
import { DashboardDesktopSidebar } from "@/components/dashboard-desktop/DashboardDesktopSidebar";
import { DashboardDesktopTopBar } from "@/components/dashboard-desktop/DashboardDesktopTopBar";
import { ClientProjectPackage } from "@/components/dashboard-desktop/ClientProjectPackage";
import { dashboardDesktopTokens as t } from "@/components/dashboard-desktop/dashboard-tokens";
import type { ClientProjectData } from "@/lib/dashboard/load-client-project";
import { resolveBrandTheme } from "@/lib/spatial-walkthrough/theme";

const brand = resolveBrandTheme({
  snapshot: { logoUrl: "/logo.svg", companyName: "Harbor Point", showPoweredBy: true, logoOpacity: 0.9 },
  canHidePoweredBy: true,
});

const pic = (seed: string) => `https://picsum.photos/seed/${seed}/800/450`;

const FULL: ClientProjectData = {
  project: { id: "p1", name: "Oak Ridge Roof Inspection", location: "Gilbert, AZ" },
  brand,
  scans: [
    {
      date: "2026-09-15",
      chapters: [
        { id: "w3", kind: "walkthrough", title: "Walkthrough", posterUrl: pic("w3"), href: "#", capturedAt: "2026-09-15T16:00:00Z" },
        { id: "t3", kind: "tour", title: "360 Tour on plans", posterUrl: pic("t3"), href: "#", capturedAt: "2026-09-15T16:00:00Z" },
        { id: "s3", kind: "splat", title: "3D model", posterUrl: pic("s3"), href: "#", capturedAt: "2026-09-15T16:00:00Z" },
      ],
    },
    { date: "2026-09-01", chapters: [{ id: "w2", kind: "walkthrough", title: "Walkthrough", posterUrl: pic("w2"), href: "#", capturedAt: "2026-09-01T16:00:00Z" }] },
    { date: "2026-08-17", chapters: [{ id: "w1", kind: "walkthrough", title: "Walkthrough", posterUrl: null, href: "#", capturedAt: "2026-08-17T16:00:00Z" }] },
  ],
  documents: [
    { id: "d1", title: "A-201 Roof plan.pdf", folder: "Drawings", createdAt: "2026-09-10T00:00:00Z", href: "#" },
    { id: "d2", title: "Key plan rev B.pdf", folder: "Drawings", createdAt: "2026-09-08T00:00:00Z", href: "#" },
    { id: "d3", title: "Invoice 0042.pdf", folder: "Contracts", createdAt: "2026-09-15T00:00:00Z", href: "#" },
  ],
  questions: [
    { id: "q1", title: "Is the drain per detail 5/A-501?", status: "open", href: "#" },
    { id: "q2", title: "Confirm parapet flashing height", status: "answered", href: "#" },
  ],
  askHref: "#",
};

const SPARSE: ClientProjectData = {
  project: { id: "p2", name: "Mesa Warehouse", location: null },
  brand: resolveBrandTheme({ snapshot: { showPoweredBy: true }, canHidePoweredBy: true }),
  scans: [{ date: "2026-09-12", chapters: [{ id: "w9", kind: "walkthrough", title: "Walkthrough", posterUrl: pic("w9"), href: "#", capturedAt: "2026-09-12T16:00:00Z" }] }],
  documents: [],
  questions: [],
  askHref: "#",
};

export default function ClientProjectPreview() {
  const [collapsed, setCollapsed] = useState(false);
  const [variant, setVariant] = useState<"full" | "sparse" | "empty">("full");
  const data = variant === "full" ? FULL : variant === "sparse" ? SPARSE : { ...SPARSE, scans: [], askHref: null };
  return (
    <div className={`flex h-[100dvh] ${t.canvas}`}>
      <DashboardDesktopSidebar isCeo={false} showOpsConsole={false} collapsed={collapsed} onToggleCollapse={() => setCollapsed((c) => !c)} />
      <div className={t.main}>
        <DashboardDesktopTopBar userName="Contractor Client" shellApp="dashboard" twinVisible={false} onOpenCommand={() => {}} />
        <main className={t.content}>
          <div className="mb-3 flex gap-2">
            {(["full", "sparse", "empty"] as const).map((v) => (
              <button key={v} type="button" onClick={() => setVariant(v)} className={`rounded-md border px-2 py-1 text-xs ${v === variant ? "border-[var(--mkt-accent)] text-[var(--mkt-accent)]" : "border-[var(--mkt-line)] text-[var(--mkt-ink-muted)]"}`}>
                {v}
              </button>
            ))}
          </div>
          <ClientProjectPackage data={data} />
        </main>
      </div>
    </div>
  );
}
