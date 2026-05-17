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
    <div className="flex items-center gap-3">
      {TOOLS.map((t, i) => (
        <Button key={i} variant="outline" size="sm" className="h-9 gap-2 border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white" disabled>
          <t.icon className="h-4 w-4" />
          {t.label}
        </Button>
      ))}
    </div>
  );
}
