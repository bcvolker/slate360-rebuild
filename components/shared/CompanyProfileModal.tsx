"use client";

/**
 * CompanyProfileModal — lets users save their company/contact info once.
 * This data is persisted to localStorage and auto-fills forms across the app.
 */

import { useState } from "react";
import { Building2, Phone, Mail, Hash, User, MapPin, X, Save, CheckCircle2 } from "lucide-react";
import type { CompanyProfile } from "@/lib/hooks/useProjectProfile";
import {
  darkButtonClass,
  darkFieldClass,
  darkFieldLabelClass,
  darkModalOverlayClass,
  darkModalPanelClass,
  darkSectionLabelClass,
} from "@/components/ui/dark-surface-styles";

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
    <div className={darkModalOverlayClass} onClick={onClose}>
      <div
        className={darkModalPanelClass("max-w-lg")}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <h2 className="text-base font-black text-[var(--graphite-text-header)]">Company &amp; Contact Profile</h2>
            <p className="mt-0.5 text-xs text-[var(--graphite-muted)]">Saved locally — auto-fills all project forms</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[var(--graphite-muted)] hover:bg-white/10 hover:text-[var(--graphite-text-header)]">
            <X size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-6">
          {/* Company info */}
          <div>
            <p className={darkSectionLabelClass}>
              <Building2 size={12} /> Company Information
            </p>
            <div className="space-y-3">
              <div>
                <label className={darkFieldLabelClass}>Company Name</label>
                <input
                  value={form.companyName}
                  onChange={f("companyName")}
                  placeholder="Acme Construction LLC"
                  className={darkFieldClass()}
                />
              </div>
              <div>
                <label className={darkFieldLabelClass}>Street Address</label>
                <input
                  value={form.companyAddress}
                  onChange={f("companyAddress")}
                  placeholder="123 Main St"
                  className={darkFieldClass()}
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={darkFieldLabelClass}>City</label>
                  <input value={form.companyCity} onChange={f("companyCity")} placeholder="Denver" className={darkFieldClass()} />
                </div>
                <div>
                  <label className={darkFieldLabelClass}>State</label>
                  <input value={form.companyState} onChange={f("companyState")} placeholder="CO" maxLength={2} className={darkFieldClass()} />
                </div>
                <div>
                  <label className={darkFieldLabelClass}>ZIP</label>
                  <input value={form.companyZip} onChange={f("companyZip")} placeholder="80202" className={darkFieldClass()} />
                </div>
              </div>
            </div>
          </div>

          {/* Contact info */}
          <div>
            <p className={darkSectionLabelClass}>
              <User size={12} /> Primary Contact
            </p>
            <div className="space-y-3">
              <div>
                <label className={darkFieldLabelClass}>Contact Name</label>
                <input
                  value={form.contactName}
                  onChange={f("contactName")}
                  placeholder="John Smith"
                  className={darkFieldClass()}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={darkFieldLabelClass}>
                    <Phone size={10} className="mr-1 inline" />Phone
                  </label>
                  <input value={form.companyPhone} onChange={f("companyPhone")} placeholder="(303) 555-0100" type="tel" className={darkFieldClass()} />
                </div>
                <div>
                  <label className={darkFieldLabelClass}>
                    <Mail size={10} className="mr-1 inline" />Email
                  </label>
                  <input value={form.companyEmail} onChange={f("companyEmail")} placeholder="info@acme.com" type="email" className={darkFieldClass()} />
                </div>
              </div>
              <div>
                <label className={darkFieldLabelClass}>
                  <Hash size={10} className="mr-1 inline" />Contractor License #
                </label>
                <input value={form.licenseNumber} onChange={f("licenseNumber")} placeholder="GC-12345" className={darkFieldClass()} />
              </div>
            </div>
          </div>

          {/* Info note */}
          <div className="flex items-start gap-2.5 rounded-xl border border-[color-mix(in_srgb,var(--graphite-primary)_22%,transparent)] bg-[color-mix(in_srgb,var(--graphite-primary)_8%,transparent)] p-3">
            <MapPin size={13} className="mt-0.5 shrink-0 text-[var(--graphite-primary)]" />
            <p className="text-[11px] text-[var(--graphite-text-body)]">
              This profile is saved in your browser only. It auto-fills document forms, AIA contracts,
              daily logs, and other project templates so you don't have to type it every time.
            </p>
          </div>
        </div>

        <div className="shrink-0 border-t border-white/10 px-6 py-4">
          <button onClick={handleSave} className={darkButtonClass("primary", "w-full")}>
            {saved ? <><CheckCircle2 size={15} /> Saved!</> : <><Save size={15} /> Save Profile</>}
          </button>
        </div>
      </div>
    </div>
  );
}
