"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, FolderOpen } from "lucide-react";
import GlassCard from "@/components/shared/GlassCard";
import { PlanSetList } from "./PlanSetList";
import { PlanSheetGrid } from "./PlanSheetGrid";
import { PlanUploader } from "./PlanUploader";
import { StartPlanWalkButton } from "./StartPlanWalkButton";
import type { PlanRoomPayload, PlanRoomProject } from "./plan-room-types";
import type { SiteWalkPlanSet, SiteWalkPlanSheet } from "@/lib/types/site-walk";

type Props = {
  projects: PlanRoomProject[];
  initialPlanSets: SiteWalkPlanSet[];
  initialSheets: SiteWalkPlanSheet[];
};

export function MasterPlanRoomClient({ projects, initialPlanSets, initialSheets }: Props) {
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [planSets, setPlanSets] = useState(initialPlanSets);
  const [sheets, setSheets] = useState(initialSheets);
  const [activePlanSetId, setActivePlanSetId] = useState<string | null>(initialPlanSets[0]?.id ?? null);
  const [showLibrary, setShowLibrary] = useState(false);

  const activeProject = useMemo(() => projects.find((project) => project.id === projectId) ?? null, [projectId, projects]);
  const activePlanSet = useMemo(() => planSets.find((planSet) => planSet.id === activePlanSetId) ?? null, [activePlanSetId, planSets]);
  const readyPlanSets = useMemo(() => planSets.filter((set) => set.processing_status === "ready"), [planSets]);

  async function chooseProject(nextProjectId: string) {
    setProjectId(nextProjectId);
    if (!nextProjectId) {
      setPlanSets([]);
      setSheets([]);
      setActivePlanSetId(null);
      setShowLibrary(false);
      return;
    }
    const response = await fetch(`/api/site-walk/plan-sets?project_id=${encodeURIComponent(nextProjectId)}`, { cache: "no-store" });
    if (!response.ok) return;
    const data = (await response.json()) as PlanRoomPayload;
    setPlanSets(data.planSets);
    setSheets(data.sheets);
    setActivePlanSetId(data.planSets[0]?.id ?? null);
  }

  function handlePlanRoomChange(payload: PlanRoomPayload) {
    setPlanSets((current) => mergePlanSets(current, payload.planSets));
    setSheets((current) => mergeSheets(current, payload.sheets));
    setActivePlanSetId(payload.planSets[0]?.id ?? activePlanSetId);
  }

  return (
    <div className="space-y-4">
      <GlassCard className="p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.2em] text-amber-400">Master Plan Room</p>
            <h1 className="mt-1 truncate text-xl font-black tracking-tight text-white sm:text-2xl">{activeProject?.name ?? "Pick a project"}</h1>
            <p className="mt-1 text-xs leading-5 text-slate-400 sm:text-sm">Upload a PDF, then start a walk on it. Files land in <span className="font-black text-slate-200">Site Walk Files / Plans</span>.</p>
          </div>
          <label className="block sm:min-w-56">
            <span className="mb-1 block text-[10px] font-black uppercase tracking-wider text-slate-400">Project</span>
            <select value={projectId} onChange={(event) => void chooseProject(event.target.value)} className="h-11 w-full rounded-2xl border border-white/10 bg-slate-950/70 px-3 text-sm font-bold text-slate-100 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20">
              <option value="">Select a project</option>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
          </label>
        </div>
      </GlassCard>

      <PlanUploader project={activeProject} onPlanRoomChange={handlePlanRoomChange} />

      {activeProject && readyPlanSets.length > 0 && (
        <StartPlanWalkButton projectId={activeProject.id} projectName={activeProject.name} planSetId={activePlanSet?.id ?? readyPlanSets[0].id} disabled={false} />
      )}

      {planSets.length > 0 && (
        <GlassCard className="overflow-hidden p-0">
          <button type="button" onClick={() => setShowLibrary((current) => !current)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-black text-slate-100 hover:bg-white/[0.04]" aria-expanded={showLibrary}>
            <span className="inline-flex items-center gap-2"><FolderOpen className="h-4 w-4 text-amber-300" /> Plan library ({planSets.length})</span>
            {showLibrary ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
          </button>
          {showLibrary && (
            <div className="border-t border-white/10 p-4">
              <div className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
                <PlanSetList planSets={planSets} sheets={sheets} activePlanSetId={activePlanSetId} onSelectPlanSet={setActivePlanSetId} />
                <PlanSheetGrid activePlanSet={activePlanSet} sheets={sheets} />
              </div>
            </div>
          )}
        </GlassCard>
      )}
    </div>
  );
}

function mergePlanSets(current: SiteWalkPlanSet[], incoming: SiteWalkPlanSet[]) {
  const map = new Map(current.map((planSet) => [planSet.id, planSet]));
  for (const planSet of incoming) map.set(planSet.id, planSet);
  return Array.from(map.values()).sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
}

function mergeSheets(current: SiteWalkPlanSheet[], incoming: SiteWalkPlanSheet[]) {
  const map = new Map(current.map((sheet) => [sheet.id, sheet]));
  for (const sheet of incoming) map.set(sheet.id, sheet);
  return Array.from(map.values()).sort((a, b) => a.sort_order - b.sort_order);
}
