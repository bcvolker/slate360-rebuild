import Link from "next/link";
import { FileText, FolderOpen, LayoutTemplate, Users } from "lucide-react";

const items = [
  { label: "Files & SlateDrop", description: "Browse files and shared drops", href: "/slatedrop", icon: FolderOpen },
  { label: "Templates", description: "Punch list templates", href: "/site-walk/setup", icon: LayoutTemplate },
  { label: "Contacts", description: "Project contacts and assignees", href: "/site-walk/setup", icon: Users },
  { label: "Deliverables", description: "Exported reports and docs", href: "/site-walk?tab=deliverables", icon: FileText },
];

export default function SiteWalkMorePage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="mx-auto flex min-h-0 w-full max-w-xl flex-1 flex-col gap-4 overflow-y-auto px-4 py-4 pb-[max(env(safe-area-inset-bottom),1rem)]">
        <h1 className="text-2xl font-black text-white">More</h1>
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
    </div>
  );
}
