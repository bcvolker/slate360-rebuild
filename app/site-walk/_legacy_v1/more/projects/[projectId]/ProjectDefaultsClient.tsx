"use client";

import React, { useState, useEffect } from "react";
import { Loader2, Check } from "lucide-react";

interface ProjectDefaults {
  project_name: string;
  client_name: string;
  client_email: string;
  project_address: string;
  project_number: string;
  inspector_name: string;
  inspector_license: string;
  scope_of_work: string;
  default_deliverable_type: string;
}

const DEFAULT_VALUES: ProjectDefaults = {
  project_name: "",
  client_name: "",
  client_email: "",
  project_address: "",
  project_number: "",
  inspector_name: "",
  inspector_license: "",
  scope_of_work: "",
  default_deliverable_type: "photo_log",
};

const KEYS: (keyof ProjectDefaults)[] = [
  "project_name", "client_name", "client_email", "project_address", "project_number",
  "inspector_name", "inspector_license", "scope_of_work", "default_deliverable_type",
];

export function ProjectDefaultsClient({
  projectId,
  projectName,
}: {
  projectId: string;
  projectName: string;
}) {
  const [initialData, setInitialData] = useState<ProjectDefaults>({ ...DEFAULT_VALUES, project_name: projectName });
  const [formData, setFormData] = useState<ProjectDefaults>({ ...DEFAULT_VALUES, project_name: projectName });
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  useEffect(() => {
    async function fetchDefaults() {
      try {
        const res = await fetch(`/api/projects/${projectId}/report-defaults`);
        if (res.ok) {
          const data = await res.json();
          if (data.report_defaults) {
            const merged: ProjectDefaults = {
              ...DEFAULT_VALUES,
              project_name: projectName,
              ...data.report_defaults,
            };
            setInitialData(merged);
            setFormData(merged);
          }
        }
      } catch (err) {
        console.error("Failed to fetch project defaults", err);
      } finally {
        setLoading(false);
      }
    }
    fetchDefaults();
  }, [projectId, projectName]);

  const isDirty = KEYS.some((k) => formData[k] !== initialData[k]);

  const handleSave = async () => {
    setSaveStatus("saving");
    try {
      const res = await fetch(`/api/projects/${projectId}/report-defaults`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaults: formData }),
      });
      if (res.ok) {
        setInitialData(formData);
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 1500);
      } else {
        setSaveStatus("idle");
      }
    } catch (err) {
      console.error("Failed to save project defaults", err);
      setSaveStatus("idle");
    }
  };

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="w-8 h-8 animate-spin text-cobalt" /></div>;
  }

  return (
    <div className="space-y-6 pb-20 bg-card border border-border rounded-xl p-6 shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {([
          ["project_name", "Deliverable Project Name", "text", false],
          ["project_number", "Project Number", "text", false],
          ["client_name", "Client Name", "text", false],
          ["client_email", "Client Email", "email", false],
          ["project_address", "Project Address", "text", true],
        ] as const).map(([key, label, type, full]) => (
          <div key={key} className={`space-y-1.5 ${full ? "col-span-1 md:col-span-2" : ""}`}>
            <label className="text-sm text-muted-foreground">{label}</label>
            <input
              type={type}
              value={formData[key]}
              onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground focus:border-cobalt outline-none"
            />
          </div>
        ))}
      </div>

      <div className="border-t border-border pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-1.5">
          <label className="text-sm text-muted-foreground">Inspector / PM Name</label>
          <input type="text" value={formData.inspector_name} onChange={(e) => setFormData({ ...formData, inspector_name: e.target.value })} className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground focus:border-cobalt outline-none" />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm text-muted-foreground">License / Cert Number</label>
          <input type="text" value={formData.inspector_license} onChange={(e) => setFormData({ ...formData, inspector_license: e.target.value })} className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground focus:border-cobalt outline-none" />
        </div>
        <div className="space-y-1.5 col-span-1 md:col-span-2">
          <label className="text-sm text-muted-foreground">Default Deliverable Type</label>
          <select
            value={formData.default_deliverable_type}
            onChange={(e) => setFormData({ ...formData, default_deliverable_type: e.target.value })}
            className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground focus:border-cobalt outline-none appearance-none"
          >
            <option value="photo_log">Photo Log</option>
            <option value="punchlist">Punch List</option>
            <option value="report">Formal Report</option>
            <option value="custom">Custom Deliverable</option>
          </select>
        </div>
        <div className="space-y-1.5 col-span-1 md:col-span-2">
          <label className="text-sm text-muted-foreground">Default Scope of Work</label>
          <textarea
            rows={5}
            value={formData.scope_of_work}
            onChange={(e) => setFormData({ ...formData, scope_of_work: e.target.value })}
            className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground focus:border-cobalt outline-none resize-none"
            placeholder="Briefly describe the scope or limitations…"
          />
        </div>
      </div>

      {/* Sticky Save Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-card border-t border-border flex justify-end z-40 px-4 sm:px-8">
        <button
          onClick={handleSave}
          disabled={!isDirty || saveStatus !== "idle"}
          className="flex items-center justify-center gap-2 bg-cobalt text-primary-foreground px-6 py-2.5 rounded-lg font-medium hover:bg-cobalt/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all w-full sm:w-auto min-w-[140px]"
        >
          {saveStatus === "saving" && <Loader2 className="w-4 h-4 animate-spin" />}
          {saveStatus === "saved" && <Check className="w-4 h-4" />}
          {saveStatus === "saved" ? "Saved ✓" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}
