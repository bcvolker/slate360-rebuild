"use client";

import { useMemo, useState } from "react";
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

  return (
    <div className="space-y-5">
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

      <BrandSettingsForm initialSettings={brandSettings} />
      <ProjectSetupForm initialProjects={projects} tier={tier} onProjectSaved={handleProjectSaved} />
      <div className="grid gap-5 xl:grid-cols-2">
        <StakeholderPicker project={activeProject} initialContacts={contacts} />
        <DeliverableDefaultsForm project={activeProject} tier={tier} initialDefaults={reportDefaults} />
      </div>
    </div>
  );
}
