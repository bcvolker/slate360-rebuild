"use client";

import React, { useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { StatusBadge } from "@/components/dashboard/market/MarketSharedUi";
import { detectAutomationPreset, getAutomationPresetLabel } from "@/lib/market/automation-presets";
import type { AutomationPlan } from "@/components/dashboard/market/types";

interface MarketPlanListProps {
  plans: AutomationPlan[];
  onEdit: (id: string) => void;
  onClone: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onArchive: (id: string) => void;
  onSetDefault: (id: string) => void;
  onDelete: (id: string) => void;
  onApply: (plan: AutomationPlan) => void;
}

export default function MarketPlanList({
  plans, onEdit, onClone, onRename, onArchive, onSetDefault, onDelete, onApply,
}: MarketPlanListProps) {
  const activePlans = plans.filter(p => !p.isArchived);
  const archivedPlans = plans.filter(p => p.isArchived);
  const [showArchived, setShowArchived] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const startRename = (p: AutomationPlan) => {
    setRenamingId(p.id);
    setRenameValue(p.name);
  };

  const commitRename = () => {
    if (renamingId && renameValue.trim()) {
      onRename(renamingId, renameValue.trim());
    }
    setRenamingId(null);
    setRenameValue("");
  };

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-slate-200">
        Saved Plans ({activePlans.length})
        {archivedPlans.length > 0 && (
          <button onClick={() => setShowArchived(v => !v)}
            className="ml-2 text-xs text-slate-500 font-normal hover:text-slate-300">
            {showArchived ? "Hide" : "Show"} archived ({archivedPlans.length})
          </button>
        )}
      </h3>

      {activePlans.length === 0 && (
        <div className="border border-zinc-800 bg-zinc-950/70 rounded-2xl p-6 text-center text-slate-500 text-sm">
          No saved plans yet. Create one using the builder.
        </div>
      )}

      {activePlans.map(plan => (
        <PlanCard key={plan.id} plan={plan}
          renamingId={renamingId} renameValue={renameValue}
          onRenameValueChange={setRenameValue} onStartRename={startRename}
          onCommitRename={commitRename}
          onEdit={onEdit} onClone={onClone} onArchive={onArchive}
          onSetDefault={onSetDefault} onDelete={onDelete} onApply={onApply} />
      ))}

      {showArchived && archivedPlans.map(plan => (
        <PlanCard key={plan.id} plan={plan} archived
          renamingId={renamingId} renameValue={renameValue}
          onRenameValueChange={setRenameValue} onStartRename={startRename}
          onCommitRename={commitRename}
          onEdit={onEdit} onClone={onClone} onArchive={onArchive}
          onSetDefault={onSetDefault} onDelete={onDelete} onApply={onApply} />
      ))}
    </div>
  );
}

function PlanCard({ plan, archived, renamingId, renameValue, onRenameValueChange, onStartRename, onCommitRename, onEdit, onClone, onArchive, onSetDefault, onDelete, onApply }: {
  plan: AutomationPlan;
  archived?: boolean;
  renamingId: string | null;
  renameValue: string;
  onRenameValueChange: (v: string) => void;
  onStartRename: (p: AutomationPlan) => void;
  onCommitRename: () => void;
  onEdit: (id: string) => void;
  onClone: (id: string) => void;
  onArchive: (id: string) => void;
  onSetDefault: (id: string) => void;
  onDelete: (id: string) => void;
  onApply: (plan: AutomationPlan) => void;
}) {
  const isRenaming = renamingId === plan.id;
  const matchedPreset = detectAutomationPreset(plan);
  return (
    <div className={`border border-zinc-800 bg-zinc-900/80 rounded-2xl p-4 ${archived ? "opacity-60" : ""}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          {isRenaming ? (
            <div className="flex gap-1">
              <input type="text" value={renameValue}
                onChange={e => onRenameValueChange(e.target.value)}
                onKeyDown={e => e.key === "Enter" && onCommitRename()}
                className="flex-1 bg-zinc-950/80 border border-zinc-700 rounded-lg px-2 py-1 text-sm text-slate-100 outline-none focus:border-[#FF4D00]"
                autoFocus />
              <button onClick={onCommitRename} className="text-xs text-green-400 hover:text-green-300 px-1">✓</button>
            </div>
          ) : (
            <p className="text-sm font-semibold text-slate-100 truncate">{plan.name}</p>
          )}
          <p className="text-xs text-slate-500 mt-0.5">
            ${plan.budget} · {plan.riskLevel} · {plan.maxTradesPerDay}/day · {plan.scanMode} scan
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Preset: {matchedPreset ? getAutomationPresetLabel(matchedPreset) : "Custom"}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Loss cap ${plan.maxDailyLoss} · {plan.maxOpenPositions} positions · {plan.categories.join(", ")}
          </p>
        </div>
        <div className="flex gap-1 shrink-0">
          {plan.mode === "practice" && (
            <span className="text-[10px] bg-purple-500/15 text-purple-200 border border-purple-400/25 px-1.5 py-0.5 rounded-full">Practice</span>
          )}
          {plan.isDefault && (
            <span className="text-[10px] bg-orange-500/15 text-orange-200 border border-orange-400/25 px-1.5 py-0.5 rounded-full">Default</span>
          )}
          <StatusBadge status={plan.riskLevel} />
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={() => onApply(plan)}
              className="bg-[#FF4D00] hover:bg-orange-600 text-white text-xs py-1.5 px-3 rounded-lg font-medium transition">
              ▶ Save + Start Robot
            </button>
          </TooltipTrigger>
          <TooltipContent>Apply this saved plan, request runtime start, and run a scan now.</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={() => onEdit(plan.id)} className="px-2 py-1.5 bg-slate-800 hover:bg-zinc-800 text-slate-400 text-xs rounded-lg transition">✏️</button>
          </TooltipTrigger>
          <TooltipContent>Edit plan</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={() => onClone(plan.id)} className="px-2 py-1.5 bg-slate-800 hover:bg-zinc-800 text-slate-400 text-xs rounded-lg transition">📋</button>
          </TooltipTrigger>
          <TooltipContent>Duplicate plan</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={() => onStartRename(plan)} className="px-2 py-1.5 bg-slate-800 hover:bg-zinc-800 text-slate-400 text-xs rounded-lg transition">✍️</button>
          </TooltipTrigger>
          <TooltipContent>Rename</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={() => onSetDefault(plan.id)} className="px-2 py-1.5 bg-slate-800 hover:bg-zinc-800 text-slate-400 text-xs rounded-lg transition">⭐</button>
          </TooltipTrigger>
          <TooltipContent>Set as default</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={() => onArchive(plan.id)} className="px-2 py-1.5 bg-slate-800 hover:bg-zinc-800 text-slate-400 text-xs rounded-lg transition">
              {archived ? "📤" : "📥"}
            </button>
          </TooltipTrigger>
          <TooltipContent>{archived ? "Unarchive" : "Archive"}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={() => onDelete(plan.id)} className="px-2 py-1.5 bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-400/25 text-xs rounded-lg transition">🗑</button>
          </TooltipTrigger>
          <TooltipContent>Delete plan</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
