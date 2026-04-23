"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, ChevronDown, Loader2, Trash2 } from "lucide-react";

interface Props {
  projectId: string;
  projectName: string;
  showToast: (msg: string) => void;
}

export default function ManagementDangerZone({ projectId, projectName, showToast }: Props) {
  const router = useRouter();
  const [showDeleteZone, setShowDeleteZone] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDeleteProject = async () => {
    if (!projectName) return;
    if (deleteConfirmName.trim() !== projectName) {
      setDeleteError("Project name does not match. Please type the exact name.");
      return;
    }
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmText: "DELETE", confirmName: deleteConfirmName.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setDeleteError(data.error || "Failed to delete project."); return; }
      router.push("/project-hub");
    } catch { setDeleteError("Network error. Please try again."); }
    finally { setDeleteLoading(false); }
  };

  return (
    <div className="rounded-2xl border border-red-200 bg-white shadow-sm overflow-hidden">
      <button onClick={() => setShowDeleteZone(!showDeleteZone)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-red-50/50 transition-colors">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-red-50 flex items-center justify-center"><AlertTriangle size={16} className="text-red-600" /></div>
          <div className="text-left">
            <h3 className="text-sm font-black text-red-700">Danger Zone</h3>
            <p className="text-xs text-gray-500">Irreversible actions for this project</p>
          </div>
        </div>
        <ChevronDown size={16} className={`text-gray-400 transition-transform ${showDeleteZone ? "rotate-180" : ""}`} />
      </button>

      {showDeleteZone && (
        <div className="border-t border-red-100 px-5 py-5 space-y-4 bg-red-50/30">
          <div className="rounded-xl border border-red-200 bg-white p-4 space-y-4">
            <div>
              <h4 className="text-sm font-bold text-gray-900">Delete this project</h4>
              <p className="text-xs text-gray-500 mt-1">
                Once deleted, all project data — files, RFIs, submittals, schedules, budgets, daily logs, punch lists, and team records — will be <span className="font-bold text-red-600">permanently removed</span>.
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Type <span className="font-black text-red-600">{projectName || "the project name"}</span> to confirm
              </label>
              <input type="text" value={deleteConfirmName}
                onChange={(e) => { setDeleteConfirmName(e.target.value); setDeleteError(null); }}
                placeholder="Enter project name..."
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none transition-all" />
            </div>
            {deleteError && <p className="text-xs font-semibold text-red-600 bg-red-50 rounded-lg px-3 py-2">{deleteError}</p>}
            <button onClick={handleDeleteProject}
              disabled={deleteLoading || !projectName || deleteConfirmName.trim() !== projectName}
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-foreground hover:bg-red-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed">
              {deleteLoading ? <><Loader2 size={14} className="animate-spin" /> Deleting...</> : <><Trash2 size={14} /> Delete Project Permanently</>}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
