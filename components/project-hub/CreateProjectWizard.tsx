"use client";

import { FormEvent, useMemo, useState } from "react";
import { APIProvider, AdvancedMarker, Map } from "@vis.gl/react-google-maps";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, GripHorizontal, Loader2, MapPin, Plus, X } from "lucide-react";

export type CreateProjectPayload = {
  name: string;
  description: string;
  metadata: Record<string, any>;
};

export default function CreateProjectWizard({
  open, creating, error, onClose, onSubmit,
}: {
  open: boolean; creating: boolean; error: string | null;
  onClose: () => void; onSubmit: (payload: CreateProjectPayload) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [projectType, setProjectType] = useState("ground-up");
  const [contractType, setContractType] = useState("cmar");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [currentStep, setCurrentStep] = useState(1);

  const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  const mapCenter = useMemo(() => ({ lat: lat ?? 39.5, lng: lng ?? -98.35 }), [lat, lng]);

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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      {/* The main wrapper is NOT draggable, preventing the map bug */}
      <div 
        onClick={(e) => e.stopPropagation()} 
        className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl text-slate-100 flex flex-col"
      >
        {/* ONLY this header is draggable */}
        <motion.div drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0} className="flex items-center justify-between border-b border-slate-700 bg-slate-800 px-4 py-3 cursor-grab active:cursor-grabbing">
          <div className="flex items-center gap-2 text-slate-400">
            <GripHorizontal size={16} />
            <span className="text-xs font-bold uppercase tracking-wide">Drag to move</span>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white"><X size={18} /></button>
        </motion.div>

        <form onSubmit={submit} className="p-6">
          <div className="mb-6">
            <h3 className="text-xl font-black text-white">Create New Project</h3>
            <p className="text-sm text-slate-400">Step {currentStep} of 2</p>
          </div>

          {currentStep === 1 && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-slate-300">Project Name *</label>
                <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Maple Heights Residence" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white focus:border-[#FF4D00] focus:ring-1 focus:ring-[#FF4D00]" />
              </div>
              <div className="md:col-span-2">
                <label className="mb-1 block text-xs font-semibold text-slate-300">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Optional scope summary" className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white focus:border-[#FF4D00] focus:ring-1 focus:ring-[#FF4D00]" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-300">Contract Type</label>
                <select value={contractType} onChange={(e) => setContractType(e.target.value)} className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white focus:border-[#FF4D00] focus:ring-1 focus:ring-[#FF4D00]">
                  <option value="cmar">CMAR (Manager at Risk)</option>
                  <option value="design-build">Design-Build</option>
                  <option value="lump-sum">Lump Sum / Fixed Price</option>
                  <option value="gmp">GMP</option>
                </select>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-300">Project Address</label>
                <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Type an address..." className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm text-white focus:border-[#FF4D00] focus:ring-1 focus:ring-[#FF4D00]" />
              </div>
              <div className="h-[300px] w-full rounded-xl border border-slate-700 overflow-hidden bg-slate-800">
                <APIProvider apiKey={googleMapsApiKey}>
                  <Map mapId="DEMO_MAP_ID" defaultCenter={mapCenter} defaultZoom={4} center={mapCenter} disableDefaultUI onClick={(e) => { setLat(e.detail.latLng?.lat ?? null); setLng(e.detail.latLng?.lng ?? null); }}>
                    {lat && lng && <AdvancedMarker position={{ lat, lng }} />}
                  </Map>
                </APIProvider>
              </div>
            </div>
          )}

          <div className="mt-8 flex justify-between">
            {currentStep > 1 ? (
              <button type="button" onClick={() => setCurrentStep(1)} className="rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-slate-800">Back</button>
            ) : <div />}
            
            {currentStep < 2 ? (
              <button type="button" onClick={() => setCurrentStep(2)} disabled={!name} className="rounded-xl bg-[#FF4D00] px-6 py-2 text-sm font-bold text-white hover:bg-[#E64500] disabled:opacity-50">Next</button>
            ) : (
              <button type="submit" disabled={creating} className="flex items-center gap-2 rounded-xl bg-[#FF4D00] px-6 py-2 text-sm font-bold text-white hover:bg-[#E64500] disabled:opacity-50">
                {creating && <Loader2 size={14} className="animate-spin" />}
                {creating ? "Provisioning Folders..." : "Create Project"}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}