import type { CaptureItemRecord } from "@/lib/types/site-walk-capture";
import type { CaptureV2Session } from "@/components/capture-v2/session-types";

const SESSION_ID = "dev-session-sandbox";
const NOW = "2026-06-04T18:00:00.000Z";

function photoPlaceholder(label: string, tone: "slate" | "teal" | "zinc") {
  const fills: Record<typeof tone, string> = {
    slate: "#1e293b",
    teal: "#0f766e",
    zinc: "#3f3f46",
  };
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="640" viewBox="0 0 480 640"><rect width="480" height="640" fill="${fills[tone]}"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#f8fafc" font-family="system-ui,sans-serif" font-size="28">${label}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function buildPhotoItem(args: {
  id: string;
  title: string;
  description: string;
  status: CaptureItemRecord["item_status"];
  previewLabel: string;
  tone: "slate" | "teal" | "zinc";
  createdOffsetMinutes: number;
}): CaptureItemRecord {
  const created = new Date(Date.parse(NOW) - args.createdOffsetMinutes * 60_000).toISOString();
  return {
    id: args.id,
    session_id: SESSION_ID,
    client_item_id: args.id,
    client_mutation_id: `${args.id}-mutation`,
    item_type: "photo",
    title: args.title,
    description: args.description,
    location_label: "Level 2 · East corridor",
    category: "Observation",
    priority: "medium",
    item_status: args.status,
    assigned_to: null,
    due_date: null,
    capture_mode: "camera",
    sync_state: "synced",
    upload_state: "uploaded",
    metadata: {},
    photo_attachment_pins: [],
    local_preview_url: photoPlaceholder(args.previewLabel, args.tone),
    created_at: created,
    updated_at: created,
  };
}

function buildEmptyStop(createdOffsetMinutes: number): CaptureItemRecord {
  const created = new Date(Date.parse(NOW) - createdOffsetMinutes * 60_000).toISOString();
  return {
    id: "dev-stop-empty",
    session_id: SESSION_ID,
    client_item_id: "dev-stop-empty",
    client_mutation_id: "dev-stop-empty-mutation",
    item_type: "photo",
    title: "",
    description: null,
    location_label: null,
    category: null,
    priority: "medium",
    item_status: "open",
    assigned_to: null,
    due_date: null,
    capture_mode: "camera",
    sync_state: "pending",
    upload_state: "queued",
    metadata: {},
    photo_attachment_pins: [],
    local_preview_url: null,
    created_at: created,
    updated_at: created,
  };
}

export const DEV_MOCK_SESSION: CaptureV2Session = {
  id: SESSION_ID,
  project_id: null,
  title: "Dev Sandbox Walk",
  status: "in_progress",
  started_at: NOW,
  completed_at: null,
  is_ad_hoc: true,
  client_session_id: SESSION_ID,
  sync_state: "synced",
  last_synced_at: NOW,
  project_name: null,
};

export const DEV_MOCK_CAPTURE_ITEMS: CaptureItemRecord[] = [
  buildPhotoItem({
    id: "dev-stop-1",
    title: "Exposed conduit",
    description: "Open junction box near grid line C4. Electrician to close before inspection.",
    status: "open",
    previewLabel: "Stop 1",
    tone: "slate",
    createdOffsetMinutes: 12,
  }),
  buildPhotoItem({
    id: "dev-stop-2",
    title: "Drywall patch",
    description: "Patch still drying on south wall. Revisit tomorrow for paint readiness.",
    status: "in_progress",
    previewLabel: "Stop 2",
    tone: "teal",
    createdOffsetMinutes: 8,
  }),
  buildPhotoItem({
    id: "dev-stop-3",
    title: "Ceiling tile gap",
    description: "Missing tile above corridor light. Facilities to replace from stock pallet.",
    status: "resolved",
    previewLabel: "Stop 3",
    tone: "zinc",
    createdOffsetMinutes: 4,
  }),
  buildEmptyStop(1),
];

export const DEV_MOCK_CONTEXT_LABEL = "Dev sandbox · No plans";
