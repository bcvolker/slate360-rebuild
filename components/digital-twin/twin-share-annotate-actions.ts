import type { TwinPickPoint } from "@/components/digital-twin/TwinShareSplatViewer";
import type { TwinShareTool } from "@/components/digital-twin/TwinShareToolStrip";

function dist(a: TwinPickPoint, b: TwinPickPoint) {
  return Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
}

export async function postSharePin(params: {
  shareToken: string;
  authorName: string;
  pinTitle: string;
  commentBody: string;
  point: TwinPickPoint;
  modelId?: string | null;
}) {
  const res = await fetch(`/api/share/twin/${params.shareToken}/pin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      author_display: params.authorName.trim(),
      title: params.pinTitle.trim(),
      body: params.commentBody.trim() || null,
      position: params.point,
      model_id: params.modelId ?? null,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Could not create pin");
}

export async function postShareMeasurement(params: {
  shareToken: string;
  authorName: string;
  measureA: TwinPickPoint;
  point: TwinPickPoint;
  modelId?: string | null;
}) {
  const measured = dist(params.measureA, params.point);
  const res = await fetch(`/api/share/twin/${params.shareToken}/measurement`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      author_display: params.authorName.trim() || "Guest",
      start_point: params.measureA,
      end_point: params.point,
      measured_value: measured,
      unit: "m",
      model_id: params.modelId ?? null,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Could not save measurement");
}

export async function postShareComment(params: {
  shareToken: string;
  authorName: string;
  commentBody: string;
}) {
  const res = await fetch(`/api/share/twin/${params.shareToken}/comment`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      author_display: params.authorName.trim(),
      body: params.commentBody.trim(),
    }),
  });
  const data = (await res.json().catch(() => ({}))) as { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Could not post comment");
}

export type { TwinShareTool };
