"use client";

import { Building2, MapPin, X } from "lucide-react";

interface ProjectTypeChoiceSheetProps {
  open: boolean;
  onClose: () => void;
  onSelectField: () => void;
  onSelectFull: () => void;
}

/**
 * Dark Glass modal shown to Business/Enterprise users when they click
 * "New Project". Lets them choose between a Site Visit and a full Project.
 * Trial/Standard users never see this — the wizard opens directly as Field.
 */
export function ProjectTypeChoiceSheet({
  open,
  onClose,
  onSelectField,
  onSelectFull,
}: ProjectTypeChoiceSheetProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-[#0B0F15]/95 shadow-2xl text-white overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <div>
            <h3 className="text-lg font-black">New Project</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Choose the project type to get started</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-white/[0.06] hover:text-white transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Choice cards */}
        <div className="p-5 flex flex-col gap-3">
          <button
            onClick={onSelectField}
            className="group flex items-start gap-4 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-4 text-left hover:border-[#3B82F6]/60 hover:bg-[#3B82F6]/[0.08] transition-all"
          >
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#0EA5E9]/20 text-[#0EA5E9] group-hover:bg-[#0EA5E9]/30 transition-colors">
              <MapPin size={18} />
            </span>
            <div>
              <p className="font-bold text-sm text-white">Site Visit</p>
              <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                Site Walk sessions, plans, deliverables, and collaborator submissions.
                The fastest way to start capturing on-site context.
              </p>
            </div>
          </button>

          <button
            onClick={onSelectFull}
            className="group flex items-start gap-4 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-4 text-left hover:border-[#7C3AED]/60 hover:bg-[#7C3AED]/[0.08] transition-all"
          >
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#7C3AED]/20 text-[#7C3AED] group-hover:bg-[#7C3AED]/30 transition-colors">
              <Building2 size={18} />
            </span>
            <div>
              <p className="font-bold text-sm text-white">Full Project</p>
              <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
                Everything in a Site Visit, plus schedules, budgets, RFIs, submittals,
                and the full SlateDrop folder tree.
              </p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
