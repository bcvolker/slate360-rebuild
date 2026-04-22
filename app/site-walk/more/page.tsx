import { MoreHorizontal, Map, LayoutTemplate, Palette, FolderKanban, Eye } from "lucide-react";
import Link from "next/link";
import { resolveServerOrgContext } from "@/lib/server/org-context";

export const metadata = { title: "More — Site Walk" };
export const dynamic = "force-dynamic";

// Only entries with real implementations are listed. Items previously in this
// list (Contacts, Assignments standalone, generic Settings) routed to 404
// shells and have been removed until their pages ship. Assignments live on the
// project dashboard inbox.
const SECTIONS = [
  { label: "Plans", href: "/site-walk/more/plans", icon: Map, desc: "Upload plans, pin photos to plan locations" },
  { label: "Templates", href: "/site-walk/more/templates", icon: LayoutTemplate, desc: "Reusable session and deliverable templates" },
  { label: "Branding", href: "/site-walk/more/branding", icon: Palette, desc: "Logo, colors, email signature for deliverables" },
  { label: "Project defaults", href: "/site-walk/more/projects", icon: FolderKanban, desc: "Per-project info that auto-fills into deliverables" },
];

export default async function MorePage() {
  const ctx = await resolveServerOrgContext();
  const showLeadership = ctx.isAdmin || ctx.isViewer || ctx.isSlateCeo;
  const sections = showLeadership
    ? [
        ...SECTIONS,
        {
          label: "Leadership view",
          href: "/site-walk/admin",
          icon: Eye,
          desc: "All projects and walks across your organization (read-only).",
        },
      ]
    : SECTIONS;
  return (
    <div className="min-h-[calc(100vh-160px)] px-4 py-6 max-w-4xl mx-auto">
      <header className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-xl bg-cobalt/15 border border-cobalt/30 flex items-center justify-center">
            <MoreHorizontal className="h-5 w-5 text-cobalt" />
          </div>
          <h1 className="text-xl font-semibold text-white">More</h1>
        </div>
        <p className="text-sm text-slate-400">Plans, templates, contacts, branding, and settings.</p>
      </header>

      <ul className="space-y-2">
        {sections.map(({ label, href, icon: Icon, desc }) => (
          <li key={href}>
            <Link
              href={href}
              className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-4 hover:bg-white/[0.04] hover:border-cobalt/30 transition-colors"
            >
              <div className="h-10 w-10 rounded-lg bg-cobalt/10 flex items-center justify-center flex-shrink-0">
                <Icon className="h-5 w-5 text-cobalt" />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium text-white">{label}</div>
                <div className="text-xs text-slate-400 mt-0.5">{desc}</div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
