"use client";

import { useState } from "react";
import { IconPaperclip } from "@tabler/icons-react";
import { HomeLocationPicker } from "./home-location-picker";
import type { HomeLocationValue } from "./useHomeLocationPicker";
import { MKT_L_CONTAINER, MKT_L_H2, MKT_L_KICKER, MKT_L_LEDE } from "./marketing-styles-light";

const inputClass =
  "h-12 w-full rounded-[9px] border border-[var(--mkt-line)] bg-[var(--mkt-surface)] px-3.5 text-[15px] text-[var(--mkt-ink)] outline-none transition-colors placeholder:text-[var(--mkt-ink-muted)] focus:border-[var(--mkt-accent)]";
const labelClass = "text-[12.5px] font-semibold uppercase tracking-[0.04em] text-[var(--mkt-ink-muted)]";

export function HomeContactForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [location, setLocation] = useState<HomeLocationValue>({ address: "", lat: null, lng: null, boundary: [] });
  const [fileName, setFileName] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    setErrorMsg("");
    const form = e.currentTarget;
    const fd = new FormData(form);
    fd.set("projectLocation", location.address);
    if (location.lat != null) fd.set("lat", String(location.lat));
    if (location.lng != null) fd.set("lng", String(location.lng));
    if (location.boundary.length) fd.set("boundary", JSON.stringify(location.boundary));

    try {
      const res = await fetch("/api/site-visit-inquiry", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Something went wrong.");
      setStatus("sent");
      form.reset();
      setLocation({ address: "", lat: null, lng: null, boundary: [] });
      setFileName(null);
    } catch (err) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong — please try again.");
    }
  }

  if (status === "sent") {
    return (
      <section id="request-a-visit" className="border-y border-[var(--mkt-line)] bg-[var(--mkt-canvas-alt)] py-16 sm:py-20 lg:py-24">
        <div className={MKT_L_CONTAINER}>
          <div className="mx-auto max-w-md rounded-2xl border border-[var(--mkt-line)] bg-[var(--mkt-surface)] p-8 text-center">
            <h2 className="font-serif text-2xl font-normal text-[var(--mkt-ink)]">Thanks — request received.</h2>
            <p className="mt-2 text-[15px] text-[var(--mkt-ink-muted)]">We typically respond within one business day.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section id="request-a-visit" className="border-y border-[var(--mkt-line)] bg-[var(--mkt-canvas-alt)] py-16 sm:py-20 lg:py-24">
      <div className={MKT_L_CONTAINER}>
        <div className={MKT_L_KICKER}>Next step</div>
        <h2 className={MKT_L_H2}>Request a site visit</h2>
        <p className={MKT_L_LEDE}>Tell us about the site and what needs to be documented — we&rsquo;ll follow up with a plan and a quote.</p>

        <form onSubmit={handleSubmit} className="mt-8 rounded-2xl border border-[var(--mkt-line)] bg-[var(--mkt-surface)] p-6 sm:p-8">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Name"><input name="name" required className={inputClass} autoComplete="name" /></Field>
            <Field label="Company"><input name="company" className={inputClass} autoComplete="organization" /></Field>
            <Field label="Email"><input name="email" type="email" required className={inputClass} autoComplete="email" /></Field>
            <Field label="Phone"><input name="phone" type="tel" className={inputClass} autoComplete="tel" /></Field>
            <Field label="When you need us there">
              <select name="timeline" defaultValue="" className={inputClass}>
                <option value="" disabled>Select a timeframe</option>
                <option>This week</option>
                <option>Within a month</option>
                <option>1–3 months</option>
                <option>Planning ahead</option>
              </select>
            </Field>
            <Field label="Attachment (optional)">
              <label className={`${inputClass} flex cursor-pointer items-center gap-2 text-[var(--mkt-ink-muted)]`}>
                <IconPaperclip size={17} className="shrink-0" />
                <span className="truncate">{fileName ?? "Add a photo or PDF"}</span>
                <input
                  name="attachment"
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic,application/pdf"
                  className="hidden"
                  onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
                />
              </label>
            </Field>
            <div className="sm:col-span-2">
              <Field label="What's happening on site">
                <input name="whatIsHappening" placeholder="e.g. the ceiling before it closes, a pour before it's covered" className={inputClass} />
              </Field>
            </div>
          </div>

          <div className="mt-5">
            <div className={labelClass}>Project location</div>
            <p className="mt-1 text-[13px] text-[var(--mkt-ink-muted)]">
              Search an address, drop a pin, or outline the property — whatever&rsquo;s easiest.
            </p>
            <div className="mt-2.5">
              <HomeLocationPicker value={location} onChange={setLocation} />
            </div>
          </div>

          <div className="mt-5">
            <Field label="Anything else (optional)">
              <textarea name="notes" rows={3} className={`${inputClass} h-auto resize-y py-3`} />
            </Field>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-4">
            <button
              type="submit"
              disabled={status === "sending"}
              className="inline-flex h-12 items-center justify-center rounded-[10px] bg-[var(--mkt-accent)] px-6 text-[15px] font-semibold text-white transition-all hover:brightness-110 disabled:opacity-60"
            >
              {status === "sending" ? "Sending…" : "Request a site visit"}
            </button>
            <span className="text-[13px] text-[var(--mkt-ink-muted)]">We typically respond within one business day.</span>
          </div>
          {status === "error" ? <p className="mt-3 text-[13.5px] text-red-600">{errorMsg}</p> : null}
        </form>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className={labelClass}>{label}</span>
      {children}
    </label>
  );
}
