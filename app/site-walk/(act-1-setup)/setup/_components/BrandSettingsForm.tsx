"use client";

import { useState, type FormEvent } from "react";
import type { BrandSettings, SubmitState } from "./setup-types";

type BrandSettingsResponse = { brand_settings?: BrandSettings; error?: string };

type Props = {
  initialSettings: BrandSettings;
};

const inputClass = "w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15";

export function BrandSettingsForm({ initialSettings }: Props) {
  const [settings, setSettings] = useState<BrandSettings>(initialSettings);
  const [status, setStatus] = useState<SubmitState>({ kind: "idle" });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus({ kind: "loading", message: "Saving company identity…" });
    try {
      const save = await fetch("/api/site-walk/branding/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!save.ok) throw new Error(await readError(save));

      const readback = await fetch("/api/site-walk/branding/settings", { cache: "no-store" });
      if (!readback.ok) throw new Error(await readError(readback));
      const data = (await readback.json()) as BrandSettingsResponse;
      setSettings(data.brand_settings ?? {});
      setStatus({ kind: "ok", message: "Company identity saved and read back from Slate360." });
    } catch (error) {
      setStatus({ kind: "error", message: error instanceof Error ? error.message : "Could not save branding." });
    }
  }

  function update<K extends keyof BrandSettings>(key: K, value: BrandSettings[K]) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-3xl border border-slate-300 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-800">Company identity</p>
          <h2 className="mt-1 text-xl font-black text-slate-900">Brand defaults</h2>
          <p className="mt-1 text-sm leading-6 text-slate-700">Shared org branding flows into reports, proposals, and punch lists.</p>
        </div>
        <button type="submit" disabled={status.kind === "loading"} className="rounded-xl bg-blue-700 px-4 py-2 text-sm font-black text-white shadow-sm transition hover:bg-blue-800 disabled:opacity-60">
          {status.kind === "loading" ? "Saving…" : "Save identity"}
        </button>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <Field label="Contact name"><input className={inputClass} value={settings.contact_name ?? ""} onChange={(e) => update("contact_name", e.target.value)} placeholder="Jordan Lee" /></Field>
        <Field label="Contact email"><input className={inputClass} value={settings.contact_email ?? ""} onChange={(e) => update("contact_email", e.target.value)} placeholder="field@company.com" type="email" /></Field>
        <Field label="Contact phone"><input className={inputClass} value={settings.contact_phone ?? ""} onChange={(e) => update("contact_phone", e.target.value)} placeholder="(555) 010-4200" /></Field>
        <Field label="Website"><input className={inputClass} value={settings.website ?? ""} onChange={(e) => update("website", e.target.value)} placeholder="https://company.com" /></Field>
        <Field label="Primary color"><input className={inputClass} value={settings.primary_color ?? "#2563EB"} onChange={(e) => update("primary_color", e.target.value)} placeholder="#2563EB" /></Field>
        <Field label="Logo URL"><input className={inputClass} value={settings.logo_url ?? ""} onChange={(e) => update("logo_url", e.target.value)} placeholder="Upload route can set this automatically" /></Field>
        <div className="md:col-span-2"><Field label="Business address"><textarea className={`${inputClass} min-h-20`} value={settings.address ?? ""} onChange={(e) => update("address", e.target.value)} placeholder="Street, suite, city, state" /></Field></div>
      </div>

      <StatusMessage status={status} />
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm font-bold text-slate-900"><span className="mb-1 block">{label}</span>{children}</label>;
}

function StatusMessage({ status }: { status: SubmitState }) {
  if (status.kind === "idle" || status.kind === "loading") return null;
  const color = status.kind === "ok" ? "text-emerald-700" : "text-rose-700";
  return <p className={`mt-4 text-sm font-semibold ${color}`}>{status.message}</p>;
}

async function readError(response: Response) {
  const data = (await response.json().catch(() => null)) as { error?: string } | null;
  return data?.error ?? "Request failed";
}
