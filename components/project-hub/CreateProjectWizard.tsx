"use client";

import { FormEvent, useMemo, useState } from "react";
import { APIProvider, Map, Marker } from "@vis.gl/react-google-maps";
import { Loader2, MapPin, X } from "lucide-react";

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
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [projectType, setProjectType] = useState("ground-up");
  const [contractType, setContractType] = useState("lump-sum");
  const [scope, setScope] = useState("");
  const [teamMemberIds, setTeamMemberIds] = useState<string[]>([]);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [address, setAddress] = useState("");
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

  const toggleMember = (memberId: string) => {
    setTeamMemberIds((prev) =>
      prev.includes(memberId) ? prev.filter((id) => id !== memberId) : [...prev, memberId]
    );
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

    if (!scope.trim()) {
      setLocalError("Scope is required.");
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
      <form
        onSubmit={submit}
        onClick={(event) => event.stopPropagation()}
        className="relative w-full max-w-3xl rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900">Create Project Wizard</h3>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 flex items-center justify-center"
          >
            <X size={16} />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">Project Name</label>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Maple Heights Residence"
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

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">Description</label>
            <input
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Optional"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/20 focus:border-[#FF4D00]"
            />
          </div>

          <div className="md:col-span-2">
            <label className="mb-1 block text-xs font-semibold text-gray-600">Scope</label>
            <textarea
              value={scope}
              onChange={(event) => setScope(event.target.value)}
              rows={3}
              placeholder="Describe project scope, key deliverables, and milestones"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/20 focus:border-[#FF4D00]"
            />
          </div>

          <div className="md:col-span-2 rounded-xl border border-gray-200 p-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-gray-700">Project Team Members</p>
                <p className="text-[11px] text-gray-500">Mocked contact list for wizard integration</p>
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

          <div className="md:col-span-2 rounded-xl border border-gray-200 p-3">
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-gray-700">Project Location</p>
                <p className="text-[11px] text-gray-500">Click map to drop pin and auto-fill address</p>
              </div>
              <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-2 py-0.5 text-[11px] text-gray-600">
                <MapPin size={11} />
                {lat && lng ? `${lat.toFixed(5)}, ${lng.toFixed(5)}` : "No pin set"}
              </span>
            </div>

            <div className="h-[260px] overflow-hidden rounded-xl border border-gray-200">
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

            <div className="mt-3">
              <label className="mb-1 block text-xs font-semibold text-gray-600">Address</label>
              <input
                value={address}
                onChange={(event) => setAddress(event.target.value)}
                placeholder="Manual address entry or reverse geocoded result"
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/20 focus:border-[#FF4D00]"
              />
            </div>
          </div>
        </div>

        {(localError || error) ? (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {localError || error}
          </div>
        ) : null}

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={creating}
            className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-white hover:opacity-90 disabled:opacity-50"
            style={{ backgroundColor: "#FF4D00" }}
          >
            {creating ? <Loader2 size={13} className="animate-spin" /> : null}
            {creating ? "Creating…" : "Create Project"}
          </button>
        </div>
      </form>
    </div>
  );
}
