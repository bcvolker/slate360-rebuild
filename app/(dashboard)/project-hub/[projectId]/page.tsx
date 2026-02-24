"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { Responsive, WidthProvider, type ResponsiveLayouts } from "react-grid-layout/legacy";
import { Loader2, CloudSun } from "lucide-react";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

type ProjectResponse = {
  project?: {
    id: string;
    name: string;
    description: string | null;
    metadata: Record<string, unknown> | null;
  };
};

type RecentFile = {
  id: string;
  name: string;
  type?: string;
  createdAt?: string;
};

type WeatherState = {
  temperature: number;
  code: number;
} | null;

const ResponsiveGridLayout = WidthProvider(Responsive);

const DEFAULT_LAYOUTS: ResponsiveLayouts = {
  lg: [
    { i: "project-info", x: 0, y: 0, w: 4, h: 4, minW: 3, minH: 3 },
    { i: "weather", x: 4, y: 0, w: 4, h: 4, minW: 3, minH: 3 },
    { i: "recent-files", x: 8, y: 0, w: 4, h: 4, minW: 4, minH: 3 },
  ],
  md: [
    { i: "project-info", x: 0, y: 0, w: 5, h: 4, minW: 4, minH: 3 },
    { i: "weather", x: 5, y: 0, w: 5, h: 4, minW: 4, minH: 3 },
    { i: "recent-files", x: 0, y: 4, w: 10, h: 4, minW: 5, minH: 3 },
  ],
  sm: [
    { i: "project-info", x: 0, y: 0, w: 6, h: 4, minW: 4, minH: 3 },
    { i: "weather", x: 0, y: 4, w: 6, h: 4, minW: 4, minH: 3 },
    { i: "recent-files", x: 0, y: 8, w: 6, h: 4, minW: 4, minH: 3 },
  ],
  xs: [
    { i: "project-info", x: 0, y: 0, w: 4, h: 4, minW: 4, minH: 3 },
    { i: "weather", x: 0, y: 4, w: 4, h: 4, minW: 4, minH: 3 },
    { i: "recent-files", x: 0, y: 8, w: 4, h: 4, minW: 4, minH: 3 },
  ],
};

