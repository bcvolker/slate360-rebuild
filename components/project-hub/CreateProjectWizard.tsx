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

  const canAdvance = step === 1 ? name.trim().length > 0 : true;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
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

  const field = "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#FF4D00] focus:ring-2 focus:ring-[#FF4D00]/20 focus:outline-none transition-all";
  const label = "mb-1.5 block text-xs font-semibold text-gray-700";

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl text-gray-900 flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-5 py-4">
          <div>
            <h3 className="text-lg font-black text-gray-900">Create New Project</h3>
            <p className="text-xs text-gray-500 mt-0.5">Step {step} of {TOTAL_STEPS} — {STEP_LABELS[step - 1]}</p>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-200 hover:text-gray-700 transition-colors"><X size={18} /></button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <div className="h-full bg-[#FF4D00] transition-all duration-300" style={{ width: `${(step / TOTAL_STEPS) * 100}%` }} />
        </div>

        {/* Step pills */}
        <div className="flex border-b border-gray-100 bg-white">
          {STEP_LABELS.map((lbl, i) => (
            <div key={lbl} className={`flex-1 py-2 text-center text-[10px] font-bold transition-colors ${i + 1 === step ? "text-[#FF4D00]" : i + 1 < step ? "text-emerald-600" : "text-gray-400"}`}>
              {i + 1 < step && <CheckCircle2 size={10} className="inline mr-0.5 mb-0.5" />}{lbl}
            </div>
          ))}
        </div>

        {/* Body */}
        <form id="create-project-form" onSubmit={submit} className="flex-1 overflow-y-auto p-5 sm:p-6">
          {error && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">{error}</div>}

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
              <p className="text-xs text-gray-500">
                Search for an address, click anywhere on the map to drop a pin, or use the <strong>polygon tool</strong> to outline the site boundary.
              </p>
              <div className="h-[360px] w-full rounded-xl border border-gray-200 overflow-hidden bg-gray-100">
                <WizardLocationPicker value={location} onChange={setLocation} />
              </div>
              {location.address && (
                <p className="text-[11px] text-gray-500 flex items-center gap-1.5">
                  <MapPin size={11} className="text-[#FF4D00] shrink-0" />
                  {location.address}
                  {location.lat !== null && location.lng !== null && (
                    <span className="text-gray-400">
                      ({location.lat.toFixed(5)}, {location.lng.toFixed(5)})
                    </span>
                  )}
                </p>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500 mb-2">Review your project details before creating.</p>
              {[
                { label: "Project Name", value: name },
                { label: "Description", value: description || "—" },
                { label: "Project Type", value: PROJECT_TYPES.find(t => t.value === projectType)?.label ?? projectType },
                { label: "Contract Type", value: CONTRACT_TYPES.find(t => t.value === contractType)?.label ?? contractType },
                { label: "Location", value: location.address || (location.lat !== null && location.lng !== null ? `${location.lat.toFixed(5)}, ${location.lng.toFixed(5)}` : "Not set") },
                { label: "Boundary", value: location.boundary.length > 0 ? `${location.boundary.length} point polygon` : "Not drawn" },
              ].map(({ label: l, value }) => (
                <div key={l} className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">{l}</p>
                  <p className="text-sm font-semibold text-gray-900">{value}</p>
                </div>
              ))}
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="border-t border-gray-100 bg-gray-50 px-5 py-4 flex items-center justify-between">
          {step > 1 ? (
            <button type="button" onClick={() => setStep((s) => s - 1)} className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all">
              <ChevronLeft size={14} /> Back
            </button>
          ) : (
            <button type="button" onClick={onClose} className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all">
              Cancel
            </button>
          )}
          {step < TOTAL_STEPS ? (
            <button type="button" onClick={() => setStep((s) => s + 1)} disabled={!canAdvance} className="inline-flex items-center gap-1.5 rounded-xl bg-[#FF4D00] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#E64500] disabled:opacity-50 transition-all">
              Next <ChevronRight size={14} />
            </button>
          ) : (
            <button type="submit" form="create-project-form" disabled={creating || !name.trim()} className="inline-flex items-center gap-2 rounded-xl bg-[#FF4D00] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#E64500] disabled:opacity-50 transition-all">
              {creating && <Loader2 size={14} className="animate-spin" />}
              {creating ? "Provisioning…" : "Create Project"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

