"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Lock, UploadCloud } from "lucide-react";
import { PagedWorkspace, type PagedWorkspacePage } from "@/components/shared/paged-workspace";
import { BrandSettingsForm } from "./BrandSettingsForm";
import { DeliverableDefaultsForm } from "./DeliverableDefaultsForm";
import { ProjectSetupForm } from "./ProjectSetupForm";
import { StakeholderPicker } from "./StakeholderPicker";
import type { BrandSettings, ProjectSavedEvent, ReportDefaults, SetupContact, SetupProject, SiteWalkSetupTier } from "./setup-types";

type Props = {
  brandSettings: BrandSettings;
  projects: SetupProject[];
  contacts: SetupContact[];
  initialReportDefaults: ReportDefaults;
  tier: SiteWalkSetupTier;
  orgName: string;
};

export function SiteWalkSetupClient({ brandSettings, projects, contacts, initialReportDefaults, tier, orgName }: Props) {
  const [activeProject, setActiveProject] = useState<SetupProject | null>(projects[0] ?? null);
  const [reportDefaults, setReportDefaults] = useState(initialReportDefaults);

  const modeCopy = useMemo(() => {
    if (tier === "basic") return "Basic mode: fast field projects, contacts, and report defaults without CM overhead.";
    if (tier === "pro") return "Pro mode: expanded setup with CM hooks ready for plans, schedules, and assignments.";
    return "Business mode: expanded setup for organization-wide CM workflows and leadership reporting.";
  }, [tier]);

  function handleProjectSaved(event: ProjectSavedEvent) {
    setActiveProject(event.project);
    if (event.reportDefaults) setReportDefaults(event.reportDefaults);
  }

  const pages: PagedWorkspacePage[] = [
    { id: "project", label: "Project", content: <ProjectSetupForm initialProjects={projects} tier={tier} onProjectSaved={handleProjectSaved} /> },
    { id: "company", label: "Company", content: <BrandSettingsForm initialSettings={brandSettings} /> },
    { id: "plans", label: "Plans & Docs", content: <PlansDocsPanel project={activeProject} /> },
    { id: "team", label: "Team", content: <StakeholderPicker project={activeProject} initialContacts={contacts} /> },
    { id: "deliverables", label: "Deliverables", content: <DeliverableDefaultsForm project={activeProject} tier={tier} initialDefaults={reportDefaults} /> },
    { id: "controls", label: "Project Controls", content: <ProjectControlsPanel tier={tier} /> },
  ];

  return (
    <div className="h-[calc(100dvh-11rem)] min-h-[640px] overflow-hidden lg:h-auto lg:min-h-0">
      <section className="rounded-3xl border border-slate-300 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-800">Setup</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">Company, contacts, and field project setup</h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-700">Configure {orgName} once, bind a project context, then read every save back from Slate360 before capture starts.</p>
          </div>
          <div className="rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-900">
            <span className="text-blue-800">{tier.toUpperCase()}</span> · {modeCopy}
          </div>
        </div>
      </section>

      <div className="mt-5 h-[calc(100%-9.5rem)] min-h-0 rounded-3xl border border-slate-300 bg-white shadow-sm lg:h-auto">
        <PagedWorkspace pages={pages} title="Field Project Setup" subtitle="Swipe through the workbook on mobile; use the same sections as tabs on desktop." viewportClassName="overflow-y-auto p-4" />
      </div>
    </div>
  );
}

function PlansDocsPanel({ project }: { project: SetupProject | null }) {
  return (
    <section className="rounded-3xl border border-slate-300 bg-white p-5 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-800">Plans & Docs</p>
      <h2 className="mt-1 text-xl font-black text-slate-900">Plan room and project documents</h2>
      <p className="mt-2 text-sm leading-6 text-slate-700">Upload plan sets, specs, instructions, and supporting files into the Field Project folder system before crews start capture.</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <Link href="/site-walk/plans" className="rounded-2xl border border-slate-300 bg-slate-50 p-4 text-sm font-black text-slate-900 hover:border-blue-300"><UploadCloud className="mb-3 h-6 w-6 text-blue-800" />Open Plan Room</Link>
        <Link href={project ? `/projects/${project.id}/slatedrop` : "/site-walk/slatedrop"} className="rounded-2xl border border-slate-300 bg-slate-50 p-4 text-sm font-black text-slate-900 hover:border-blue-300"><UploadCloud className="mb-3 h-6 w-6 text-blue-800" />Open Site Walk Files</Link>
      </div>
    </section>
  );
}

function ProjectControlsPanel({ tier }: { tier: SiteWalkSetupTier }) {
  const unlocked = tier === "business";
  const controls = ["Schedule links", "Budget / cost codes", "RFIs", "Submittals", "Milestones", "Change candidates"];
  return (
    <section className="rounded-3xl border border-slate-300 bg-white p-5 shadow-sm">
      <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-800">Project Controls</p>
      <h2 className="mt-1 text-xl font-black text-slate-900">Higher-tier construction management hooks</h2>
      <p className="mt-2 text-sm leading-6 text-slate-700">Connect Site Walk findings to schedule, budget, RFIs, submittals, blockers, and managed project documentation when the workspace tier allows it.</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {controls.map((control) => (
          <div key={control} className="rounded-2xl border border-slate-300 bg-slate-50 p-4 text-sm font-black text-slate-900">
            {!unlocked && <Lock className="mb-3 h-5 w-5 text-slate-500" />}
            {control}
            <p className="mt-1 text-xs font-bold text-slate-600">{unlocked ? "Ready for PM integration." : "Business tier unlock."}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
