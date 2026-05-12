import Link from "next/link";
import { FileText, FolderOpen, LayoutTemplate, Users } from "lucide-react";

const items = [
  { label: "Files & SlateDrop", description: "Browse files and shared drops", href: "/site-walk/slatedrop", icon: FolderOpen },
  { label: "Templates", description: "Punch list templates", href: "/site-walk/setup", icon: LayoutTemplate },
  { label: "Contacts", description: "Project contacts and assignees", href: "/site-walk/setup", icon: Users },
  { label: "Deliverables", description: "Exported reports and docs", href: "/site-walk/deliverables", icon: FileText },
];

export default function SiteWalkMorePage() {
  return (
    <main className="min-h-[calc(100dvh-96px)] bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.14),transparent_34%),#0B0F15] px-4 py-4 text-slate-50 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-xl space-y-4">
        <h1 className="text-2xl font-black">More</h1>
        <div className="space-y-2">
          {items.map(({ label, description, href, icon: Icon }) => (
            <Link
              key={href + label}
              href={href}
              className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-left transition hover:border-amber-400/40 hover:bg-white/[0.07]"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.08] text-amber-400">
                <Icon className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="font-black text-white">{label}</p>
                <p className="text-xs font-bold text-slate-400">{description}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
