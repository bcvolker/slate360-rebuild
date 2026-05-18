import { Map, FileText, QrCode, Share2, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";

const TOOLS = [
  { icon: Map, label: "Map Snapshot" },
  { icon: FileText, label: "PDF Tools" },
  { icon: QrCode, label: "Quick-Drop QR" },
  { icon: Share2, label: "Share Package" },
  { icon: MoreHorizontal, label: "More Tools" },
];

export function DashboardV3ToolsLauncher() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      {TOOLS.map((t, i) => (
        <Button 
          key={i} 
          variant="outline" 
          size="sm" 
          className="h-10 px-4 gap-2.5 border-white/10 bg-[#131820] text-zinc-300 hover:bg-white/5 hover:text-white transition-colors cursor-pointer"
          aria-disabled="true"
        >
          <t.icon className="h-4 w-4 text-amber-500" />
          <span className="font-medium">{t.label}</span>
        </Button>
      ))}
    </div>
  );
}
