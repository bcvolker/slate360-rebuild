"use client";

import { useState } from "react";
import {
  CheckCircle,
  Clock,
  AlertTriangle,
  ShieldCheck,
  XCircle,
  Minus,
  ChevronDown,
  DollarSign,
  UserCircle,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { SiteWalkItem, ItemStatus, ItemPriority } from "@/lib/types/site-walk";

const STATUS_CONFIG: Record<ItemStatus, { label: string; icon: React.ReactNode; color: string }> = {
  open: { label: "Open", icon: <Clock className="h-3 w-3" />, color: "text-blue-500" },
  in_progress: { label: "In Progress", icon: <Clock className="h-3 w-3 animate-spin" />, color: "text-amber-500" },
  resolved: { label: "Resolved", icon: <CheckCircle className="h-3 w-3" />, color: "text-green-500" },
  verified: { label: "Verified", icon: <ShieldCheck className="h-3 w-3" />, color: "text-emerald-600" },
  closed: { label: "Closed", icon: <XCircle className="h-3 w-3" />, color: "text-muted-foreground" },
  na: { label: "N/A", icon: <Minus className="h-3 w-3" />, color: "text-muted-foreground" },
};

const PRIORITY_BADGE: Record<ItemPriority, string> = {
  low: "bg-slate-100 text-slate-700",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-amber-100 text-amber-700",
  critical: "bg-red-100 text-red-700",
};

const WORKFLOW_LABEL: Record<string, string> = {
  general: "General",
  punch: "Punch",
  inspection: "Inspection",
  proposal: "Proposal",
};

type Props = {
  item: SiteWalkItem;
  index: number;
  onUpdate: (id: string, updates: Record<string, unknown>) => Promise<void>;
  onResolve: (id: string) => Promise<void>;
  onVerify: (id: string) => Promise<void>;
};

export function WorkflowItemCard({ item, index, onUpdate, onResolve, onVerify }: Props) {
  const [busy, setBusy] = useState(false);
  const cfg = STATUS_CONFIG[item.item_status];

  async function act(fn: () => Promise<void>) {
    setBusy(true);
    try { await fn(); } finally { setBusy(false); }
  }

  return (
    <Card className="flex flex-col gap-2 p-3">
      <div className="flex items-start gap-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{item.title || item.item_type}</p>
          {item.description && (
            <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{item.description}</p>
          )}
        </div>
        <div className={`shrink-0 ${cfg.color}`}>{cfg.icon}</div>
      </div>

      {/* Metadata row */}
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        <Badge variant="outline" className="text-[10px]">
          {WORKFLOW_LABEL[item.workflow_type]}
        </Badge>
        <span className={`rounded-full px-1.5 py-0.5 ${PRIORITY_BADGE[item.priority]}`}>
          {item.priority}
        </span>
        <span className={cfg.color}>{cfg.label}</span>
        {item.assigned_to && (
          <span className="flex items-center gap-0.5 text-muted-foreground">
            <UserCircle className="h-3 w-3" /> Assigned
          </span>
        )}
        {item.due_date && (
          <span className="flex items-center gap-0.5 text-muted-foreground">
            <CalendarDays className="h-3 w-3" /> {new Date(item.due_date).toLocaleDateString()}
          </span>
        )}
        {item.cost_estimate != null && (
          <span className="flex items-center gap-0.5 text-muted-foreground">
            <DollarSign className="h-3 w-3" /> {Number(item.cost_estimate).toLocaleString()}
          </span>
        )}
      </div>

      {/* Action row */}
      <div className="flex items-center gap-2">
        <StatusDropdown
          current={item.item_status}
          disabled={busy}
          onChange={(s) => act(() => onUpdate(item.id, { item_status: s }))}
        />
        <PriorityDropdown
          current={item.priority}
          disabled={busy}
          onChange={(p) => act(() => onUpdate(item.id, { priority: p }))}
        />
        {(item.item_status === "open" || item.item_status === "in_progress") && (
          <Button size="sm" variant="outline" disabled={busy} onClick={() => act(() => onResolve(item.id))}>
            Resolve
          </Button>
        )}
        {item.item_status === "resolved" && (
          <Button size="sm" disabled={busy} onClick={() => act(() => onVerify(item.id))}>
            <ShieldCheck className="mr-1 h-3 w-3" /> Verify
          </Button>
        )}
      </div>
    </Card>
  );
}

function StatusDropdown({
  current,
  disabled,
  onChange,
}: {
  current: ItemStatus;
  disabled: boolean;
  onChange: (s: ItemStatus) => void;
}) {
  const statuses: ItemStatus[] = ["open", "in_progress", "resolved", "verified", "closed", "na"];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="ghost" disabled={disabled} className="h-7 text-xs">
          Status <ChevronDown className="ml-1 h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {statuses.map((s) => (
          <DropdownMenuItem key={s} disabled={s === current} onClick={() => onChange(s)}>
            <span className={STATUS_CONFIG[s].color}>{STATUS_CONFIG[s].icon}</span>
            <span className="ml-2">{STATUS_CONFIG[s].label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function PriorityDropdown({
  current,
  disabled,
  onChange,
}: {
  current: ItemPriority;
  disabled: boolean;
  onChange: (p: ItemPriority) => void;
}) {
  const priorities: ItemPriority[] = ["low", "medium", "high", "critical"];
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button size="sm" variant="ghost" disabled={disabled} className="h-7 text-xs">
          <AlertTriangle className="mr-1 h-3 w-3" /> Priority <ChevronDown className="ml-1 h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {priorities.map((p) => (
          <DropdownMenuItem key={p} disabled={p === current} onClick={() => onChange(p)}>
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${PRIORITY_BADGE[p]}`}>{p}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
