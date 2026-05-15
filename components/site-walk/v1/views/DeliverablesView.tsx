"use client";

import {
  Plus,
  FileText,
  Camera,
  Eye,
  Globe,
  CuboidIcon,
  Clock,
  FileDown,
  CheckSquare,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RouterLike } from "./v1-view-utils";

const categories: { icon: typeof FileText; label: string }[] = [
  { icon: Eye, label: "Visual Walk Summary" },
  { icon: CheckSquare, label: "Punch / Issue Package" },
  { icon: FileText, label: "Proposal Package" },
  { icon: Camera, label: "Before & After" },
  { icon: Clock, label: "Progress Timeline" },
  { icon: Globe, label: "360 Tour" },
  { icon: CuboidIcon, label: "3D Model Review" },
  { icon: Package, label: "Closeout Record" },
  { icon: FileDown, label: "PDF Export" },
];

export function DeliverablesView({ router }: { router: RouterLike }) {
  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-zinc-300">Deliverables</p>
        <Button
          size="sm"
          className="gap-1.5 rounded-lg bg-amber-600 text-white hover:bg-amber-700"
          onClick={() => router.push("/site-walk/deliverables")}
        >
          <Plus className="size-3.5" />
          Create Deliverable
        </Button>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wider text-zinc-600">
          Deliverable types
        </p>
        <div className="flex flex-wrap gap-2">
          {categories.map(({ icon: Icon, label }) => (
            <button
              key={label}
              type="button"
              onClick={() => router.push("/site-walk/deliverables")}
              className="flex items-center gap-1.5 rounded-lg border border-white/5 bg-white/[0.03] px-2.5 py-1.5 text-xs font-medium text-zinc-400 transition-colors hover:border-amber-500/20 hover:bg-white/[0.06] hover:text-zinc-200"
            >
              <Icon className="size-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={() => router.push("/site-walk/deliverables")}
        className="mt-2 rounded-lg border border-white/5 bg-white/[0.03] px-4 py-3 text-left text-sm text-zinc-300 transition-colors hover:bg-white/[0.06]"
      >
        View all deliverables →
      </button>
    </div>
  );
}
