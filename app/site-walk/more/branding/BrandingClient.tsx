"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import { Loader2, Check, UploadCloud } from "lucide-react";

interface BrandSettings {
  logo_url: string;
  signature_url: string;
  primary_color: string;
  header_html: string;
  footer_html: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  address: string;
  website: string;
}

const DEFAULT_SETTINGS: BrandSettings = {
  logo_url: "",
  signature_url: "",
  primary_color: "#0047FF",
  header_html: "",
  footer_html: "",
  contact_name: "",
  contact_email: "",
  contact_phone: "",
  address: "",
  website: "",
};

const BRAND_KEYS: (keyof BrandSettings)[] = [
  "logo_url", "signature_url", "primary_color", "header_html", "footer_html",
  "contact_name", "contact_email", "contact_phone", "address", "website",
];

export function BrandingClient() {
  const [initialData, setInitialData] = useState<BrandSettings>(DEFAULT_SETTINGS);
  const [formData, setFormData] = useState<BrandSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [uploading, setUploading] = useState<"logo" | "signature" | null>(null);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch("/api/site-walk/branding/settings");
        if (res.ok) {
          const data = await res.json();
          if (data.brand_settings) {
            const merged = { ...DEFAULT_SETTINGS, ...data.brand_settings };
            setInitialData(merged);
            setFormData(merged);
          }
        }
      } catch (err) {
        console.error("Failed to fetch branding settings", err);
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const isDirty = BRAND_KEYS.some((k) => formData[k] !== initialData[k]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: "logo" | "signature") => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(type);
    const payload = new FormData();
    payload.append("file", file);
    payload.append("type", type);
    try {
      const res = await fetch("/api/site-walk/branding", { method: "POST", body: payload });
      if (res.ok) {
        const data = await res.json();
        const url: string = data.url ?? "";
        if (url) {
          setFormData((prev) => ({ ...prev, [`${type}_url`]: url }));
        }
      }
    } catch (err) {
      console.error(`Failed to upload ${type}`, err);
    } finally {
      setUploading(null);
    }
  };

  const handleSave = async () => {
    setSaveStatus("saving");
    try {
      const res = await fetch("/api/site-walk/branding/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: formData }),
      });
      if (res.ok) {
        setInitialData(formData);
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 1500);
      } else {
        setSaveStatus("idle");
      }
    } catch (err) {
      console.error("Failed to save settings", err);
      setSaveStatus("idle");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-cobalt" />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      {/* Live Preview */}
      <div className="bg-card border border-border rounded-xl p-6 shadow-sm">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Live Preview</h2>
        <div className="p-6 border border-border rounded-lg bg-background flex flex-col items-center text-center space-y-4">
          {formData.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={formData.logo_url} alt="Logo" className="max-h-16 object-contain" />
          ) : (
            <div className="h-16 w-16 bg-glass rounded-lg flex items-center justify-center text-muted-foreground text-xs border border-dashed border-border">Logo</div>
          )}
          <h3 className="text-xl font-bold" style={{ color: formData.primary_color || "#0047FF" }}>
            {formData.contact_name || "Company Name"}
          </h3>
          <p className="text-sm text-muted-foreground">
            {[formData.contact_email, formData.contact_phone, formData.website].filter(Boolean).join(" | ") || "Contact info will appear here"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h3 className="text-lg font-medium text-foreground border-b border-border pb-2">Contact Details</h3>
          {([
            ["contact_name", "Company / Contact Name", "text"],
            ["contact_email", "Contact Email", "email"],
            ["contact_phone", "Contact Phone", "text"],
            ["address", "Address", "text"],
            ["website", "Website", "text"],
          ] as const).map(([key, label, type]) => (
            <div key={key} className="space-y-1.5">
              <label className="text-sm text-muted-foreground">{label}</label>
              <input
                type={type}
                value={formData[key]}
                onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground focus:border-cobalt outline-none"
              />
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-medium text-foreground border-b border-border pb-2">Visuals & Layout</h3>

          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">Primary Color</label>
            <div className="flex gap-3 items-center">
              <input type="color" value={formData.primary_color} onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })} className="h-10 w-10 rounded cursor-pointer bg-transparent border-0 p-0" />
              <input type="text" value={formData.primary_color} onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })} className="flex-1 bg-background border border-border rounded-md px-3 py-2 text-foreground focus:border-cobalt outline-none uppercase" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            {(["logo", "signature"] as const).map((kind) => (
              <div key={kind} className="space-y-1.5">
                <label className="text-sm text-muted-foreground capitalize">{kind}</label>
                <label className="flex items-center justify-center gap-2 h-10 w-full bg-slate-50 border border-dashed border-slate-300 rounded-md text-sm text-slate-700 cursor-pointer hover:border-cobalt hover:text-cobalt hover:bg-cobalt/5 transition-colors">
                  {uploading === kind ? <Loader2 className="w-4 h-4 animate-spin text-cobalt" /> : <UploadCloud className="w-4 h-4 text-muted-foreground" />}
                  {formData[`${kind}_url`] ? `Replace ${kind}` : `Upload ${kind}`}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleUpload(e, kind)} />
                </label>
              </div>
            ))}
          </div>

          <div className="space-y-1.5 pt-4">
            <label className="text-sm text-muted-foreground">Custom Header HTML</label>
            <textarea rows={4} value={formData.header_html} onChange={(e) => setFormData({ ...formData, header_html: e.target.value })} className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground font-mono text-xs focus:border-cobalt outline-none resize-none" placeholder="<div>Custom Header</div>" />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm text-muted-foreground">Custom Footer HTML</label>
            <textarea rows={4} value={formData.footer_html} onChange={(e) => setFormData({ ...formData, footer_html: e.target.value })} className="w-full bg-background border border-border rounded-md px-3 py-2 text-foreground font-mono text-xs focus:border-cobalt outline-none resize-none" placeholder="<div>Custom Footer</div>" />
          </div>
        </div>
      </div>

      {/* Sticky Save Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-card border-t border-border flex justify-end z-40 px-4 sm:px-8">
        <button
          onClick={handleSave}
          disabled={!isDirty || saveStatus !== "idle"}
          className="flex items-center justify-center gap-2 bg-cobalt text-primary-foreground px-6 py-2.5 rounded-lg font-medium hover:bg-cobalt/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all w-full sm:w-auto min-w-[140px]"
        >
          {saveStatus === "saving" && <Loader2 className="w-4 h-4 animate-spin" />}
          {saveStatus === "saved" && <Check className="w-4 h-4" />}
          {saveStatus === "saved" ? "Saved ✓" : "Save Changes"}
        </button>
      </div>
    </div>
  );
}

// Suppress unused import warning while keeping the option open for native <Image>.
void Image;
