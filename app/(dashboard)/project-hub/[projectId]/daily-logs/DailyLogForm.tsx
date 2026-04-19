"use client";

import { Loader2, MapPin, X } from "lucide-react";
import { useState } from "react";
import { type DailyLogFormData, weatherCodeLabel } from "./_shared";

interface Props {
  form: DailyLogFormData;
  setForm: React.Dispatch<React.SetStateAction<DailyLogFormData>>;
  editingId: string | null;
  saving: boolean;
  onSubmit: () => void;
  onClose: () => void;
}

const field = "w-full rounded-xl border border-zinc-700 bg-zinc-800 px-3.5 py-2.5 text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#F59E0B]/20 focus:border-[#F59E0B] transition-all disabled:opacity-50 disabled:cursor-not-allowed";
const label = "block text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5";

export default function DailyLogForm({ form, setForm, editingId, saving, onSubmit, onClose }: Props) {
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [weatherToast, setWeatherToast] = useState<string | null>(null);

  const set = (k: keyof DailyLogFormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm(p => ({ ...p, [k]: e.target.value }));

  const logCurrentWeather = async () => {
    setLoadingWeather(true);
    if (!navigator.geolocation) { setLoadingWeather(false); setWeatherToast("Geolocation not supported"); return; }
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude: lat, longitude: lon } = pos.coords;
      try {
        const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
        if (!r.ok) throw new Error();
        const j = await r.json();
        const c = j?.current_weather;
        if (!c) throw new Error();
        setForm(f => ({ ...f, weather_temp: String(Math.round(c.temperature)), weather_condition: weatherCodeLabel(Number(c.weathercode ?? -1)), weather_wind: `${c.windspeed} km/h`, weather_precip: "" }));
        setWeatherToast("Weather auto-filled");
      } catch { setWeatherToast("Unable to fetch weather"); }
      finally { setLoadingWeather(false); }
    }, () => { setLoadingWeather(false); setWeatherToast("Location unavailable"); }, { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 });
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-zinc-900 border-l border-zinc-800 shadow-xl overflow-y-auto animate-in slide-in-from-right duration-300">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-800 bg-zinc-900/95 backdrop-blur px-6 py-4">
          <h2 className="text-lg font-bold text-white">{editingId ? "Edit Log" : "New Daily Log"}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition"><X size={16} /></button>
        </div>
        <div className="space-y-4 p-6">
          <div><label className={label}>Date *</label><input type="date" className={field} value={form.log_date} onChange={set("log_date")} /></div>
          <div><label className={label}>Summary</label><textarea className={`${field} resize-y`} rows={3} value={form.summary} onChange={set("summary")} placeholder="Overall site activity and progress…" /></div>

          {/* Weather section */}
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold text-blue-400">Weather</p>
              <button type="button" onClick={logCurrentWeather} disabled={loadingWeather} className="inline-flex items-center gap-1 rounded-lg border border-blue-500/30 bg-blue-500/10 px-2.5 py-1.5 text-[10px] font-semibold text-blue-400 hover:bg-blue-500/20 disabled:opacity-60 transition">
                {loadingWeather ? <Loader2 size={10} className="animate-spin" /> : <MapPin size={10} />} Auto-fill
              </button>
            </div>
            {weatherToast && <p className="text-[10px] font-semibold text-blue-400">{weatherToast}</p>}
            <div className="grid grid-cols-2 gap-3">
              <div><label className="mb-1 block text-[10px] font-bold text-blue-500">Temp (°C)</label><input type="number" value={form.weather_temp} onChange={set("weather_temp")} className="w-full rounded-lg border border-blue-500/30 bg-zinc-800 px-3 py-1.5 text-sm text-white outline-none" /></div>
              <div><label className="mb-1 block text-[10px] font-bold text-blue-500">Condition</label><input type="text" value={form.weather_condition} onChange={set("weather_condition")} placeholder="Clear, Rain, etc." className="w-full rounded-lg border border-blue-500/30 bg-zinc-800 px-3 py-1.5 text-sm text-white outline-none" /></div>
              <div><label className="mb-1 block text-[10px] font-bold text-blue-500">Wind</label><input type="text" value={form.weather_wind} onChange={set("weather_wind")} placeholder="10 km/h" className="w-full rounded-lg border border-blue-500/30 bg-zinc-800 px-3 py-1.5 text-sm text-white outline-none" /></div>
              <div><label className="mb-1 block text-[10px] font-bold text-blue-500">Precipitation</label><input type="text" value={form.weather_precip} onChange={set("weather_precip")} placeholder="None, 5mm, etc." className="w-full rounded-lg border border-blue-500/30 bg-zinc-800 px-3 py-1.5 text-sm text-white outline-none" /></div>
            </div>
          </div>

          <div><label className={label}>Crew Counts (one per line: Trade: count)</label><textarea className={`${field} font-mono resize-y`} rows={3} value={form.crew_text} onChange={set("crew_text")} placeholder={"Electricians: 4\nPlumbers: 2\nIronworkers: 6"} /></div>
          <div><label className={label}>Equipment on Site (comma separated)</label><input className={field} value={form.equipment_text} onChange={set("equipment_text")} placeholder="Crane, Excavator, Boom Lift" /></div>
          <div><label className={label}>Visitors</label><input className={field} value={form.visitors} onChange={set("visitors")} placeholder="Inspector, Owner rep, etc." /></div>
          <div><label className={label}>Safety Observations</label><textarea className={`${field} resize-y`} rows={2} value={form.safety_observations} onChange={set("safety_observations")} placeholder="Any safety items noted on site…" /></div>
          <div><label className={label}>Delays</label><textarea className={`${field} resize-y`} rows={2} value={form.delays} onChange={set("delays")} placeholder="Weather delays, material shortages, etc." /></div>
        </div>
        <div className="sticky bottom-0 border-t border-zinc-800 bg-zinc-900/95 backdrop-blur px-6 py-4 flex items-center gap-3">
          <button disabled={saving || !form.log_date} onClick={onSubmit} className="flex-1 rounded-xl bg-[#F59E0B] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#e64500] transition disabled:opacity-40">{saving ? "Saving…" : editingId ? "Update Log" : "Save Daily Log"}</button>
          <button onClick={onClose} className="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-2.5 text-sm font-semibold text-zinc-300 hover:bg-zinc-700 transition">Cancel</button>
        </div>
      </div>
    </div>
  );
}
