import { SlateLogo } from "@/components/shared/SlateLogo";
import { Home, FolderGit2, CalendarCheck2, Inbox, Share2, Layers, Map, AppWindow, Users, Shield, Settings, CreditCard, Settings2, HelpCircle, Lightbulb, Bug } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const NAV_GROUPS = [
  { label: "Command Center", items: [{ icon: Home, label: "Dashboard", href: "#", active: true }, { icon: FolderGit2, label: "Projects", href: "#" }, { icon: CalendarCheck2, label: "Deliverables", href: "#" }, { icon: Inbox, label: "Coordination", href: "#" }] },
  { label: "Files & Sharing", items: [{ icon: Layers, label: "SlateDrop", href: "#" }, { icon: Share2, label: "Shared Links", href: "#" }] },
  { label: "Apps", items: [{ icon: Map, label: "Site Walk", href: "#" }, { icon: AppWindow, label: "Slate360 Twin", href: "#" }] },
  { label: "Organization", items: [{ icon: Users, label: "Team & Access", href: "#" }, { icon: Users, label: "Collaborators", href: "#" }, { icon: Shield, label: "Permissions", href: "#" }] },
  { label: "Admin", items: [{ icon: Settings, label: "Account", href: "#" }, { icon: CreditCard, label: "Billing & Usage", href: "#" }, { icon: Settings2, label: "Ops Console", href: "#" }] },
];

const FOOTER_ITEMS = [
  { icon: HelpCircle, label: "Help", href: "#" },
  { icon: Lightbulb, label: "Suggest Feature", href: "#" },
  { icon: Bug, label: "Report Bug", href: "#" },
];

export function DashboardV3Sidebar() {
  return (
    <aside className="flex w-[270px] flex-col border-r border-white/5 bg-[#0B0F15] h-screen overflow-hidden text-sm">
      <div className="flex h-[68px] shrink-0 items-center px-6">
        <SlateLogo size="md" />
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-hide">
        <div className="space-y-6">
          {NAV_GROUPS.map((g, i) => (
            <div key={i}>
              <div className="mb-2 px-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">{g.label}</div>
              <div className="space-y-0.5">
                {g.items.map((item, j) => (
                  <Link key={j} href={item.href} className={cn("flex cursor-pointer select-none items-center gap-3 rounded-md px-2 py-2 text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-100", item.active && "bg-white/10 text-white font-medium")}>
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-white/5 p-4 space-y-0.5 shrink-0">
        {FOOTER_ITEMS.map((item, i) => (
          <Link key={i} href={item.href} className="flex cursor-pointer select-none items-center gap-3 rounded-md px-2 py-2 text-zinc-400 transition-colors hover:bg-white/5 hover:text-zinc-100">
            <item.icon className="h-4 w-4" />
            <span>{item.label}</span>
          </Link>
        ))}
      </div>
    </aside>
  );
}