function toNum(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function weatherLabel(code: number): string {
  if (code === 0) return "Clear";
  if ([1, 2, 3].includes(code)) return "Cloudy";
  if ([45, 48].includes(code)) return "Fog";
  if ([51, 53, 55, 56, 57].includes(code)) return "Drizzle";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Rain";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Snow";
  if ([95, 96, 99].includes(code)) return "Thunderstorm";
  return "Unknown";
}

function widget(title: string, children: React.ReactNode) {
  return (
    <div className="h-full rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-black text-gray-900">{title}</p>
        <span className="cursor-move text-[10px] font-semibold uppercase tracking-wide text-gray-400">Drag</span>
      </div>
      {children}
    </div>
  );
}

export default function ProjectOverviewPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params?.projectId;

  const [project, setProject] = useState<ProjectResponse["project"] | null>(null);
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);
  const [weather, setWeather] = useState<WeatherState>(null);
  const [loading, setLoading] = useState(true);
  const [layouts, setLayouts] = useState<ResponsiveLayouts>(DEFAULT_LAYOUTS);

  const storageKey = useMemo(() => (projectId ? `project-dashboard-layout:${projectId}` : null), [projectId]);

  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const parsed = JSON.parse(raw) as ResponsiveLayouts;
      setLayouts(parsed);
    } catch {
      setLayouts(DEFAULT_LAYOUTS);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!projectId) return;

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const [projectRes, filesRes] = await Promise.all([
          fetch(`/api/projects/${projectId}`, { cache: "no-store" }),
          fetch(`/api/projects/${projectId}/recent-files`, { cache: "no-store" }),
        ]);

        const projectPayload = (await projectRes.json().catch(() => ({}))) as ProjectResponse;
        const filesPayload = (await filesRes.json().catch(() => ({}))) as { files?: RecentFile[] };

        if (!cancelled) {
          setProject(projectPayload.project ?? null);
          setRecentFiles(Array.isArray(filesPayload.files) ? filesPayload.files : []);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  useEffect(() => {
    const location = project?.metadata?.location;
    const lat = location && typeof location === "object" ? toNum((location as Record<string, unknown>).lat) : null;
    const lng = location && typeof location === "object" ? toNum((location as Record<string, unknown>).lng) : null;

    if (lat === null || lng === null) {
      setWeather(null);
      return;
    }

    let cancelled = false;

    const loadWeather = async () => {
      try {
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`,
          { cache: "no-store" }
        );
        const payload = (await res.json().catch(() => ({}))) as {
          current_weather?: { temperature?: number; weathercode?: number };
        };

        if (cancelled) return;

        if (
          payload.current_weather &&
          typeof payload.current_weather.temperature === "number" &&
          typeof payload.current_weather.weathercode === "number"
        ) {
          setWeather({
            temperature: payload.current_weather.temperature,
            code: payload.current_weather.weathercode,
          });
        } else {
          setWeather(null);
        }
      } catch {
        if (!cancelled) setWeather(null);
      }
    };

    void loadWeather();

    return () => {
      cancelled = true;
    };
  }, [project]);

  if (!projectId) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">
        Invalid project route.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-8 text-sm text-gray-500">
        <Loader2 size={16} className="mr-2 inline animate-spin" /> Loading command center…
      </div>
    );
  }

  const location = project?.metadata?.location;
  const address = location && typeof location === "object"
    ? String((location as Record<string, unknown>).address ?? "Not set")
    : "Not set";

  return (
    <section className="space-y-4">
      <header>
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Command Center</p>
        <h2 className="text-lg font-black text-gray-900">Customizable Project Dashboard</h2>
      </header>

      <ResponsiveGridLayout
        className="layout"
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4 }}
        rowHeight={84}
        margin={[16, 16]}
        onLayoutChange={(_, allLayouts) => {
          setLayouts(allLayouts);
          if (!storageKey) return;
          localStorage.setItem(storageKey, JSON.stringify(allLayouts));
        }}
      >
        <div key="project-info">
          {widget(
            "Project Info",
            <div className="space-y-2 text-sm text-gray-700">
              <p><span className="font-semibold text-gray-900">Name:</span> {project?.name ?? "Unknown project"}</p>
              <p><span className="font-semibold text-gray-900">Description:</span> {project?.description ?? "No description"}</p>
              <p><span className="font-semibold text-gray-900">Address:</span> {address || "Not set"}</p>
            </div>
          )}
        </div>

        <div key="weather">
          {widget(
            "Weather",
            <div className="space-y-2 text-sm text-gray-700">
              <div className="inline-flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5 text-blue-700">
                <CloudSun size={14} />
                Current Conditions
              </div>
              {weather ? (
                <>
                  <p><span className="font-semibold text-gray-900">Temperature:</span> {weather.temperature.toFixed(1)}°C</p>
                  <p><span className="font-semibold text-gray-900">Conditions:</span> {weatherLabel(weather.code)}</p>
                </>
              ) : (
                <p className="text-gray-500">Weather unavailable (set valid project latitude/longitude).</p>
              )}
            </div>
          )}
        </div>

        <div key="recent-files">
          {widget(
            "Recent Files",
            <div className="flex h-full flex-col">
              {recentFiles.length === 0 ? (
                <p className="text-sm text-gray-500">No recent files found for this project.</p>
              ) : (
                <ul className="space-y-2 text-sm text-gray-700">
                  {recentFiles.slice(0, 5).map((file) => (
                    <li key={file.id} className="truncate rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-2">
                      <p className="truncate font-medium text-gray-800">{file.name}</p>
                      <p className="text-xs text-gray-500">
                        {file.type ?? "file"} · {file.createdAt ? new Date(file.createdAt).toLocaleDateString() : "Unknown date"}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-auto pt-3">
                <Link
                  href={`/project-hub/${projectId}/files`}
                  className="inline-flex items-center rounded-lg bg-[#FF4D00] px-3 py-1.5 text-xs font-semibold text-white transition hover:opacity-90"
                >
                  Open Files Module
                </Link>
              </div>
            </div>
          )}
        </div>
      </ResponsiveGridLayout>
    </section>
  );
}
