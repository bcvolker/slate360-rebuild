"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { APIProvider, AdvancedMarker, Map } from "@vis.gl/react-google-maps";
import { ChevronLeft, ChevronRight, Loader2, MapPin, X } from "lucide-react";

export type CreateProjectPayload = {
  name: string;
  description: string;
  metadata: Record<string, any>;
};

/**
 * CreateProjectWizard
 * - Does NOT close on backdrop click (prevents accidental data loss)
 * - Reverse-geocodes map clicks to populate both coordinates and address
 * - Light-themed UI consistent with the rest of the app
 * - Structured for future step expansion
 */
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
  const [contractType, setContractType] = useState("cmar");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);

  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  const mapId = process.env.NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID || "DEMO_MAP_ID";
  const mapCenter = useMemo(() => ({ lat: lat ?? 39.5, lng: lng ?? -98.35 }), [lat, lng]);

  // Reset state when wizard is closed then reopened
  const prevOpen = useRef(open);
  useEffect(() => {
    if (open && !prevOpen.current) {
      setName("");
      setDescription("");
      setProjectType("ground-up");
      setContractType("cmar");
      setAddress("");
      setLat(null);
      setLng(null);
      setCurrentStep(1);
    }
    prevOpen.current = open;
  }, [open]);

  // Reverse-geocode a lat/lng to get an address string
  const reverseGeocode = useCallback(
    async (latitude: number, longitude: number) => {
      setIsReverseGeocoding(true);
      try {
        const res = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${googleMapsApiKey}`
        );
        const data = await res.json();
        if (data.status === "OK" && data.results?.[0]) {
          setAddress(data.results[0].formatted_address);
        } else {
          setAddress(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
        }
      } catch {
        setAddress(`${latitude.toFixed(5)}, ${longitude.toFixed(5)}`);
      } finally {
        setIsReverseGeocoding(false);
      }
    },
    [googleMapsApiKey]
  );

  const handleMapClick = useCallback(
    (e: any) => {
      const clickLat = e.detail.latLng?.lat ?? null;
      const clickLng = e.detail.latLng?.lng ?? null;
      setLat(clickLat);
      setLng(clickLng);
      if (clickLat !== null && clickLng !== null) {
        void reverseGeocode(clickLat, clickLng);
      }
    },
    [reverseGeocode]
  );

  if (!open) return null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await onSubmit({
      name: name.trim(),
      description: description.trim(),
      metadata: { projectType, contractType, location: { address, lat, lng } },
    });
  };

  const totalSteps = 2;

  return (
    /* Backdrop — does NOT close on click */
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl text-gray-900 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-5 py-4">
          <div>
            <h3 className="text-lg font-black text-gray-900">Create New Project</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Step {currentStep} of {totalSteps}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-200 hover:text-gray-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Step progress bar */}
        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-[#FF4D00] transition-all duration-300"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>

        {/* Body — scrollable */}
        <form onSubmit={submit} className="flex-1 overflow-y-auto p-5 sm:p-6">
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
              {error}
            </div>
          )}

          {currentStep === 1 && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                  Project Name <span className="text-red-500">*</span>
                </label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="e.g. Maple Heights Residence"
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#FF4D00] focus:ring-2 focus:ring-[#FF4D00]/20 focus:outline-none transition-all"
                />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional scope summary"
                  rows={3}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#FF4D00] focus:ring-2 focus:ring-[#FF4D00]/20 focus:outline-none transition-all resize-none"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                  Project Type
                </label>
                <select
                  value={projectType}
                  onChange={(e) => setProjectType(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:border-[#FF4D00] focus:ring-2 focus:ring-[#FF4D00]/20 focus:outline-none transition-all"
                >
                  <option value="ground-up">Ground-Up Construction</option>
                  <option value="renovation">Renovation / Remodel</option>
                  <option value="interior">Interior Build-Out</option>
                  <option value="infrastructure">Infrastructure</option>
                  <option value="residential">Residential</option>
                  <option value="commercial">Commercial</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                  Contract Type
                </label>
                <select
                  value={contractType}
                  onChange={(e) => setContractType(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:border-[#FF4D00] focus:ring-2 focus:ring-[#FF4D00]/20 focus:outline-none transition-all"
                >
                  <option value="cmar">CMAR (Manager at Risk)</option>
                  <option value="design-build">Design-Build</option>
                  <option value="lump-sum">Lump Sum / Fixed Price</option>
                  <option value="gmp">GMP</option>
                  <option value="cost-plus">Cost Plus</option>
                  <option value="time-materials">Time &amp; Materials</option>
                </select>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-700">
                  Project Address
                </label>
                <div className="relative">
                  <input
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Type an address or click the map to set location..."
                    className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#FF4D00] focus:ring-2 focus:ring-[#FF4D00]/20 focus:outline-none transition-all pr-10"
                  />
                  {isReverseGeocoding && (
                    <Loader2
                      size={14}
                      className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-gray-400"
                    />
                  )}
                </div>
                {lat !== null && lng !== null && (
                  <p className="mt-1.5 text-[11px] text-gray-500 flex items-center gap-1.5">
                    <MapPin size={11} className="text-[#FF4D00]" />
                    Coordinates: {lat.toFixed(5)}, {lng.toFixed(5)}
                  </p>
                )}
              </div>
              <div className="h-[300px] sm:h-[350px] w-full rounded-xl border border-gray-200 overflow-hidden bg-gray-100">
                {googleMapsApiKey ? (
                  <APIProvider apiKey={googleMapsApiKey}>
                    <Map
                      mapId={mapId}
                      defaultCenter={mapCenter}
                      defaultZoom={4}
                      center={lat !== null && lng !== null ? mapCenter : undefined}
                      zoom={lat !== null && lng !== null ? 15 : undefined}
                      disableDefaultUI
                      onClick={handleMapClick}
                    >
                      {lat !== null && lng !== null && <AdvancedMarker position={{ lat, lng }} />}
                    </Map>
                  </APIProvider>
                ) : (
                  <div className="h-full w-full flex items-center justify-center text-xs text-gray-500 px-4 text-center">
                    Google Maps is unavailable because NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not configured.
                  </div>
                )}
              </div>
              <p className="text-[10px] text-gray-400">
                Click the map to place a pin. The address will auto-populate from the coordinates.
              </p>
            </div>
          )}
        </form>

        {/* Footer — navigation buttons */}
        <div className="border-t border-gray-100 bg-gray-50 px-5 py-4 flex items-center justify-between">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={() => setCurrentStep((s) => s - 1)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all"
            >
              <ChevronLeft size={14} /> Back
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
          )}

          {currentStep < totalSteps ? (
            <button
              type="button"
              onClick={() => setCurrentStep((s) => s + 1)}
              disabled={!name.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#FF4D00] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#E64500] disabled:opacity-50 transition-all"
            >
              Next <ChevronRight size={14} />
            </button>
          ) : (
            <button
              type="submit"
              disabled={creating || !name.trim()}
              className="inline-flex items-center gap-2 rounded-xl bg-[#FF4D00] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#E64500] disabled:opacity-50 transition-all"
            >
              {creating && <Loader2 size={14} className="animate-spin" />}
              {creating ? "Provisioning…" : "Create Project"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}