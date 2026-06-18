"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, MapPin, X, CheckCircle2, Folder } from "lucide-react";
import WizardLocationPicker, { type LocationPickerValue } from "./WizardLocationPicker";
import { PROJECT_CREATE_FOLDER_PREVIEW } from "./mobile/project-create-constants";

const PROJECT_TYPES = [
  { value: "ground-up", label: "Ground-Up Construction" },
  { value: "renovation", label: "Renovation / Remodel" },
  { value: "interior", label: "Interior Build-Out" },
  { value: "infrastructure", label: "Infrastructure" },
  { value: "residential", label: "Residential" },
  { value: "commercial", label: "Commercial" },
  { value: "other", label: "Other" },
];

const CONTRACT_TYPES = [
  { value: "cmar", label: "CMAR (Manager at Risk)" },
  { value: "design-build", label: "Design-Build" },
  { value: "lump-sum", label: "Lump Sum / Fixed Price" },
  { value: "gmp", label: "GMP" },
  { value: "cost-plus", label: "Cost Plus" },
  { value: "time-materials", label: "Time & Materials" },
];

const STEP_LABELS = ["Basics", "Location", "Review"];
const TOTAL_STEPS = 3;

export type CreateProjectPayload = {
  name: string;
  description: string;
  metadata: Record<string, unknown>;
};

