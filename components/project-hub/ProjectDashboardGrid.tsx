"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Responsive, WidthProvider, type ResponsiveLayouts } from "react-grid-layout/legacy";
import { Loader2, Plus, CloudSun, Link as LinkIcon, Check } from "lucide-react";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

type ProjectData = {
  id: string;
  name: string;
  status: string;
  metadata: Record<string, unknown> | null;
};

type ProjectFolder = {
  id: string;
  name: string;
};

type RecentFile = {
  id: string;
  name: string;
  type?: string | null;
  createdAt?: string | null;
};

type WeatherData = {
  temperature: number;
  windSpeed: number;
  code: number;
};

const ResponsiveGridLayout = WidthProvider(Responsive);

const STRICT_LAYOUTS: ResponsiveLayouts = {
  lg: [
    { i: "info", x: 0, y: 0, w: 4, h: 2 },
    { i: "weather", x: 4, y: 0, w: 4, h: 2 },
    { i: "files", x: 0, y: 2, w: 8, h: 3 },
  ],
};

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function extractLatLng(metadata: Record<string, unknown> | null) {
  if (!metadata) return { lat: null, lng: null };

  const directLat = asNumber(metadata.lat);
  const directLng = asNumber(metadata.lng);
  if (directLat !== null && directLng !== null) return { lat: directLat, lng: directLng };

  const location = metadata.location;
  if (location && typeof location === "object") {
    const loc = location as Record<string, unknown>;
    const lat = asNumber(loc.lat);
    const lng = asNumber(loc.lng);
    if (lat !== null && lng !== null) return { lat, lng };
  }

  return { lat: null, lng: null };
}

function describeWeatherCode(code: number): string {
  if ([0].includes(code)) return "Clear";
  if ([1, 2, 3].includes(code)) return "Cloudy";
  if ([45, 48].includes(code)) return "Fog";
  if ([51, 53, 55, 56, 57].includes(code)) return "Drizzle";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow";
  if ([95, 96, 99].includes(code)) return "Thunderstorm";
  return "Unknown";
}

function projectLocationLabel(metadata: Record<string, unknown> | null): string {
  if (!metadata) return "Not set";
  const location = metadata.location;
  if (typeof location === "string" && location.trim()) return location;
  if (location && typeof location === "object") {
    const value = (location as Record<string, unknown>).address;
    if (typeof value === "string" && value.trim()) return value;
  }
  return "Not set";
}

