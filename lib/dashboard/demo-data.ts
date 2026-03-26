/**
 * Dashboard demo/fallback data.
 * Only used when the API has not yet returned data (loading state).
 * NEVER import this in API routes or server components.
 *
 * Rule 9: Do not show fake data to users with real projects.
 * These are shown only during the initial loading skeleton or for
 * brand-new accounts before any data exists.
 */

import type {
  DashboardProject,
  DashboardCalEvent,
  DashboardJob,
  LiveWeatherState,
} from "@/lib/types/dashboard";

export const DEMO_PROJECTS: DashboardProject[] = [
  {
    id: "demo-p1",
    name: "Maple Heights Residence",
    location: "Denver, CO",
    thumbnail: "/uploads/pletchers.jpg",
    status: "active",
    lastEdited: "2 hours ago",
    type: "3d",
  },
  {
    id: "demo-p2",
    name: "Harbor Point Office Tower",
    location: "San Diego, CA",
    thumbnail: "",
    status: "active",
    lastEdited: "5 hours ago",
    type: "360",
  },
  {
    id: "demo-p3",
    name: "Riverside Bridge Retrofit",
    location: "Portland, OR",
    thumbnail: "",
    status: "on-hold",
    lastEdited: "2 days ago",
    type: "geo",
  },
];

export const DEMO_EVENTS: DashboardCalEvent[] = [
  { id: "de1", title: "Site inspection", date: "2026-03-10", color: "#FF4D00", project: "Maple Heights" },
  { id: "de2", title: "Client presentation", date: "2026-03-15", color: "#6366F1", project: "Harbor Point" },
  { id: "de3", title: "Foundation review", date: "2026-03-20", color: "#059669" },
  { id: "de4", title: "Budget sync — Q1", date: "2026-03-28", color: "#7C3AED" },
];

export const DEMO_JOBS: DashboardJob[] = [
  { id: "dj1", name: "Site scan — HDR merge", type: "360 Processing", progress: 45, status: "processing" },
  { id: "dj2", name: "Bridge deck — Point cloud", type: "Geospatial", progress: 0, status: "queued" },
  { id: "dj3", name: "Floor plan — PDF to 3D", type: "Conversion", progress: 78, status: "processing" },
];

export const DEMO_WEATHER: LiveWeatherState = {
  location: "Your Location",
  current: { temp: 68, condition: "Partly Cloudy", humidity: 50, wind: 10, icon: "cloud-sun" },
  forecast: [
    { day: "Today", hi: 70, lo: 55, icon: "cloud-sun", precip: 10 },
    { day: "Tue", hi: 65, lo: 52, icon: "cloud", precip: 30 },
    { day: "Wed", hi: 60, lo: 48, icon: "rain", precip: 70 },
    { day: "Thu", hi: 72, lo: 56, icon: "sun", precip: 5 },
    { day: "Fri", hi: 75, lo: 58, icon: "sun", precip: 0 },
  ],
  constructionAlerts: [
    { message: "No major weather risks detected in your area", severity: "info" },
  ],
};

export const DEMO_FINANCIAL = [
  { month: "Oct", credits: 0 },
  { month: "Nov", credits: 0 },
  { month: "Dec", credits: 0 },
  { month: "Jan", credits: 0 },
  { month: "Feb", credits: 0 },
  { month: "Mar", credits: 0 },
];
