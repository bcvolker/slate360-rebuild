"use client";

import { useEffect, useState } from "react";

type IconType = "sun" | "cloud-sun" | "cloud" | "rain" | "snow";

type DashboardSummary = {
  recentFiles: Array<Record<string, unknown>>;
  storageUsed: number;
};

type DashboardProject = {
  id: string;
  name: string;
  location: string;
  thumbnail: string;
  status: "active" | "completed" | "on-hold";
  lastEdited: string;
  type: "3d" | "360" | "geo" | "plan";
  lat?: number | null;
  lng?: number | null;
};

type DashboardJob = {
  id: string;
  name: string;
  type: string;
  progress: number;
  status: "completed" | "processing" | "queued" | "failed";
};

type DashboardWidgetsPayload = {
  projects: DashboardProject[];
  jobs: DashboardJob[];
  financial: Array<{ month: string; credits: number }>;
  continueWorking: Array<{
    title: string;
    subtitle: string;
    time: string;
    kind: "design" | "tour" | "rfi" | "report" | "file";
    href: string;
  }>;
  seats: Array<{ name: string; role: string; email: string; active: boolean }>;
};

type DeployInfoPayload = {
  marker?: string;
  commit?: string | null;
  branch?: string | null;
  url?: string | null;
  region?: string | null;
};

type LiveWeatherState = {
  location: string;
  current: {
    temp: number;
    condition: string;
    humidity: number;
    wind: number;
    icon: IconType;
  };
  forecast: Array<{
    day: string;
    hi: number;
    lo: number;
    icon: IconType;
    precip: number;
  }>;
  constructionAlerts: Array<{
    message: string;
    severity: "warning" | "caution" | "info";
  }>;
};

function weatherCodeToIcon(code: number): IconType {
  if ([0].includes(code)) return "sun";
  if ([1, 2].includes(code)) return "cloud-sun";
  if ([3, 45, 48].includes(code)) return "cloud";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "snow";
  return "rain";
}

function weatherCodeToCondition(code: number): string {
  if (code === 0) return "Clear";
  if ([1, 2].includes(code)) return "Partly Cloudy";
  if ([3, 45, 48].includes(code)) return "Cloudy";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow";
  return "Rain";
}

export function useDashboardRuntimeData() {
  const [dashboardSummary, setDashboardSummary] = useState<DashboardSummary | null>(null);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [liveWeather, setLiveWeather] = useState<LiveWeatherState | null>(null);
  const [widgetsData, setWidgetsData] = useState<DashboardWidgetsPayload | null>(null);
  const [deployInfo, setDeployInfo] = useState<DeployInfoPayload | null>(null);

  useEffect(() => {
    fetch("/api/dashboard/summary")
      .then((res) => res.json())
      .then((data: { error?: string } & DashboardSummary) => {
        if (!data.error) setDashboardSummary(data);
      })
      .catch(console.error);

    fetch("/api/deploy-info", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: { error?: string } & DeployInfoPayload) => {
        if (!data?.error) {
          setDeployInfo(data);
        }
      })
      .catch(() => {
        setDeployInfo(null);
      });

    fetch("/api/dashboard/widgets", { cache: "no-store" })
      .then((res) => res.json())
      .then((data: { error?: string } & Partial<DashboardWidgetsPayload>) => {
        if (!data.error) {
          setWidgetsData({
            projects: Array.isArray(data.projects) ? data.projects : [],
            jobs: Array.isArray(data.jobs) ? data.jobs : [],
            financial: Array.isArray(data.financial) ? data.financial : [],
            continueWorking: Array.isArray(data.continueWorking) ? data.continueWorking : [],
            seats: Array.isArray(data.seats) ? data.seats : [],
          });
        }
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserCoords({ lat, lng });

        try {
          const [weatherRes, geoRes] = await Promise.all([
            fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code&forecast_days=5&timezone=auto`),
            fetch(`/api/weather/reverse-geocode?lat=${lat}&lng=${lng}`),
          ]);

          if (!weatherRes.ok) return;

          const weatherJson = await weatherRes.json();
          const geoJson = geoRes.ok ? await geoRes.json() : null;

          const dailyCodes = weatherJson?.daily?.weather_code ?? [];
          const dailyMax = weatherJson?.daily?.temperature_2m_max ?? [];
          const dailyMin = weatherJson?.daily?.temperature_2m_min ?? [];
          const dailyPrecip = weatherJson?.daily?.precipitation_probability_max ?? [];

          const forecast = (weatherJson?.daily?.time ?? []).slice(0, 5).map((dateStr: string, index: number) => {
            const day = new Date(`${dateStr}T12:00:00`).toLocaleDateString("en-US", { weekday: "short" });
            return {
              day,
              hi: Math.round(Number(dailyMax[index] ?? 0) * 9 / 5 + 32),
              lo: Math.round(Number(dailyMin[index] ?? 0) * 9 / 5 + 32),
              icon: weatherCodeToIcon(Number(dailyCodes[index] ?? 1)),
              precip: Number(dailyPrecip[index] ?? 0),
            };
          });

          const locationName = geoJson?.results?.[0]
            ? `${geoJson.results[0].name}${geoJson.results[0].admin1 ? `, ${geoJson.results[0].admin1}` : ""}`
            : `${lat.toFixed(3)}, ${lng.toFixed(3)}`;

          const currentCode = Number(weatherJson?.current?.weather_code ?? 1);
          const humidity = Number(weatherJson?.current?.relative_humidity_2m ?? 0);
          const windMph = Number(weatherJson?.current?.wind_speed_10m ?? 0) * 0.621371;

          const alerts: LiveWeatherState["constructionAlerts"] = [];
          if (windMph >= 20) alerts.push({ message: `High wind risk (${Math.round(windMph)} mph) — review crane operations`, severity: "warning" });
          if (forecast.some((f: { precip: number }) => f.precip >= 50)) alerts.push({ message: "High precipitation chance in the next 5 days — protect exposed work areas", severity: "caution" });
          if (alerts.length === 0) alerts.push({ message: "No major weather construction risks detected", severity: "info" });

          setLiveWeather({
            location: locationName,
            current: {
              temp: Math.round(Number(weatherJson?.current?.temperature_2m ?? 0) * 9 / 5 + 32),
              condition: weatherCodeToCondition(currentCode),
              humidity,
              wind: Math.round(windMph),
              icon: weatherCodeToIcon(currentCode),
            },
            forecast,
            constructionAlerts: alerts,
          });
        } catch {
          // fail quietly; widget will use fallback
        }
      },
      () => {
        // location denied / unavailable
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );
  }, []);

  return {
    dashboardSummary,
    userCoords,
    liveWeather,
    widgetsData,
    setWidgetsData,
    deployInfo,
  };
}
