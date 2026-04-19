"use client";

import { AlertTriangle, Loader2, Trash2, X } from "lucide-react";

type DeleteTarget = { id: string; name: string } | null;

type Props = {
  target: DeleteTarget;
  confirmName: string;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onConfirmNameChange: (value: string) => void;
  onDelete: () => void;
};

export default function ProjectHubDeleteModal({
  target,
  confirmName,
  loading,
  error,
  onClose,
  onConfirmNameChange,
  onDelete,
}: Props) {
  if (!target) {
    return null;
  }

  const deleteDisabled = loading || confirmName.trim() !== target.name;

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="fixed inset-0 z-[61] flex items-center justify-center p-4">
        <div
          className="w-full max-w-md rounded-2xl border border-app bg-app-card shadow-2xl overflow-hidden"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="bg-red-950/50 border-b border-red-900/50 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-900/50 flex items-center justify-center">
                <AlertTriangle size={20} className="text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Delete Project</h3>
                <p className="text-xs text-zinc-400">This action cannot be undone</p>
              </div>
            </div>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/[0.04] transition-colors">
              <X size={18} className="text-zinc-400" />
            </button>
          </div>

          <div className="px-6 py-5 space-y-4">
            <div className="rounded-xl border border-app bg-white/[0.04] p-4">
              <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-1">Project to delete</p>
              <p className="text-sm font-black text-white">{target.name}</p>
            </div>

            <div className="text-sm text-zinc-300 space-y-2">
              <p>
                Deleting this project will <span className="font-bold text-red-400">permanently</span> remove:
              </p>
              <ul className="text-xs text-zinc-400 space-y-1 ml-4 list-disc">
                <li>All project files, folders, and uploads</li>
                <li>RFIs, submittals, daily logs, and punch list items</li>
                <li>Budget data, schedule, and stakeholder records</li>
                <li>All team member associations</li>
              </ul>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                Type <span className="font-black text-red-400">{target.name}</span> to confirm
              </label>
              <input
                type="text"
                value={confirmName}
                onChange={(event) => onConfirmNameChange(event.target.value)}
                placeholder="Enter project name..."
                className="w-full rounded-lg border border-app bg-white/[0.04] px-3 py-2 text-sm text-white placeholder-zinc-500 focus:border-red-500 focus:ring-2 focus:ring-red-900/50 outline-none transition-all"
                autoFocus
              />
            </div>

            {error && (
              <p className="text-xs font-semibold text-red-400 bg-red-950/50 rounded-lg px-3 py-2">{error}</p>
            )}
          </div>

          <div className="border-t border-app px-6 py-4 flex items-center justify-end gap-3 bg-white/[0.04]/50">
            <button
              onClick={onClose}
              className="rounded-xl border border-app bg-white/[0.04] px-4 py-2 text-sm font-semibold text-zinc-300 hover:bg-white/[0.06] transition-all"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              onClick={onDelete}
              disabled={deleteDisabled}
              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="animate-spin" /> Deleting...
                </>
              ) : (
                <>
                  <Trash2 size={14} /> Delete Permanently
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
