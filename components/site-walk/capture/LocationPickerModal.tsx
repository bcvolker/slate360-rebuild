"use client";

import { useEffect, useState } from "react";
import { MapPin, X } from "lucide-react";

type Props = {
  open: boolean;
  currentLocation: string;
  recentLocations: string[];
  onClose: () => void;
  onSelect: (location: string) => void;
};

export function LocationPickerModal({ open, currentLocation, recentLocations, onClose, onSelect }: Props) {
  const [value, setValue] = useState(currentLocation);

  useEffect(() => {
    if (open) setValue(currentLocation);
  }, [currentLocation, open]);

  if (!open) return null;

  function submit(location: string) {
    const clean = location.trim();
    if (!clean) return;
    onSelect(clean);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex h-[100dvh] items-end justify-center overflow-hidden bg-slate-950/70 p-3 sm:items-center" role="dialog" aria-modal="true" aria-label="Choose capture location">
      <section className="flex max-h-[min(92dvh,620px)] w-full max-w-lg flex-col overflow-hidden rounded-[2rem] border border-slate-300 bg-white shadow-2xl">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-800">Move Location</p>
            <h2 className="truncate text-xl font-black text-slate-950">Where are you now?</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-slate-300 p-2 text-slate-700" aria-label="Close location picker"><X className="h-4 w-4" /></button>
        </header>

        <main className="min-h-0 flex-1 overflow-hidden p-4">
          <label className="block text-sm font-black text-slate-900">
            New location
            <input
              autoFocus
              value={value}
              onChange={(event) => setValue(event.target.value)}
              onKeyDown={(event) => { if (event.key === "Enter") submit(value); }}
              className="mt-2 w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base font-bold text-slate-950 outline-none focus:border-blue-700 focus:ring-2 focus:ring-blue-700/15"
              placeholder="AOB Room 206"
            />
          </label>

          <div className="mt-4 min-h-0 overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 p-3">
            <p className="mb-2 text-xs font-black uppercase tracking-[0.14em] text-slate-500">Recent Locations</p>
            <div className="grid max-h-56 gap-2 overflow-y-auto pr-1">
              {recentLocations.length > 0 ? recentLocations.map((location) => (
                <button key={location} type="button" onClick={() => submit(location)} className="flex items-center gap-3 rounded-2xl border border-slate-300 bg-white px-3 py-3 text-left text-sm font-black text-slate-900">
                  <MapPin className="h-4 w-4 shrink-0 text-blue-800" /> {location}
                </button>
              )) : <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm font-bold text-slate-600">No recent locations yet. Type the room, area, unit, or plan label above.</p>}
            </div>
          </div>
        </main>

        <footer className="grid shrink-0 grid-cols-2 gap-2 border-t border-slate-200 p-3">
          <button type="button" onClick={onClose} className="min-h-12 rounded-2xl border border-slate-300 bg-white px-4 text-sm font-black text-slate-800">Cancel</button>
          <button type="button" onClick={() => submit(value)} className="min-h-12 rounded-2xl bg-blue-600 px-4 text-sm font-black text-white">Use Location</button>
        </footer>
      </section>
    </div>
  );
}
