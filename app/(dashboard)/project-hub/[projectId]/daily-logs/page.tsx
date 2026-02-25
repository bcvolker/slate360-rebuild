"use client";

import { FormEvent, useState } from "react";
import { useParams } from "next/navigation";
import { CloudSun, Loader2, MapPin } from "lucide-react";

function weatherCodeLabel(code: number): string {
  if (code === 0) return "Clear";
  if ([1, 2].includes(code)) return "Partly cloudy";
  if ([3].includes(code)) return "Cloudy";
  if ([45, 48].includes(code)) return "Fog";
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return "Rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow";
  if ([95, 96, 99].includes(code)) return "Thunderstorm";
  return "Unknown";
}

export default function DailyLogsPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params?.projectId;

  const [entryDate, setEntryDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [summary, setSummary] = useState("");
  const [weatherText, setWeatherText] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingWeather, setLoadingWeather] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const logCurrentWeather = async () => {
    setStatus(null);
    setLoadingWeather(true);

    if (!navigator.geolocation) {
      setLoadingWeather(false);
      setStatus("Geolocation is not supported in this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;

        try {
          const weatherResponse = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`
          );
          if (!weatherResponse.ok) throw new Error("Weather API request failed");

          const weatherJson = await weatherResponse.json();
          const current = weatherJson?.current_weather;

          if (!current) throw new Error("Weather payload missing current_weather");

          const text = [
            `Location: ${lat.toFixed(4)}, ${lon.toFixed(4)}`,
            `Temperature: ${current.temperature}°C`,
            `Wind: ${current.windspeed} km/h`,
            `Condition: ${weatherCodeLabel(Number(current.weathercode ?? -1))}`,
            `Observed: ${current.time}`,
          ].join(" | ");

          setWeatherText(text);
          setStatus("Weather logged successfully.");
        } catch {
          setStatus("Unable to fetch weather data.");
        } finally {
          setLoadingWeather(false);
        }
      },
      () => {
        setLoadingWeather(false);
        setStatus("Unable to retrieve your location.");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!projectId) {
      setStatus("Project context missing.");
      return;
    }
    setSaving(true);
    setStatus(null);

    try {
      const res = await fetch(`/api/projects/${projectId}/records`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "DailyLog",
          title: `${entryDate}-daily-log`,
          content: [
            `Date: ${entryDate}`,
            "",
            "Summary:",
            summary.trim(),
            "",
            "Weather:",
            weatherText.trim(),
          ].join("\n"),
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error ?? "Unable to save daily log");
      }

      setSummary("");
      setWeatherText("");
      setStatus("Daily log saved to project folders.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save daily log.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-base font-black text-gray-900">Daily Log</h2>
        <p className="mt-1 text-xs text-gray-500">Mobile-first field capture for daily site updates.</p>

        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">Date</label>
            <input
              type="date"
              value={entryDate}
              onChange={(event) => setEntryDate(event.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">Daily Summary</label>
            <textarea
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              rows={4}
              placeholder="Crew activity, delays, safety observations"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm resize-none"
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <label className="block text-xs font-semibold text-gray-600">Weather</label>
              <button
                type="button"
                onClick={logCurrentWeather}
                disabled={loadingWeather}
                className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-[11px] font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                {loadingWeather ? <Loader2 size={12} className="animate-spin" /> : <CloudSun size={12} />}
                Log Current Weather
              </button>
            </div>
            <textarea
              value={weatherText}
              onChange={(event) => setWeatherText(event.target.value)}
              rows={4}
              placeholder="Tap 'Log Current Weather' to auto-fill"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm resize-none"
            />
            <p className="mt-1 flex items-center gap-1 text-[11px] text-gray-500">
              <MapPin size={11} />
              Uses browser location + Open-Meteo current weather.
            </p>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: "#FF4D00" }}
          >
            {saving ? "Saving…" : "Save Daily Log"}
          </button>
        </form>

        {status ? (
          <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700">{status}</div>
        ) : null}
      </div>
    </div>
  );
}
