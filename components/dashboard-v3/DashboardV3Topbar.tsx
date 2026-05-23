import { Search, Bell, User } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DashboardV3Topbar({ roleName = "Member" }: { roleName?: string }) {
  return (
    <header className="relative z-20 flex h-[68px] shrink-0 items-center justify-between border-b border-white/5 bg-[#0B0F15] px-7">
      <div className="flex items-center gap-4 pl-12">
        <div className="text-lg font-medium tracking-tight text-[#F8FAFC]">Overview</div>
        <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/70">{roleName}</div>
      </div>
      <div className="relative z-20 flex items-center gap-4">
        <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white rounded-full border-0 focus-visible:ring-1">
          <Search className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white rounded-full border-0 focus-visible:ring-1">
          <Bell className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full border border-white/10 bg-white/5 p-0 focus-visible:ring-1">
          <User className="h-4 w-4 text-zinc-300" />
        </Button>
      </div>
    </header>
  );
}
