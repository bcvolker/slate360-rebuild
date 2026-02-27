"use client";

/**
 * CompanyProfileModal — lets users save their company/contact info once.
 * This data is persisted to localStorage and auto-fills forms across the app.
 */

import { useState } from "react";
import { Building2, Phone, Mail, Hash, User, MapPin, X, Save, CheckCircle2 } from "lucide-react";
import type { CompanyProfile } from "@/lib/hooks/useProjectProfile";

interface Props {
  open: boolean;
  onClose: () => void;
  initial: CompanyProfile;
  onSave: (profile: CompanyProfile) => void;
}

export default function CompanyProfileModal({ open, onClose, initial, onSave }: Props) {
  const [form, setForm] = useState<CompanyProfile>(initial);
  const [saved, setSaved] = useState(false);

  if (!open) return null;

  const handleSave = () => {
    onSave(form);
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 1200);
  };

  const f = (key: keyof CompanyProfile) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div>
            <h2 className="text-base font-black text-gray-900">Company & Contact Profile</h2>
            <p className="text-xs text-gray-400 mt-0.5">Saved locally — auto-fills all project forms</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
            <X size={16} />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[70vh] p-6 space-y-5">
          {/* Company info */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
              <Building2 size={12} /> Company Information
            </p>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700">Company Name</label>
                <input
                  value={form.companyName}
                  onChange={f("companyName")}
                  placeholder="Acme Construction LLC"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#FF4D00] focus:ring-1 focus:ring-[#FF4D00]/20"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700">Street Address</label>
                <input
                  value={form.companyAddress}
                  onChange={f("companyAddress")}
                  placeholder="123 Main St"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#FF4D00] focus:ring-1 focus:ring-[#FF4D00]/20"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">City</label>
                  <input value={form.companyCity} onChange={f("companyCity")} placeholder="Denver" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#FF4D00]" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">State</label>
                  <input value={form.companyState} onChange={f("companyState")} placeholder="CO" maxLength={2} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#FF4D00]" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">ZIP</label>
                  <input value={form.companyZip} onChange={f("companyZip")} placeholder="80202" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#FF4D00]" />
                </div>
              </div>
            </div>
          </div>

          {/* Contact info */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1.5">
              <User size={12} /> Primary Contact
            </p>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700">Contact Name</label>
                <input
                  value={form.contactName}
                  onChange={f("contactName")}
                  placeholder="John Smith"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#FF4D00] focus:ring-1 focus:ring-[#FF4D00]/20"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">
                    <Phone size={10} className="mr-1 inline" />Phone
                  </label>
                  <input value={form.companyPhone} onChange={f("companyPhone")} placeholder="(303) 555-0100" type="tel" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#FF4D00]" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-gray-700">
                    <Mail size={10} className="mr-1 inline" />Email
                  </label>
                  <input value={form.companyEmail} onChange={f("companyEmail")} placeholder="info@acme.com" type="email" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#FF4D00]" />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-gray-700">
                  <Hash size={10} className="mr-1 inline" />Contractor License #
                </label>
                <input value={form.licenseNumber} onChange={f("licenseNumber")} placeholder="GC-12345" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#FF4D00]" />
              </div>
            </div>
          </div>

          {/* Info note */}
          <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 flex items-start gap-2.5">
            <MapPin size={13} className="text-blue-400 mt-0.5 shrink-0" />
            <p className="text-[11px] text-blue-600">
              This profile is saved in your browser only. It auto-fills document forms, AIA contracts,
              daily logs, and other project templates so you don't have to type it every time.
            </p>
          </div>
        </div>

        <div className="border-t border-gray-100 px-6 py-4">
          <button
            onClick={handleSave}
            className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[#FF4D00] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#E64500] transition"
          >
            {saved ? <><CheckCircle2 size={15} /> Saved!</> : <><Save size={15} /> Save Profile</>}
          </button>
        </div>
      </div>
    </div>
  );
}
