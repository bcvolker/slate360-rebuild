"use client";

import { useMemo, useState } from "react";
import { PlanSetList } from "./PlanSetList";
import { PlanSheetGrid } from "./PlanSheetGrid";
import { PlanUploader } from "./PlanUploader";
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

  const activeProject = useMemo(() => projects.find((project) => project.id === projectId) ?? null, [projectId, projects]);
  const activePlanSet = useMemo(() => planSets.find((planSet) => planSet.id === activePlanSetId) ?? null, [activePlanSetId, planSets]);

  async function chooseProject(nextProjectId: string) {
    setProjectId(nextProjectId);
    if (!nextProjectId) {
      setPlanSets([]);
      setSheets([]);
      setActivePlanSetId(null);
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
    <div className="space-y-5">
      <section className="rounded-3xl border border-slate-300 bg-white p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-800">Master Plan Room</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Project plan sets</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-700">Upload PDF plan packages into SlateDrop, track processing, and store reusable sheet rows before the field walk starts.</p>
          </div>
          <label className="block min-w-64 text-sm font-bold text-slate-900">
            <span className="mb-1 block">Project</span>
            <select value={projectId} onChange={(event) => void chooseProject(event.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15">
              <option value="">Select a project</option>
              {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
            </select>
          </label>
        </div>
      </section>

      <PlanUploader project={activeProject} onPlanRoomChange={handlePlanRoomChange} />
      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <PlanSetList planSets={planSets} sheets={sheets} activePlanSetId={activePlanSetId} onSelectPlanSet={setActivePlanSetId} />
        <PlanSheetGrid activePlanSet={activePlanSet} sheets={sheets} />
      </div>
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
