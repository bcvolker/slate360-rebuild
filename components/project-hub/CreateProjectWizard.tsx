"use client";

import { FormEvent, useMemo, useState } from "react";
import { APIProvider, AdvancedMarker, ControlPosition, Map, MapControl } from "@vis.gl/react-google-maps";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, GripHorizontal, Loader2, MapPin, Plus, X } from "lucide-react";

const MOCK_CONTACTS = [
  { id: "c1", name: "Alex Rivera", role: "Project Manager" },
  { id: "c2", name: "Morgan Lee", role: "Superintendent" },
  { id: "c3", name: "Taylor Brooks", role: "Estimator" },
  { id: "c4", name: "Jordan Patel", role: "Owner Rep" },
];

export type CreateProjectPayload = {
  name: string;
  description: string;
  metadata: {
    projectType: string;
    contractType: string;
    scope: string;
    teamMemberIds: string[];
    teamEmails: string[];
    estimatedBudget: string;
    targetStartDate: string;
    targetEndDate: string;
    customPhases: string;
    location: {
      lat: number | null;
      lng: number | null;
      address: string;
    };
  };
};

function normalizeAddress(raw: unknown): string {
  if (!raw || typeof raw !== "object") return "";
  const result = raw as { results?: Array<{ formatted_address?: string }> };
  return result.results?.[0]?.formatted_address ?? "";
}

