import type { AccessPolicy, SharePolicy } from "./types";
import { pinVisibleOnPolicy, attachmentVisibleOnPolicy } from "./pins";
import { redactionForRecipient, type RedactionRule } from "./redaction";

export type ExportPin = {
  id: string;
  label: string;
  pinType: string;
  tSeconds: number | null;
  yawDeg: number | null;
  pitchDeg: number | null;
  visibility: string;
};

export type ExportWaypoint = {
  id: string;
  clipId: string;
  tSeconds: number;
  label: string | null;
  zone: string | null;
  yawDeg: number;
  pitchDeg: number;
  isVisible: boolean;
};

export type ExportAttachment = {
  id: string;
  pinId: string;
  title: string | null;
  fileName: string | null;
  bytes: Uint8Array | null;
  hidden: boolean;
};

export type ExportInput = {
  policy: AccessPolicy;
  includeMaster: boolean;
  masterPermitted: boolean;
  product: string;
  title: string;
  capturedAt: string;
  building: string | null;
  floor: string | null;
  zone: string | null;
  walkthroughType: string;
  durationS: number | null;
  shareUrl: string | null;
  pins: ExportPin[];
  waypoints: ExportWaypoint[];
  attachments: ExportAttachment[];
  redactions: RedactionRule[];
  captureNotes: string | null;
  stills: Array<{ name: string; bytes: Uint8Array }>;
};

export type ExportFile = { path: string; contents: string | Uint8Array };

function csvCell(value: unknown): string {
  const s = String(value ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function buildExportPackage(input: ExportInput): ExportFile[] {
  const policy: SharePolicy | "master" = input.policy;
  const pins = input.pins.filter((p) => pinVisibleOnPolicy(p.visibility as "internal" | "client" | "public", policy));
  const waypoints = input.waypoints.filter((w) => w.isVisible);
  const attachments = input.attachments.filter((a) => !a.hidden && attachmentVisibleOnPolicy(true, policy));
  const redactions = policy === "master" ? [] : input.redactions.map((r) => redactionForRecipient(r, policy));

  const files: ExportFile[] = [];
  files.push({
    path: "README.txt",
    contents: [
      "Spatial Walkthrough export",
      `Title: ${input.title}`,
      `Policy: ${policy.toUpperCase()}`,
      `Captured: ${input.capturedAt}`,
      "Master 360 media is omitted unless MASTER permission is explicitly granted.",
      "Hidden waypoints and unapproved attachments are not included.",
    ].join("\n"),
  });
  files.push({
    path: "walkthrough.json",
    contents: JSON.stringify({
      product: input.product,
      title: input.title,
      capturedAt: input.capturedAt,
      building: input.building,
      floor: input.floor,
      zone: input.zone,
      type: input.walkthroughType,
      durationS: input.durationS,
      policy,
      captureNotes: input.captureNotes,
    }, null, 2),
  });
  files.push({
    path: "capture-metadata.json",
    contents: JSON.stringify({
      capturedAt: input.capturedAt,
      building: input.building,
      floor: input.floor,
      zone: input.zone,
      type: input.walkthroughType,
      durationS: input.durationS,
    }, null, 2),
  });
  files.push({
    path: "pin-register.csv",
    contents: ["id,label,type,t_seconds,yaw,pitch,visibility"]
      .concat(pins.map((p) => [p.id, csvCell(p.label), p.pinType, p.tSeconds, p.yawDeg, p.pitchDeg, p.visibility].map(csvCell).join(",")))
      .join("\n"),
  });
  files.push({
    path: "waypoint-register.csv",
    contents: ["id,clip_id,t_seconds,label,zone,yaw,pitch"]
      .concat(waypoints.map((w) => [w.id, w.clipId, w.tSeconds, csvCell(w.label), csvCell(w.zone), w.yawDeg, w.pitchDeg].map(csvCell).join(",")))
      .join("\n"),
  });
  const shareBody = input.shareUrl
    ? `<!doctype html><html><body><p>Spatial Walkthrough</p><p><a href="${input.shareUrl}">${input.shareUrl}</a></p></body></html>`
    : "No active share link.";
  files.push({ path: "share-link.html", contents: shareBody });
  files.push({ path: "share-link.txt", contents: input.shareUrl ?? "No active share link." });
  if (policy !== "public") {
    files.push({
      path: "privacy-rules.json",
      contents: JSON.stringify(redactions, null, 2),
    });
  }
  for (const att of attachments) {
    if (!att.bytes) continue;
    files.push({ path: `attachments/${att.fileName || att.title || att.id}`, contents: att.bytes });
  }
  for (const still of input.stills) {
    files.push({ path: `stills/${still.name}`, contents: still.bytes });
  }
  if (input.includeMaster && !input.masterPermitted) {
    files.push({ path: "MASTER-OMITTED.txt", contents: "Master 360 was requested but permission was not granted." });
  }
  return files;
}

export function exportIncludesMaster(files: ExportFile[]): boolean {
  return files.some((f) => f.path.toLowerCase().includes("master.mp4"));
}
