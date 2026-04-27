"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { ReportDefaults, SetupProject, SiteWalkSetupTier, SubmitState } from "./setup-types";

type DefaultsResponse = { report_defaults?: ReportDefaults; error?: string };

type Props = {
  project: SetupProject | null;
  tier: SiteWalkSetupTier;
  initialDefaults: ReportDefaults;
};

const inputClass = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15";

export function DeliverableDefaultsForm({ project, tier, initialDefaults }: Props) {
  const [defaults, setDefaults] = useState(initialDefaults);
  const [status, setStatus] = useState<SubmitState>({ kind: "idle" });
  const expanded = tier !== "basic";

  useEffect(() => { void loadDefaults(project?.id ?? null); }, [project?.id]);

  async function loadDefaults(projectId: string | null) {
    if (!projectId) return setDefaults(initialDefaults);
    const response = await fetch(`/api/projects/${projectId}/report-defaults`, { cache: "no-store" });
    if (!response.ok) return;
    const data = (await response.json()) as DefaultsResponse;
    setDefaults(data.report_defaults ?? {});
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!project) return setStatus({ kind: "error", message: "Save or select a project before setting defaults." });
    setStatus({ kind: "loading", message: "Saving deliverable defaults…" });
    try {
      const save = await fetch(`/api/projects/${project.id}/report-defaults`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(defaults),
      });
      if (!save.ok) throw new Error(await readError(save));
      const readback = await fetch(`/api/projects/${project.id}/report-defaults`, { cache: "no-store" });
      if (!readback.ok) throw new Error(await readError(readback));
      const data = (await readback.json()) as DefaultsResponse;
      setDefaults(data.report_defaults ?? {});
      setStatus({ kind: "ok", message: "Deliverable defaults saved and read back from the project." });
    } catch (error) {
      setStatus({ kind: "error", message: error instanceof Error ? error.message : "Could not save defaults." });
    }
  }

  function update<K extends keyof ReportDefaults>(key: K, value: ReportDefaults[K]) {
    setDefaults((current) => ({ ...current, [key]: value }));
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-300 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div><p className="text-xs font-black uppercase tracking-[0.18em] text-blue-800">Deliverable defaults</p><h2 className="mt-1 text-xl font-black text-slate-900">Report auto-fill fields</h2><p className="mt-1 text-sm leading-6 text-slate-700">Store once per project so every output starts branded and complete.</p></div>
        <button type="submit" disabled={!project || status.kind === "loading"} className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-black text-white shadow-sm transition hover:bg-blue-800 disabled:opacity-60">{status.kind === "loading" ? "Saving…" : "Save defaults"}</button>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Field label="Client name"><input className={inputClass} value={defaults.client_name ?? ""} onChange={(e) => update("client_name", e.target.value)} /></Field>
        <Field label="Client email"><input className={inputClass} value={defaults.client_email ?? ""} onChange={(e) => update("client_email", e.target.value)} type="email" /></Field>
        <Field label="Project number"><input className={inputClass} value={defaults.project_number ?? ""} onChange={(e) => update("project_number", e.target.value)} /></Field>
        <Field label="Default output"><select className={inputClass} value={defaults.default_deliverable_type ?? "field_report"} onChange={(e) => update("default_deliverable_type", e.target.value)}><option value="field_report">Field report</option><option value="punch_list">Punch list</option><option value="proposal">Proposal</option><option value="status_update">Status update</option></select></Field>
        <Field label="Project address"><input className={inputClass} value={defaults.project_address ?? ""} onChange={(e) => update("project_address", e.target.value)} /></Field>
        {expanded && <Field label="Inspector license"><input className={inputClass} value={defaults.inspector_license ?? ""} onChange={(e) => update("inspector_license", e.target.value)} /></Field>}
        <div className="md:col-span-2"><Field label="Scope of work"><textarea className={`${inputClass} min-h-20`} value={defaults.scope_of_work ?? ""} onChange={(e) => update("scope_of_work", e.target.value)} /></Field></div>
      </div>

      {expanded ? <p className="mt-4 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-900">Pro/Business setup keeps CM hooks ready for budgets, schedules, RFIs, and submittals in later prompts.</p> : <p className="mt-4 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">Basic setup keeps defaults lean: client, address, scope, and output type.</p>}
      <StatusMessage status={status} />
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block text-sm font-bold text-slate-900"><span className="mb-1 block">{label}</span>{children}</label>; }
function StatusMessage({ status }: { status: SubmitState }) { if (status.kind === "idle" || status.kind === "loading") return null; return <p className={`mt-4 text-sm font-semibold ${status.kind === "ok" ? "text-emerald-700" : "text-rose-700"}`}>{status.message}</p>; }
async function readError(response: Response) { const data = (await response.json().catch(() => null)) as { error?: string } | null; return data?.error ?? "Request failed"; }