export default function CreateProjectWizard({
  open,
  creating,
  error,
  onClose,
  onSubmit,
}: {
  open: boolean;
  creating: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (payload: CreateProjectPayload) => Promise<void>;
}) {
  const totalSteps = 5;
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [projectType, setProjectType] = useState("ground-up");
  const [contractType, setContractType] = useState("lump-sum");
  const [scope, setScope] = useState("");
  const [estimatedBudget, setEstimatedBudget] = useState("");
  const [targetStartDate, setTargetStartDate] = useState("");
  const [targetEndDate, setTargetEndDate] = useState("");
  const [customPhases, setCustomPhases] = useState(
    "1. Preconstruction\n2. Site Work & Foundation\n3. Framing & Structure\n4. MEP Rough-in\n5. Finishes\n6. Closeout"
  );
  const [teamMemberIds, setTeamMemberIds] = useState<string[]>([]);
  const [teamEmails, setTeamEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [address, setAddress] = useState("");
  const [mapType, setMapType] = useState<"roadmap" | "satellite">("roadmap");
  const [mapZoom, setMapZoom] = useState(4);
  const [currentStep, setCurrentStep] = useState(1);
  const [localError, setLocalError] = useState<string | null>(null);

  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  const stepLabels = ["Core Details", "Map & Address", "Budget & Scope", "Team & Contacts", "Review & Create"];

  const mapCenter = useMemo(
    () => ({ lat: lat ?? 39.5, lng: lng ?? -98.35 }),
    [lat, lng]
  );

  const selectedTeamSummary = useMemo(() => {
    if (teamMemberIds.length === 0) return "No team members selected";
    return `${teamMemberIds.length} selected`;
  }, [teamMemberIds]);

  if (!open) return null;

  const canGoNext = currentStep !== 1 || Boolean(name.trim());
  const currentStepLabel = stepLabels[currentStep - 1] ?? "Review";

  const toggleMember = (memberId: string) => {
    setTeamMemberIds((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
  };

  const addTeamEmail = () => {
    const next = emailInput.trim().toLowerCase();
    if (!next || !next.includes("@")) return;
    if (teamEmails.includes(next)) return;
    setTeamEmails((prev) => [...prev, next]);
    setEmailInput("");
  };

  const removeTeamEmail = (email: string) => {
    setTeamEmails((prev) => prev.filter((item) => item !== email));
  };

  const nextStep = () => {
    if (currentStep === 1 && !name.trim()) {
      setLocalError("Project name is required before continuing.");
      return;
    }
    setLocalError(null);
    setCurrentStep((prev) => Math.min(totalSteps, prev + 1));
  };

  const prevStep = () => {
    setLocalError(null);
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  const reverseGeocode = async (nextLat: number, nextLng: number) => {
    if (!googleMapsApiKey) return;
    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?latlng=${nextLat},${nextLng}&key=${googleMapsApiKey}`
      );
      if (!response.ok) return;
      const payload = await response.json();
      const nextAddress = normalizeAddress(payload);
      if (nextAddress) setAddress(nextAddress);
    } catch {
      // keep manual address mode if reverse geocode fails
    }
  };

  const handleMapClick = async (event: unknown) => {
    const detail = (event as { detail?: { latLng?: { lat: number; lng: number } } })?.detail;
    const nextLat = detail?.latLng?.lat;
    const nextLng = detail?.latLng?.lng;
    if (typeof nextLat !== "number" || typeof nextLng !== "number") return;
    setLat(nextLat);
    setLng(nextLng);
    await reverseGeocode(nextLat, nextLng);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLocalError(null);

    if (!name.trim()) {
      setLocalError("Project name is required.");
      return;
    }

    await onSubmit({
      name: name.trim(),
      description: description.trim(),
      metadata: {
        projectType,
        contractType,
        scope: scope.trim(),
        teamMemberIds,
        teamEmails,
        estimatedBudget: estimatedBudget.trim(),
        targetStartDate,
        targetEndDate,
        customPhases: customPhases.trim(),
        location: {
          lat,
          lng,
          address: address.trim(),
        },
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/35 backdrop-blur-sm" />
      <motion.div
        onClick={(event) => event.stopPropagation()}
        className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-slate-700 bg-slate-900 shadow-2xl text-slate-100"
      >
        <motion.div
          drag
          dragMomentum={false}
          className="flex items-center justify-between border-b border-slate-700 bg-slate-900/80 px-4 py-3"
        >
          <div className="flex items-center gap-2 text-slate-400">
            <GripHorizontal size={16} />
            <span className="text-xs font-semibold uppercase tracking-wide">Drag</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-slate-200"
          >
            <X size={16} />
          </button>
        </motion.div>

        <form onSubmit={submit} className="p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-white">Super Project Wizard</h3>
              <p className="mt-1 text-xs text-slate-400">Step {currentStep} of {totalSteps} · {currentStepLabel}</p>
            </div>
            <div className="flex items-center gap-1.5">
              {Array.from({ length: totalSteps }).map((_, index) => {
                const step = index + 1;
                return (
                  <span
                    key={step}
                    className={`h-2.5 w-2.5 rounded-full ${step <= currentStep ? "bg-[#FF4D00]" : "bg-slate-700"}`}
                  />
                );
              })}
            </div>
          </div>

          <div className="mt-5">
            {currentStep === 1 && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-300">Project Name *</label>
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="e.g. Maple Heights Residence"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-100 focus:border-[#FF4D00] focus:ring-1 focus:ring-[#FF4D00]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-300">Description</label>
                  <input
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Optional"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-100 focus:border-[#FF4D00] focus:ring-1 focus:ring-[#FF4D00]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-300">Project Type</label>
                  <select
                    value={projectType}
                    onChange={(event) => setProjectType(event.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-100 focus:border-[#FF4D00] focus:ring-1 focus:ring-[#FF4D00]"
                  >
                    <option value="ground-up">Ground-up</option>
                    <option value="renovation">Renovation</option>
                    <option value="tenant-improvement">Tenant Improvement</option>
                    <option value="infrastructure">Infrastructure</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-300">Contract Type</label>
                  <select
                    value={contractType}
                    onChange={(event) => setContractType(event.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-100 focus:border-[#FF4D00] focus:ring-1 focus:ring-[#FF4D00]"
                  >
                    <option value="lump-sum">Lump Sum</option>
                    <option value="gmp">GMP</option>
                    <option value="cost-plus">Cost Plus</option>
                    <option value="time-material">Time &amp; Material</option>
                    <option value="cmar">CMAR (Construction Manager at Risk)</option>
                    <option value="design-build">Design-Build</option>
                    <option value="ipd">IPD (Integrated Project Delivery)</option>
                    <option value="joc">JOC (Job Order Contracting)</option>
                    <option value="unit-price">Unit Price</option>
                  </select>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-slate-200">Project Location</p>
                    <p className="text-[11px] text-slate-400">Type an address or click map to set a pin</p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-600 px-2 py-0.5 text-[11px] text-slate-300">
                    <MapPin size={11} />
                    {lat && lng ? `${lat.toFixed(5)}, ${lng.toFixed(5)}` : "No pin set"}
                  </span>
                </div>

                <div className="mb-3">
                  <label className="mb-1 block text-xs font-semibold text-slate-300">Address</label>
                  <input
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                    placeholder="Manual address entry or reverse geocoded result"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-100 focus:border-[#FF4D00] focus:ring-1 focus:ring-[#FF4D00]"
                  />
                </div>

                <div className="h-[280px] overflow-hidden rounded-xl border border-slate-700">
                  <APIProvider apiKey={googleMapsApiKey} libraries={["places"]}>
                    <Map
                      mapId="DEMO_MAP_ID"
                      defaultCenter={mapCenter}
                      defaultZoom={4}
                      center={mapCenter}
                      zoom={mapZoom}
                      mapTypeId={mapType}
                      onClick={handleMapClick}
                      disableDefaultUI
                      gestureHandling="greedy"
                    >
                      <MapControl position={ControlPosition.TOP_RIGHT}>
                        <div className="m-2 flex flex-col gap-2 rounded-lg border border-slate-700 bg-slate-900/90 p-2">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setMapType("roadmap")}
                              className={`rounded-md px-2 py-1 text-[11px] font-semibold ${
                                mapType === "roadmap" ? "bg-[#FF4D00] text-white" : "bg-slate-700 text-slate-200"
                              }`}
                            >
                              Roadmap
                            </button>
                            <button
                              type="button"
                              onClick={() => setMapType("satellite")}
                              className={`rounded-md px-2 py-1 text-[11px] font-semibold ${
                                mapType === "satellite" ? "bg-[#FF4D00] text-white" : "bg-slate-700 text-slate-200"
                              }`}
                            >
                              Satellite
                            </button>
                          </div>
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => setMapZoom((prev) => Math.max(1, prev - 1))}
                              className="rounded-md bg-slate-700 px-2 py-1 text-xs font-semibold text-slate-200"
                            >
                              −
                            </button>
                            <button
                              type="button"
                              onClick={() => setMapZoom((prev) => Math.min(20, prev + 1))}
                              className="rounded-md bg-slate-700 px-2 py-1 text-xs font-semibold text-slate-200"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </MapControl>
                      {lat && lng ? <AdvancedMarker position={{ lat, lng }} /> : null}
                    </Map>
                  </APIProvider>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-300">Estimated Budget</label>
                  <input
                    value={estimatedBudget}
                    onChange={(event) => setEstimatedBudget(event.target.value)}
                    placeholder="e.g. $4,500,000"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-100 focus:border-[#FF4D00] focus:ring-1 focus:ring-[#FF4D00]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-300">Target Start Date</label>
                  <input
                    type="date"
                    value={targetStartDate}
                    onChange={(event) => setTargetStartDate(event.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-100 focus:border-[#FF4D00] focus:ring-1 focus:ring-[#FF4D00]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-300">Target End Date</label>
                  <input
                    type="date"
                    value={targetEndDate}
                    onChange={(event) => setTargetEndDate(event.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-100 focus:border-[#FF4D00] focus:ring-1 focus:ring-[#FF4D00]"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs font-semibold text-slate-300">Custom Project Phases</label>
                  <p className="mb-2 text-[11px] text-slate-400">Default phase sequence is prefilled below — edit the text block directly (one phase per line) to customize order and wording.</p>
                  <textarea
                    rows={7}
                    value={customPhases}
                    onChange={(event) => setCustomPhases(event.target.value)}
                    placeholder="One phase per line (e.g. Precon, Foundation, Framing...)"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-100 focus:border-[#FF4D00] focus:ring-1 focus:ring-[#FF4D00]"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs font-semibold text-slate-300">Scope</label>
                  <textarea
                    value={scope}
                    onChange={(event) => setScope(event.target.value)}
                    rows={3}
                    placeholder="Optional scope summary"
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-100 focus:border-[#FF4D00] focus:ring-1 focus:ring-[#FF4D00]"
                  />
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-4">
                <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-3">
                  <label className="mb-1 block text-xs font-semibold text-slate-300">Add Team Email</label>
                  <div className="flex items-center gap-2">
                    <input
                      value={emailInput}
                      onChange={(event) => setEmailInput(event.target.value)}
                      placeholder="name@company.com"
                      className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5 text-sm text-slate-100 focus:border-[#FF4D00] focus:ring-1 focus:ring-[#FF4D00]"
                    />
                    <button
                      type="button"
                      onClick={addTeamEmail}
                      className="inline-flex items-center gap-1 rounded-xl bg-[#FF4D00] px-3 py-2 text-xs font-semibold text-white"
                    >
                      <Plus size={12} /> Add
                    </button>
                  </div>
                  {teamEmails.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {teamEmails.map((email) => (
                        <button
                          key={email}
                          type="button"
                          onClick={() => removeTeamEmail(email)}
                          className="rounded-full border border-slate-600 bg-slate-800 px-2 py-1 text-[11px] text-slate-200"
                        >
                          {email} ×
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-slate-200">Select from Contacts</p>
                      <p className="text-[11px] text-slate-400">Mock list for now</p>
                    </div>
                    <span className="rounded-full border border-slate-600 px-2 py-0.5 text-[11px] text-slate-300">
                      {selectedTeamSummary}
                    </span>
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {MOCK_CONTACTS.map((member) => {
                      const selected = teamMemberIds.includes(member.id);
                      return (
                        <label
                          key={member.id}
                          className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-sm transition ${
                            selected
                              ? "border-[#FF4D00]/40 bg-[#FF4D00]/10"
                              : "border-slate-700 bg-slate-900 hover:bg-slate-800"
                          }`}
                        >
                          <div>
                            <p className="font-semibold text-slate-100">{member.name}</p>
                            <p className="text-xs text-slate-400">{member.role}</p>
                          </div>
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => toggleMember(member.id)}
                            className="h-4 w-4 rounded border-gray-300 text-[#FF4D00]"
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {currentStep === 5 && (
              <div className="space-y-3 rounded-xl border border-slate-700 bg-slate-800/60 p-4 text-sm text-slate-200">
                <h4 className="font-bold text-white">Review Project Setup</h4>
                <p><span className="font-semibold text-white">Name:</span> {name || "—"}</p>
                <p><span className="font-semibold text-white">Description:</span> {description || "—"}</p>
                <p><span className="font-semibold text-white">Type:</span> {projectType}</p>
                <p><span className="font-semibold text-white">Contract:</span> {contractType}</p>
                <p><span className="font-semibold text-white">Address:</span> {address || "—"}</p>
                <p><span className="font-semibold text-white">Coordinates:</span> {lat && lng ? `${lat.toFixed(5)}, ${lng.toFixed(5)}` : "—"}</p>
                <p><span className="font-semibold text-white">Budget:</span> {estimatedBudget || "—"}</p>
                <p><span className="font-semibold text-white">Schedule:</span> {targetStartDate || "—"} → {targetEndDate || "—"}</p>
                <p><span className="font-semibold text-white">Team:</span> {teamMemberIds.length + teamEmails.length} members/contacts</p>
                <p className="text-xs text-slate-400">Canonical project folders will be auto-provisioned in the background.</p>
              </div>
            )}
          </div>

          {(localError || error) ? (
            <div className="mt-4 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-xs text-red-200">
              {localError || error}
            </div>
          ) : null}

          <div className="mt-5 flex items-center justify-between gap-2">
            <div>
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={prevStep}
                  className="inline-flex items-center gap-1 rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
                >
                  <ChevronLeft size={13} /> Back
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>

              {currentStep < totalSteps ? (
                <button
                  type="button"
                  onClick={nextStep}
                  disabled={!canGoNext}
                  className="inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: "#FF4D00" }}
                >
                  Next <ChevronRight size={13} />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={creating}
                  className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: "#FF4D00" }}
                >
                  {creating ? <Loader2 size={13} className="animate-spin" /> : null}
                  {creating ? "Provisioning Folders & Workspace..." : "Create Project"}
                </button>
              )}
            </div>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
