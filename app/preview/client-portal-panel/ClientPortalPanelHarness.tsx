"use client";

import { useState } from "react";
import { ClientPortalPanel } from "@/components/spatial-walkthrough/portal/ClientPortalPanel";

const ROWS = [
  { id: "walkthrough", label: "Walkthrough", included: true, ready: true, note: "1 walkthrough ready" },
  { id: "stations", label: "360 photos", included: true, ready: true, note: "Published station tour" },
  { id: "twin", label: "3D Scan", included: true, ready: false, note: "Waiting on QA acceptance" },
  { id: "evidence", label: "Documents", included: true, ready: true, note: "3 documents on client items" },
  { id: "issues", label: "Items", included: false, ready: true, note: "1 client-visible item" },
];

/** Installs a fetch mock for this harness's fake project before the panel mounts. */
export function ClientPortalPanelHarness({ state }: { state: "ready" | "no-walkthrough" }) {
  useState(() => {
    if (typeof window === "undefined") return null;
    let saved = new Set(ROWS.filter((r) => r.included).map((r) => r.id));
    const real = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (url.includes("/api/projects/harness/portal-package")) {
        if (init?.method === "PUT") {
          saved = new Set((JSON.parse(String(init.body)) as { deliverables: string[] }).deliverables);
          return Response.json({ deliverables: [...saved] });
        }
        return Response.json({
          enabled: true,
          canPreview: state === "ready",
          deliverables: ROWS.map((r) => ({ ...r, included: saved.has(r.id) })),
        });
      }
      if (url.includes("/api/projects/harness/portal-preview")) {
        return Response.json({ url: "/preview/monday-portal?theme=client", expiresInMinutes: 30 });
      }
      return real(input, init);
    };
    return null;
  });
  return <ClientPortalPanel projectId="harness" />;
}