export default function CreateProjectWizard({
  open, creating, error, onClose, onSubmit,
}: {
  open: boolean;
  creating: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (payload: CreateProjectPayload) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [projectType, setProjectType] = useState("ground-up");
  const [contractType, setContractType] = useState("cmar");
  const [location, setLocation] = useState<LocationPickerValue>({ address: "", lat: null, lng: null, boundary: [] });
  const [step, setStep] = useState(1);

  const prevOpen = useRef(open);
  useEffect(() => {
    if (open && !prevOpen.current) {
      setName(""); setDescription(""); setProjectType("ground-up");
      setContractType("cmar");
      setLocation({ address: "", lat: null, lng: null, boundary: [] });
      setStep(1);
    }
    prevOpen.current = open;
  }, [open]);

  if (!open) return null;

  // Step 1: project name required.
  // Step 3 (Location): optional — always allow advance so projects can be
  // created without a geocoded location. The Review step (step 4) clearly
  // shows "Not set" if the user skipped location, making the omission
  // visible before they confirm. Note: unresolved text in the address input
  // does NOT satisfy canAdvance for step 1 — typos there are irrelevant since
  // the location step is separate.
  const canAdvance =
    step === 1 ? name.trim().length > 0 :
    true;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    // Guard: only submit when the user is on the final review step.
    // This prevents any Enter-key press or button click on earlier steps
    // from prematurely creating the project.
    if (step !== TOTAL_STEPS) return;
    if (!name.trim()) return;
    await onSubmit({
      name: name.trim(),
      description: description.trim(),
      metadata: {
        projectType,
        contractType,
        location: {
          address: location.address,
          lat: location.lat,
          lng: location.lng,
          boundary: location.boundary,
        },
      },
    });
  };

  const field = "w-full rounded-xl border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_60%,transparent)] px-4 py-3 text-sm font-semibold text-[var(--graphite-text-header)] placeholder:text-[var(--graphite-muted)] focus:border-[color-mix(in_srgb,var(--graphite-primary)_40%,transparent)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--graphite-primary)_20%,transparent)] focus:outline-none transition-all";
  const label = "mb-1.5 block text-xs font-bold text-[var(--graphite-muted)]";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 pb-[calc(7rem+env(safe-area-inset-bottom))] sm:pb-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div onClick={(e) => e.stopPropagation()} className="relative flex max-h-[82dvh] w-full max-w-3xl flex-col overflow-hidden rounded-[1.5rem] border border-white/10 bg-[var(--graphite-canvas)] text-white shadow-2xl sm:max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-5 py-4">
          <div>
            <h3 className="text-lg font-black text-white">Create Project</h3>
            <p className="text-xs text-[var(--graphite-muted)] mt-0.5">Step {step} of {TOTAL_STEPS} — {STEP_LABELS[step - 1]}</p>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--graphite-muted)] hover:bg-white/10 hover:text-white transition-colors"><X size={18} /></button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-white/[0.04]">
          <div className="h-full bg-[var(--graphite-primary)] transition-all duration-300" style={{ width: `${(step / TOTAL_STEPS) * 100}%` }} />
        </div>

        {/* Step pills */}
        <div className="flex border-b border-white/10 bg-white/5">
          {STEP_LABELS.map((lbl, i) => (
            <div key={lbl} className={`flex-1 py-2 text-center text-[10px] font-bold transition-colors ${i + 1 === step ? "text-[var(--graphite-primary)]" : i + 1 < step ? "text-emerald-400" : "text-[var(--graphite-muted)]"}`}>
              {i + 1 < step && <CheckCircle2 size={10} className="inline mr-0.5 mb-0.5" />}{lbl}
            </div>
          ))}
        </div>

        {/* Body */}
        <form id="create-project-form" onSubmit={submit} className="flex-1 overflow-y-auto p-5 pb-8 sm:p-6">
          {error && <div className="mb-4 rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-2.5 text-sm text-red-400">{error}</div>}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className={label}>Project Name <span className="text-red-500">*</span></label>
                <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Maple Heights Residence" className={field} autoFocus />
                <p className="mt-1.5 text-xs text-[var(--graphite-muted)]">That&apos;s the only required field — everything else is optional.</p>
              </div>
              <div>
                <label className={label}>Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional scope summary" rows={3} className={`${field} resize-none`} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={label}>Project Type <span className="font-normal text-[var(--graphite-muted)]">(optional)</span></label>
                  <select value={projectType} onChange={(e) => setProjectType(e.target.value)} className={field}>
                    {PROJECT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label className={label}>Contract Type <span className="font-normal text-[var(--graphite-muted)]">(optional)</span></label>
                  <select value={contractType} onChange={(e) => setContractType(e.target.value)} className={field}>
                    {CONTRACT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <div className="h-[360px] w-full overflow-hidden rounded-xl border border-white/10 bg-white/5">
                <WizardLocationPicker value={location} onChange={setLocation} />
              </div>
              {location.address && (
                <p className="text-[11px] text-[var(--graphite-muted)] flex items-center gap-1.5">
                  <MapPin size={11} className="text-[var(--graphite-primary)] shrink-0" />
                  {location.address}
                  {location.lat !== null && location.lng !== null && (
                    <span className="text-[var(--graphite-muted)]">
                      ({location.lat.toFixed(5)}, {location.lng.toFixed(5)})
                    </span>
                  )}
                </p>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <p className="text-sm text-[var(--graphite-muted)] mb-2">Review your project before creating.</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[
                  { label: "Project Name", value: name },
                  { label: "Description", value: description || "—" },
                  { label: "Project Type", value: PROJECT_TYPES.find(t => t.value === projectType)?.label ?? projectType },
                  { label: "Contract Type", value: CONTRACT_TYPES.find(t => t.value === contractType)?.label ?? contractType },
                  { label: "Location", value: location.address || (location.lat !== null && location.lng !== null ? `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}` : "Not set") },
                  { label: "Boundary", value: location.boundary.length > 0 ? `${location.boundary.length} point polygon` : "Not drawn" },
                ].map(({ label: l, value }) => (
                  <div key={l} className="rounded-xl border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_60%,transparent)] px-4 py-3">
                    <p className="text-[10px] font-semibold text-[var(--graphite-muted)] uppercase tracking-wider mb-0.5">{l}</p>
                    <p className="truncate text-sm font-semibold text-[var(--graphite-text-header)]">{value}</p>
                  </div>
                ))}
              </div>

              {/* SlateDrop structure auto-created on submit */}
              <div className="rounded-xl border border-[var(--mobile-app-card-border)] bg-[color-mix(in_srgb,var(--graphite-canvas)_60%,transparent)] px-4 py-3">
                <p className="text-[10px] font-semibold text-[var(--graphite-muted)] uppercase tracking-wider mb-2">Folders created in SlateDrop</p>
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                  {PROJECT_CREATE_FOLDER_PREVIEW.map((folder) => (
                    <div key={folder.id} className="flex items-center gap-2 text-sm text-[var(--graphite-muted)]">
                      <Folder className="h-4 w-4 shrink-0 text-[var(--graphite-primary)]" aria-hidden />
                      {folder.label}
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-xs text-[var(--graphite-muted)]">
                  Photos, plans, deliverables, and uploads file here automatically — open them anytime from SlateDrop.
                </p>
              </div>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="border-t border-white/10 bg-white/5 px-5 py-4 flex items-center justify-between">
          {step > 1 ? (
            <button type="button" onClick={() => setStep((s) => s - 1)} className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-[var(--graphite-text-body)] hover:bg-white/10 transition-all">
              <ChevronLeft size={14} /> Back
            </button>
          ) : (
            <button type="button" onClick={onClose} className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-[var(--graphite-text-body)] hover:bg-white/10 transition-all">
              Cancel
            </button>
          )}
          {step < TOTAL_STEPS ? (
            <button type="button" onClick={() => setStep((s) => s + 1)} disabled={!canAdvance} className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--graphite-primary)] px-6 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50 transition-all">
              Next <ChevronRight size={14} />
            </button>
          ) : (
            <button type="submit" form="create-project-form" disabled={creating || !name.trim()} className="inline-flex items-center gap-2 rounded-xl bg-[var(--graphite-primary)] px-6 py-2.5 text-sm font-bold text-white hover:opacity-90 disabled:opacity-50 transition-all">
              {creating && <Loader2 size={14} className="animate-spin" />}
              {creating ? "Provisioning…" : "Create Project"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

