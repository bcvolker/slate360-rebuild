"use client";

import { FormEvent, useMemo, useState } from "react";
import { APIProvider, Map, Marker } from "@vis.gl/react-google-maps";
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
  const [customPhases, setCustomPhases] = useState("");
  const [teamMemberIds, setTeamMemberIds] = useState<string[]>([]);
  const [teamEmails, setTeamEmails] = useState<string[]>([]);
  const [emailInput, setEmailInput] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [address, setAddress] = useState("");
  const [currentStep, setCurrentStep] = useState(1);
  const [localError, setLocalError] = useState<string | null>(null);

  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

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
        drag
        dragMomentum={false}
        dragConstraints={{ left: -220, right: 220, top: -180, bottom: 180 }}
        onClick={(event) => event.stopPropagation()}
        className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-white/60 bg-white/95 shadow-2xl backdrop-blur-md"
      >
        <div className="flex items-center justify-between border-b border-gray-200/80 bg-white/80 px-4 py-3">
          <div className="flex items-center gap-2 text-gray-400">
            <GripHorizontal size={16} />
            <span className="text-xs font-semibold uppercase tracking-wide">Drag</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 flex items-center justify-center"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={submit} className="p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-gray-900">Super Project Wizard</h3>
              <p className="text-xs text-gray-500 mt-1">Step {currentStep} of {totalSteps}</p>
            </div>
            <div className="flex items-center gap-1.5">
              {Array.from({ length: totalSteps }).map((_, index) => {
                const step = index + 1;
                return (
                  <span
                    key={step}
                    className={`h-2.5 w-2.5 rounded-full ${step <= currentStep ? "bg-[#FF4D00]" : "bg-gray-200"}`}
                  />
                );
              })}
            </div>
          </div>

          <div className="mt-5">
            {currentStep === 1 && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600">Project Name *</label>
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="e.g. Maple Heights Residence"
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/20 focus:border-[#FF4D00]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600">Description</label>
                  <input
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="Optional"
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/20 focus:border-[#FF4D00]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600">Project Type</label>
                  <select
                    value={projectType}
                    onChange={(event) => setProjectType(event.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/20 focus:border-[#FF4D00]"
                  >
                    <option value="ground-up">Ground-up</option>
                    <option value="renovation">Renovation</option>
                    <option value="tenant-improvement">Tenant Improvement</option>
                    <option value="infrastructure">Infrastructure</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600">Contract Type</label>
                  <select
                    value={contractType}
                    onChange={(event) => setContractType(event.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/20 focus:border-[#FF4D00]"
                  >
                    <option value="lump-sum">Lump Sum</option>
                    <option value="gmp">GMP</option>
                    <option value="cost-plus">Cost Plus</option>
                    <option value="time-material">Time &amp; Material</option>
                  </select>
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="rounded-xl border border-gray-200 p-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold text-gray-700">Project Location</p>
                    <p className="text-[11px] text-gray-500">Type an address or click map to set a pin</p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-2 py-0.5 text-[11px] text-gray-600">
                    <MapPin size={11} />
                    {lat && lng ? `${lat.toFixed(5)}, ${lng.toFixed(5)}` : "No pin set"}
                  </span>
                </div>

                <div className="mb-3">
                  <label className="mb-1 block text-xs font-semibold text-gray-600">Address</label>
                  <input
                    value={address}
                    onChange={(event) => setAddress(event.target.value)}
                    placeholder="Manual address entry or reverse geocoded result"
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/20 focus:border-[#FF4D00]"
                  />
                </div>

                <div className="h-[280px] overflow-hidden rounded-xl border border-gray-200">
                  <APIProvider apiKey={googleMapsApiKey} libraries={["places"]}>
                    <Map
                      defaultCenter={mapCenter}
                      defaultZoom={4}
                      center={mapCenter}
                      onClick={handleMapClick}
                      disableDefaultUI
                      gestureHandling="greedy"
                    >
                      {lat && lng ? <Marker position={{ lat, lng }} /> : null}
                    </Map>
                  </APIProvider>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600">Estimated Budget</label>
                  <input
                    value={estimatedBudget}
                    onChange={(event) => setEstimatedBudget(event.target.value)}
                    placeholder="e.g. $4,500,000"
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600">Target Start Date</label>
                  <input
                    type="date"
                    value={targetStartDate}
                    onChange={(event) => setTargetStartDate(event.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-600">Target End Date</label>
                  <input
                    type="date"
                    value={targetEndDate}
                    onChange={(event) => setTargetEndDate(event.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs font-semibold text-gray-600">Custom Project Phases</label>
                  <textarea
                    rows={4}
                    value={customPhases}
                    onChange={(event) => setCustomPhases(event.target.value)}
                    placeholder="One phase per line (e.g. Precon, Foundation, Framing...)"
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm resize-none"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs font-semibold text-gray-600">Scope</label>
                  <textarea
                    value={scope}
                    onChange={(event) => setScope(event.target.value)}
                    rows={3}
                    placeholder="Optional scope summary"
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm resize-none"
                  />
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="space-y-4">
                <div className="rounded-xl border border-gray-200 p-3">
                  <label className="mb-1 block text-xs font-semibold text-gray-600">Add Team Email</label>
                  <div className="flex items-center gap-2">
                    <input
                      value={emailInput}
                      onChange={(event) => setEmailInput(event.target.value)}
                      placeholder="name@company.com"
                      className="flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
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
                          className="rounded-full border border-gray-200 bg-gray-50 px-2 py-1 text-[11px] text-gray-700"
                        >
                          {email} ×
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-gray-200 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold text-gray-700">Select from Contacts</p>
                      <p className="text-[11px] text-gray-500">Mock list for now</p>
                    </div>
                    <span className="rounded-full border border-gray-200 px-2 py-0.5 text-[11px] text-gray-600">
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
                              : "border-gray-200 bg-white hover:bg-gray-50"
                          }`}
                        >
                          <div>
                            <p className="font-semibold text-gray-800">{member.name}</p>
                            <p className="text-xs text-gray-500">{member.role}</p>
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
              <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
                <h4 className="font-bold text-gray-900">Review Project Setup</h4>
                <p><span className="font-semibold text-gray-900">Name:</span> {name || "—"}</p>
                <p><span className="font-semibold text-gray-900">Description:</span> {description || "—"}</p>
                <p><span className="font-semibold text-gray-900">Type:</span> {projectType}</p>
                <p><span className="font-semibold text-gray-900">Contract:</span> {contractType}</p>
                <p><span className="font-semibold text-gray-900">Address:</span> {address || "—"}</p>
                <p><span className="font-semibold text-gray-900">Coordinates:</span> {lat && lng ? `${lat.toFixed(5)}, ${lng.toFixed(5)}` : "—"}</p>
                <p><span className="font-semibold text-gray-900">Budget:</span> {estimatedBudget || "—"}</p>
                <p><span className="font-semibold text-gray-900">Schedule:</span> {targetStartDate || "—"} → {targetEndDate || "—"}</p>
                <p><span className="font-semibold text-gray-900">Team:</span> {teamMemberIds.length + teamEmails.length} members/contacts</p>
                <p className="text-xs text-gray-500">Canonical project folders will be auto-provisioned in the background.</p>
              </div>
            )}
          </div>

          {(localError || error) ? (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {localError || error}
            </div>
          ) : null}

          <div className="mt-5 flex items-center justify-between gap-2">
            <div>
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={prevStep}
                  className="inline-flex items-center gap-1 rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
                >
                  <ChevronLeft size={13} /> Back
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
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
