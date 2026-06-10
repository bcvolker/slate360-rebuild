import type { CaptureItemRecord } from "@/lib/types/site-walk-capture";
import type { CaptureV2Session } from "@/components/capture-v2/session-types";
import type { HubProject } from "@/lib/types/site-walk";
import { PHOTO_ANGLES_METADATA_KEY } from "@/lib/site-walk/photo-angles";

const SESSION_ID = "dev-walk-review-sandbox";
const NOW = "2026-06-09T18:00:00.000Z";

function photoPlaceholder(label: string, tone: "slate" | "teal" | "zinc") {
  const fills: Record<typeof tone, string> = {
    slate: "#1e293b",
    teal: "#0f766e",
    zinc: "#3f3f46",
  };
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="640" viewBox="0 0 480 640"><rect width="480" height="640" fill="${fills[tone]}"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#f8fafc" font-family="system-ui,sans-serif" font-size="28">${label}</text></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function buildStop(args: {
  id: string;
  title: string;
  description: string;
  status: CaptureItemRecord["item_status"];
  priority: CaptureItemRecord["priority"];
  previewLabel: string;
  tone: "slate" | "teal" | "zinc";
  createdOffsetMinutes: number;
  angleCount?: number;
}): CaptureItemRecord {
  const created = new Date(Date.parse(NOW) - args.createdOffsetMinutes * 60_000).toISOString();
  const angles = Array.from({ length: args.angleCount ?? 0 }, (_, index) => ({
    id: `${args.id}-angle-${index + 1}`,
    label: `Angle ${index + 1}`,
    captureMode: "camera" as const,
    uploadState: "uploaded" as const,
    createdAt: created,
  }));

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
    priority: args.priority,
    item_status: args.status,
    assigned_to: null,
    due_date: null,
    capture_mode: "camera",
    sync_state: "synced",
    upload_state: "uploaded",
    metadata: angles.length > 0 ? { [PHOTO_ANGLES_METADATA_KEY]: angles } : {},
    photo_attachment_pins: [],
    local_preview_url: photoPlaceholder(args.previewLabel, args.tone),
    created_at: created,
    updated_at: created,
  };
}

function buildVoiceMemo(parentId: string, index: number, durationMs: number): CaptureItemRecord {
  const created = new Date(Date.parse(NOW) - index * 60_000).toISOString();
  return {
    id: `${parentId}-memo-${index}`,
    session_id: SESSION_ID,
    client_item_id: `${parentId}-memo-${index}`,
    client_mutation_id: `${parentId}-memo-${index}-mutation`,
    item_type: "voice_note",
    title: "Voice memo",
    description: "Moisture reading still above threshold on the north wall.",
    location_label: null,
    category: null,
    priority: "medium",
    item_status: "open",
    assigned_to: null,
    due_date: null,
    capture_mode: "voice",
    sync_state: "synced",
    upload_state: "uploaded",
    metadata: { duration_ms: durationMs },
    photo_attachment_pins: [],
    local_preview_url: null,
    before_item_id: parentId,
    created_at: created,
    updated_at: created,
  };
}

export const DEV_WALK_REVIEW_STOP_COUNTS = [2, 8, 40] as const;

export const DEV_WALK_REVIEW_QUICK_SESSION: CaptureV2Session = {
  id: SESSION_ID,
  project_id: null,
  title: "Quick Walk — Jun 9",
  status: "completed",
  started_at: NOW,
  completed_at: NOW,
  is_ad_hoc: true,
  client_session_id: SESSION_ID,
  sync_state: "synced",
  last_synced_at: NOW,
  project_name: null,
};

export const DEV_WALK_REVIEW_PROJECT_SESSION: CaptureV2Session = {
  ...DEV_WALK_REVIEW_QUICK_SESSION,
  project_id: "dev-project-broadway",
  is_ad_hoc: false,
  title: "Broadway Tower — Jun 9",
  project_name: "Broadway Tower",
};

export const DEV_WALK_REVIEW_PROJECTS: HubProject[] = [
  {
    id: "dev-project-broadway",
    name: "Broadway Tower",
    description: null,
    status: "active",
    createdAt: NOW,
    projectType: "commercial",
  },
  {
    id: "dev-project-riverside",
    name: "Riverside Clinic",
    description: null,
    status: "active",
    createdAt: NOW,
    projectType: "healthcare",
  },
];

export function buildDevWalkReviewItems(count: (typeof DEV_WALK_REVIEW_STOP_COUNTS)[number]): CaptureItemRecord[] {
  const stops: CaptureItemRecord[] = [];
  const memos: CaptureItemRecord[] = [];

  for (let index = 0; index < count; index += 1) {
    const stopNumber = index + 1;
    const id = `dev-review-stop-${stopNumber}`;
    const status =
      stopNumber % 5 === 0 ? "resolved" : stopNumber % 3 === 0 ? "in_progress" : "open";
    const priority = stopNumber % 7 === 0 ? "critical" : "medium";
    stops.push(
      buildStop({
        id,
        title: `Stop ${stopNumber}`,
        description: `Field note for stop ${stopNumber}. Track follow-up before the next walkthrough.`,
        status,
        priority,
        previewLabel: String(stopNumber),
        tone: stopNumber % 3 === 0 ? "teal" : stopNumber % 2 === 0 ? "zinc" : "slate",
        createdOffsetMinutes: count - index,
        angleCount: stopNumber % 4 === 0 ? 2 : stopNumber % 6 === 0 ? 1 : 0,
      }),
    );

    if (stopNumber % 2 === 0) {
      memos.push(buildVoiceMemo(id, 1, 18_000 + stopNumber * 900));
    }
  }

  return [...stops, ...memos];
}

export function mapDevWalkReviewItems(items: CaptureItemRecord[]) {
  return items.map((item) => ({
    id: item.id,
    itemType: item.item_type,
    title: item.title,
    description: item.description,
    itemStatus: item.item_status,
    priority: item.priority,
    classification: item.category,
    trade: null,
    syncState: item.sync_state,
    uploadState: item.upload_state,
    createdAt: item.created_at,
    updatedAt: item.updated_at,
    locationLabel: item.location_label ?? null,
    beforeItemId: item.before_item_id ?? null,
    metadata: (item.metadata as Record<string, unknown> | null) ?? null,
  }));
}
