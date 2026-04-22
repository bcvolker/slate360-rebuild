/**
 * Site Walk developer / preview map.
 *
 * One page with every Site Walk surface as a clickable link, organised by
 * the user journey. Lets the operator click through the whole product to
 * confirm UX. Visible only to admins / Slate CEO so it doesn't leak in beta.
 */

import Link from "next/link";
import { redirect } from "next/navigation";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { ArrowLeft, ExternalLink } from "lucide-react";

export const metadata = { title: "Site Walk — Walkthrough Map" };
export const dynamic = "force-dynamic";

type Sample = {
  projectId: string | null;
  projectName: string | null;
  sessionId: string | null;
  sessionTitle: string | null;
  itemId: string | null;
  deliverableId: string | null;
  deliverableToken: string | null;
};

async function getSamples(orgId: string): Promise<Sample> {
  const admin = createAdminClient();

  const [projRes, sessRes, itemRes, delRes] = await Promise.all([
    admin
      .from("projects")
      .select("id, name")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from("site_walk_sessions")
      .select("id, title")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from("site_walk_items")
      .select("id")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from("site_walk_deliverables")
      .select("id, share_token")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return {
    projectId: (projRes.data?.id as string | null) ?? null,
    projectName: (projRes.data?.name as string | null) ?? null,
    sessionId: (sessRes.data?.id as string | null) ?? null,
    sessionTitle: (sessRes.data?.title as string | null) ?? null,
    itemId: (itemRes.data?.id as string | null) ?? null,
    deliverableId: (delRes.data?.id as string | null) ?? null,
    deliverableToken: (delRes.data?.share_token as string | null) ?? null,
  };
}

export default async function SiteWalkMapPage() {
  const ctx = await resolveServerOrgContext();
  if (!ctx.user) redirect("/login?next=/site-walk/dev/map");
  if (!ctx.orgId) redirect("/site-walk/walks");
  if (!ctx.isAdmin && !ctx.isSlateCeo) redirect("/site-walk/walks");

  const s = await getSamples(ctx.orgId);

  const sections: { title: string; links: { label: string; href: string; note?: string; live?: boolean }[] }[] = [
    {
      title: "1 — Discovery & home",
      links: [
        { label: "Project Hub (all projects)", href: "/projects" },
        { label: "Site Walk landing", href: "/site-walk/walks" },
        { label: "More menu", href: "/site-walk/more" },
      ],
    },
    {
      title: "2 — Per-project dashboard",
      links: s.projectId
        ? [
            {
              label: `Project Site Walk dashboard — ${s.projectName ?? s.projectId}`,
              href: `/site-walk/projects/${s.projectId}`,
              note: "Counts + Field↔Office inbox",
            },
            { label: "Project Hub detail", href: `/projects/${s.projectId}` },
          ]
        : [{ label: "(no projects yet — create one to populate this section)", href: "/projects" }],
    },
    {
      title: "3 — Live walk capture",
      links: s.sessionId
        ? [
            {
              label: `Active capture screen — ${s.sessionTitle ?? s.sessionId}`,
              href: `/site-walk/walks/active/${s.sessionId}`,
              note: "Camera, voice, text, items feed",
              live: true,
            },
            {
              label: "Browse all items in this walk",
              href: `/site-walk/walks/active/${s.sessionId}/items`,
              note: "NEW — search, filter, edit, delete",
            },
            {
              label: "Generate status report",
              href: `/site-walk/walks/active/${s.sessionId}/status-report`,
              note: "NEW — auto-build leadership update",
            },
            ...(s.itemId
              ? [
                  {
                    label: "Item detail page",
                    href: `/site-walk/walks/active/${s.sessionId}/items/${s.itemId}`,
                  },
                  {
                    label: "Item annotate (note + persistent thumbnail)",
                    href: `/site-walk/walks/active/${s.sessionId}/items/${s.itemId}/annotate`,
                  },
                  {
                    label: "Item markup (draw on photo)",
                    href: `/site-walk/walks/active/${s.sessionId}/items/${s.itemId}/markup`,
                  },
                ]
              : []),
          ]
        : [{ label: "(no walks yet — start one from a project)", href: "/site-walk/walks" }],
    },
    {
      title: "4 — Deliverables & sharing",
      links: [
        { label: "Deliverables list", href: "/site-walk/deliverables" },
        ...(s.deliverableId
          ? [
              {
                label: "Deliverable detail (build / share / send email)",
                href: `/site-walk/deliverables/${s.deliverableId}`,
              },
            ]
          : []),
        ...(s.deliverableToken
          ? [
              {
                label: "Public viewer (no-auth, Zoom-shareable)",
                href: `/view/${s.deliverableToken}`,
                note: "Recipient comments + Approve / Needs change / Question",
                live: true,
              },
            ]
          : [{ label: "(no shared deliverables yet)", href: "/site-walk/deliverables" }]),
      ],
    },
    {
      title: "5 — Leadership / org-wide",
      links: [
        {
          label: "Leadership view (all projects, all walks)",
          href: "/site-walk/admin",
          note: "ASU directors get this in beta",
        },
      ],
    },
    {
      title: "6 — Settings & branding (More menu)",
      links: [
        { label: "Plans (upload site plans)", href: "/site-walk/more/plans" },
        { label: "Templates (reusable deliverable presets)", href: "/site-walk/more/templates" },
        { label: "Branding (logo + signature)", href: "/site-walk/more/branding" },
        { label: "Project defaults", href: "/site-walk/more/projects" },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-slate-100">
      <header className="border-b border-white/10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/site-walk/walks" className="p-2 -ml-2 rounded-md hover:bg-white/5" aria-label="Back">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-slate-500">Internal</p>
            <h1 className="text-lg font-semibold">Site Walk — Walkthrough Map</h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-8">
        <div className="rounded-xl border border-cobalt/30 bg-cobalt/10 p-4 text-sm text-slate-200">
          Click anything below to preview the live page. Sample IDs are pulled from the
          most-recent project / walk / deliverable in your org so the deep links work end-to-end.
        </div>

        {sections.map((section) => (
          <section key={section.title} className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">{section.title}</h2>
            <ul className="space-y-1.5">
              {section.links.map((link) => (
                <li key={link.href + link.label}>
                  <Link
                    href={link.href}
                    className="flex items-start justify-between gap-3 rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 hover:border-cobalt/40 hover:bg-white/[0.04] transition-colors"
                  >
                    <div className="min-w-0">
                      <p className="text-sm text-slate-100 font-medium flex items-center gap-2">
                        {link.label}
                        {link.live && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-normal">
                            new
                          </span>
                        )}
                      </p>
                      {link.note && <p className="text-xs text-slate-500 mt-0.5">{link.note}</p>}
                      <p className="text-[11px] text-slate-600 mt-0.5 font-mono truncate">{link.href}</p>
                    </div>
                    <ExternalLink className="h-4 w-4 text-slate-500 shrink-0 mt-1" />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </main>
    </div>
  );
}
