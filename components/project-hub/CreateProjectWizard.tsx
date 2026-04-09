"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, MapPin, X, CheckCircle2 } from "lucide-react";
import WizardLocationPicker, { type LocationPickerValue } from "./WizardLocationPicker";

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

const STEP_LABELS = ["Basics", "Classification", "Location", "Review"];
const TOTAL_STEPS = 4;

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

  const field = "w-full rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm text-white placeholder:text-zinc-500 focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 focus:outline-none transition-all";
  const label = "mb-1.5 block text-xs font-semibold text-zinc-300";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl text-white flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-800/50 px-5 py-4">
          <div>
            <h3 className="text-lg font-black text-white">Create New Project</h3>
            <p className="text-xs text-zinc-400 mt-0.5">Step {step} of {TOTAL_STEPS} — {STEP_LABELS[step - 1]}</p>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:bg-zinc-700 hover:text-white transition-colors"><X size={18} /></button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-zinc-800">
          <div className="h-full bg-[#D4AF37] transition-all duration-300" style={{ width: `${(step / TOTAL_STEPS) * 100}%` }} />
        </div>

        {/* Step pills */}
        <div className="flex border-b border-zinc-800 bg-zinc-900">
          {STEP_LABELS.map((lbl, i) => (
            <div key={lbl} className={`flex-1 py-2 text-center text-[10px] font-bold transition-colors ${i + 1 === step ? "text-[#D4AF37]" : i + 1 < step ? "text-emerald-400" : "text-zinc-500"}`}>
              {i + 1 < step && <CheckCircle2 size={10} className="inline mr-0.5 mb-0.5" />}{lbl}
            </div>
          ))}
        </div>

        {/* Body */}
        <form id="create-project-form" onSubmit={submit} className="flex-1 overflow-y-auto p-5 sm:p-6">
          {error && <div className="mb-4 rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-2.5 text-sm text-red-400">{error}</div>}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className={label}>Project Name <span className="text-red-500">*</span></label>
                <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Maple Heights Residence" className={field} autoFocus />
              </div>
              <div>
                <label className={label}>Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional scope summary" rows={4} className={`${field} resize-none`} />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={label}>Project Type</label>
                <select value={projectType} onChange={(e) => setProjectType(e.target.value)} className={field}>
                  {PROJECT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className={label}>Contract Type</label>
                <select value={contractType} onChange={(e) => setContractType(e.target.value)} className={field}>
                  {CONTRACT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <p className="text-xs text-zinc-400">
                Search for an address, click anywhere on the map to drop a pin, or use the <strong>polygon tool</strong> to outline the site boundary.
              </p>
              <div className="h-[360px] w-full rounded-xl border border-zinc-700 overflow-hidden bg-zinc-800">
                <WizardLocationPicker value={location} onChange={setLocation} />
              </div>
              {location.address && (
                <p className="text-[11px] text-zinc-400 flex items-center gap-1.5">
                  <MapPin size={11} className="text-[#D4AF37] shrink-0" />
                  {location.address}
                  {location.lat !== null && location.lng !== null && (
                    <span className="text-zinc-500">
                      ({location.lat.toFixed(5)}, {location.lng.toFixed(5)})
                    </span>
                  )}
                </p>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3">
              <p className="text-sm text-zinc-400 mb-2">Review your project details before creating.</p>
              {[
                { label: "Project Name", value: name },
                { label: "Description", value: description || "—" },
                { label: "Project Type", value: PROJECT_TYPES.find(t => t.value === projectType)?.label ?? projectType },
                { label: "Contract Type", value: CONTRACT_TYPES.find(t => t.value === contractType)?.label ?? contractType },
                { label: "Location", value: location.address || (location.lat !== null && location.lng !== null ? `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}` : "Not set") },
                { label: "Boundary", value: location.boundary.length > 0 ? `${location.boundary.length} point polygon` : "Not drawn" },
              ].map(({ label: l, value }) => (
                <div key={l} className="rounded-xl border border-zinc-800 bg-zinc-800/50 px-4 py-3">
                  <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-0.5">{l}</p>
                  <p className="text-sm font-semibold text-white">{value}</p>
                </div>
              ))}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="border-t border-zinc-800 bg-zinc-800/50 px-5 py-4 flex items-center justify-between">
          {step > 1 ? (
            <button type="button" onClick={() => setStep((s) => s - 1)} className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm font-semibold text-zinc-300 hover:bg-zinc-700 transition-all">
              <ChevronLeft size={14} /> Back
            </button>
          ) : (
            <button type="button" onClick={onClose} className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm font-semibold text-zinc-300 hover:bg-zinc-700 transition-all">
              Cancel
            </button>
          )}
          {step < TOTAL_STEPS ? (
            <button type="button" onClick={() => setStep((s) => s + 1)} disabled={!canAdvance} className="inline-flex items-center gap-1.5 rounded-xl bg-[#D4AF37] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#E64500] disabled:opacity-50 transition-all">
              Next <ChevronRight size={14} />
            </button>
          ) : (
            <button type="submit" form="create-project-form" disabled={creating || !name.trim()} className="inline-flex items-center gap-2 rounded-xl bg-[#D4AF37] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#E64500] disabled:opacity-50 transition-all">
              {creating && <Loader2 size={14} className="animate-spin" />}
              {creating ? "Provisioning…" : "Create Project"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