export default function ProjectDashboardGrid({
  projectId,
  project,
}: {
  projectId: string;
  project: ProjectData;
}) {
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(true);

  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weather, setWeather] = useState<WeatherData | null>(null);

  const [folders, setFolders] = useState<ProjectFolder[]>([]);
  const [linkLoading, setLinkLoading] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;

    const loadRecentFiles = async () => {
      setFilesLoading(true);
      try {
        const res = await fetch(`/api/projects/${projectId}/recent-files`, { cache: "no-store" });
        const payload = await res.json().catch(() => ({}));
        if (cancelled) return;
        setRecentFiles(Array.isArray(payload?.files) ? payload.files : []);
      } finally {
        if (!cancelled) setFilesLoading(false);
      }
    };

    void loadRecentFiles();

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;

    const loadFolders = async () => {
      try {
        const res = await fetch(`/api/slatedrop/project-folders?projectId=${encodeURIComponent(projectId)}`, {
          cache: "no-store",
        });
        const payload = await res.json().catch(() => ({}));
        if (cancelled) return;
        setFolders(Array.isArray(payload?.folders) ? payload.folders : []);
      } catch {
        if (!cancelled) setFolders([]);
      }
    };

    void loadFolders();

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const latLng = useMemo(() => extractLatLng(project.metadata), [project.metadata]);

  useEffect(() => {
    if (latLng.lat === null || latLng.lng === null) {
      setWeather(null);
      return;
    }

    let cancelled = false;
    const loadWeather = async () => {
      setWeatherLoading(true);
      try {
        const url = new URL("https://api.open-meteo.com/v1/forecast");
        url.searchParams.set("latitude", String(latLng.lat));
        url.searchParams.set("longitude", String(latLng.lng));
        url.searchParams.set("current", "temperature_2m,weather_code,wind_speed_10m");

        const res = await fetch(url.toString(), { cache: "no-store" });
        const payload = await res.json().catch(() => ({}));
        const current = payload?.current;

        if (!cancelled && current) {
          setWeather({
            temperature: Number(current.temperature_2m ?? 0),
            code: Number(current.weather_code ?? 0),
            windSpeed: Number(current.wind_speed_10m ?? 0),
          });
        }
      } catch {
        if (!cancelled) setWeather(null);
      } finally {
        if (!cancelled) setWeatherLoading(false);
      }
    };

    void loadWeather();
    return () => {
      cancelled = true;
    };
  }, [latLng.lat, latLng.lng]);

  const requestFiles = async () => {
    if (!folders.length) return;
    setLinkLoading(true);
    setGeneratedLink(null);
    setCopied(false);
    try {
      const preferred = folders.find((folder) => folder.name === "Photos") ?? folders[0];
      if (!preferred?.id) return;

      const res = await fetch("/api/slatedrop/request-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, folderId: preferred.id }),
      });

      const payload = await res.json().catch(() => ({}));
      if (payload?.url) {
        setGeneratedLink(`${window.location.origin}${payload.url}`);
      }
    } finally {
      setLinkLoading(false);
    }
  };

  const copyLink = async () => {
    if (!generatedLink) return;
    try {
      await navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section className="space-y-3 min-h-[500px]">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Overview</p>

      <ResponsiveGridLayout
        className="layout w-full"
        layouts={STRICT_LAYOUTS}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4 }}
        rowHeight={42}
        margin={[12, 12]}
      >
        <div key="info" className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 overflow-hidden flex flex-col" style={{ height: "100%" }}>
          <h2 className="mb-3 text-sm font-black text-gray-900">Project Info</h2>
          <div className="space-y-2 text-sm text-gray-700">
            <p>
              <span className="font-semibold text-gray-900">Name:</span> {project.name}
            </p>
            <p>
              <span className="font-semibold text-gray-900">Status:</span> {project.status}
            </p>
            <p className="truncate">
              <span className="font-semibold text-gray-900">Location:</span>{" "}
              {projectLocationLabel(project.metadata)}
            </p>
          </div>
        </div>

        <div key="weather" className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 overflow-hidden flex flex-col" style={{ height: "100%" }}>
          <h2 className="mb-3 text-sm font-black text-gray-900">Weather</h2>
          {weatherLoading ? (
            <div className="flex h-[120px] items-center justify-center text-sm text-gray-500">
              <Loader2 size={16} className="mr-2 animate-spin" /> Fetching weather…
            </div>
          ) : weather ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-2xl font-black text-gray-900">
                <CloudSun size={24} className="text-[#FF4D00]" />
                {Math.round(weather.temperature)}°C
              </div>
              <p className="text-sm text-gray-600">{describeWeatherCode(weather.code)}</p>
              <p className="text-xs text-gray-500">Wind {Math.round(weather.windSpeed)} km/h</p>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Set project latitude/longitude in metadata to show live weather.</p>
          )}
        </div>

        <div key="files" className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 overflow-hidden flex flex-col" style={{ height: "100%" }}>
          <h2 className="mb-3 text-sm font-black text-gray-900">Recent Files</h2>
          {filesLoading ? (
            <div className="flex h-[130px] items-center justify-center text-sm text-gray-500">
              <Loader2 size={16} className="mr-2 animate-spin" /> Loading files…
            </div>
          ) : recentFiles.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 p-4 text-sm text-gray-500">No uploads yet.</div>
          ) : (
            <ul className="space-y-2">
              {recentFiles.slice(0, 5).map((file) => (
                <li key={file.id} className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
                  <p className="truncate text-sm font-semibold text-gray-800">{file.name}</p>
                  <p className="mt-0.5 text-[11px] uppercase tracking-wide text-gray-500">
                    {file.type || "file"}
                    {file.createdAt ? ` • ${new Date(file.createdAt).toLocaleDateString()}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </ResponsiveGridLayout>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 overflow-hidden flex flex-col">
        <h2 className="mb-3 text-sm font-black text-gray-900">Quick Actions</h2>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/project-hub/${projectId}/rfis`}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              <Plus size={13} /> + New RFI
            </Link>
            <Link
              href={`/project-hub/${projectId}/photos`}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
            >
              <Plus size={13} /> + Add Photo
            </Link>
            <button
              onClick={requestFiles}
              disabled={linkLoading || folders.length === 0}
              className="inline-flex items-center gap-1 rounded-lg bg-[#FF4D00] px-3 py-2 text-xs font-semibold text-white hover:bg-[#E64500] disabled:opacity-50"
            >
              {linkLoading ? <Loader2 size={13} className="animate-spin" /> : <LinkIcon size={13} />} + Request Files
            </button>
          </div>

          {generatedLink && (
            <div className="flex items-center justify-between rounded-xl border border-green-200 bg-green-50 px-3 py-2">
              <p className="truncate text-xs font-medium text-green-700">{generatedLink}</p>
              <button
                onClick={copyLink}
                className="ml-2 inline-flex shrink-0 items-center gap-1 rounded-md bg-white px-2 py-1 text-xs font-semibold text-green-700 ring-1 ring-green-200"
              >
                {copied ? <Check size={12} /> : <LinkIcon size={12} />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
