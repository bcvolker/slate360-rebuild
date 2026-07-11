import { NextRequest } from "next/server";
import { withThermalOpsAuth } from "@/lib/thermal/access";
import { ok, badRequest, notFound, serverError } from "@/lib/server/api-response";

export const runtime = "nodejs";

type Params = { params: Promise<{ captureId: string }> };

type SpotPayload = {
  id: string;
  x: number;
  y: number;
  imported?: boolean;
  kind?: "point" | "area" | "line" | "polygon";
  target?: "crosshair" | "crosshair-circle" | "dot" | "square";
  areaShape?: "box" | "circle";
  w?: number;
  h?: number;
  x2?: number;
  y2?: number;
  /** Operator-given name (V2 rename). */
  label?: string;
  /** Auto-seated extreme marker (V2 "mark hottest/coldest") — re-seated client-side on retune. */
  auto?: "max" | "min";
  /** Polygon vertices in grid pixels (V2 polygon area). */
  points?: { x: number; y: number }[];
};
type TuningPayload = {
  emissivity?: number;
  reflected_c?: number;
  distance_m?: number;
  humidity_pct?: number;
  atmospheric_c?: number;
  ext_optics_temp_c?: number;
  ext_optics_trans?: number;
  reference_temp_c?: number;
};
type AlignmentPayload = {
  twin_id?: string | null;
  scene_id?: string | null;
  transform?: unknown;
};
type FindingsReviewPayload = {
  accepted?: string[];
  dismissed?: string[];
  edits?: Record<string, string>;
};
type DisplayTransformPayload = {
  rotation?: 0 | 90 | 180 | 270;
  flipH?: boolean;
  flipV?: boolean;
};
type PairAlignPayload = {
  dx?: number;
  dy?: number;
  scale?: number;
};
type CapturePatchBody = {
  spots?: SpotPayload[];
  tuning?: TuningPayload;
  findings?: string;
  in_report?: boolean;
  report_order?: number;
  visual_pair_id?: string | null;
  /** Per-image color palette (display). */
  palette?: string;
  /** Twin-overlay alignment hook (schema only for now — see roadmap). */
  alignment?: AlignmentPayload | null;
  /** S6 AI Review: per-anomaly-index Accept/Dismiss/Edit state (additive). */
  findings_review?: FindingsReviewPayload;
  /** S5.6 non-destructive rotate/flip (display only — grid values never change). */
  display_transform?: DisplayTransformPayload | null;
  /** S6.5 fusion blend registration nudge (thermal-over-visual composite). */
  pair_align?: PairAlignPayload | null;
};

const CURATION_KEYS = [
  "findings",
  "in_report",
  "report_order",
  "visual_pair_id",
  "palette",
  "alignment",
  "findings_review",
  "display_transform",
  "pair_align",
] as const;

/**
 * Persists per-image edits onto a capture's metadata:
 *  - `metadata.spots`  user-authored probe spots (imported=true for baked markers)
 *  - `metadata.tuning` emissivity / reflected-temp tuning
 *  - `metadata.findings` operator findings narrative
 *  - `metadata.in_report` / `report_order` curation (include + order in report set)
 *  - `metadata.visual_pair_id` linked visual photo
 *  - `metadata.alignment` twin-overlay transform (schema hook)
 *  - `metadata.display_transform` non-destructive rotate/flip (S5.6, display only)
 */
export const PATCH = (req: NextRequest, { params }: Params) =>
  withThermalOpsAuth(req, async ({ admin, orgId }) => {
    const { captureId } = await params;
    if (!captureId) return badRequest("captureId is required");

    let body: CapturePatchBody;
    try {
      body = await req.json();
    } catch {
      return badRequest("Invalid JSON body");
    }
    const hasCuration = CURATION_KEYS.some((k) => body[k] !== undefined);
    if (body.spots === undefined && body.tuning === undefined && !hasCuration) {
      return badRequest("Nothing to update");
    }

    const { data: capture, error } = await admin
      .from("thermal_captures")
      .select("id, org_id, metadata")
      .eq("id", captureId)
      .is("deleted_at", null)
      .maybeSingle();

    if (error) return serverError(error.message);
    if (!capture || (orgId && capture.org_id && capture.org_id !== orgId)) {
      return notFound("Capture not found");
    }

    const metadata = { ...((capture.metadata ?? {}) as Record<string, unknown>) };

    if (Array.isArray(body.spots)) {
      metadata.spots = body.spots
        .filter((s) => s && typeof s.id === "string" && Number.isFinite(s.x) && Number.isFinite(s.y))
        .map((s) => {
          const base: Record<string, unknown> = {
            id: s.id,
            x: s.x,
            y: s.y,
            imported: Boolean(s.imported),
          };
          if (typeof s.label === "string" && s.label.length) base.label = s.label.slice(0, 120);
          if (s.auto === "max" || s.auto === "min") base.auto = s.auto;
          if (s.kind === "area") {
            base.kind = "area";
            base.areaShape = s.areaShape === "circle" ? "circle" : "box";
            if (Number.isFinite(s.w)) base.w = Number(s.w);
            if (Number.isFinite(s.h)) base.h = Number(s.h);
          } else if (s.kind === "line") {
            base.kind = "line";
            if (Number.isFinite(s.x2)) base.x2 = Number(s.x2);
            if (Number.isFinite(s.y2)) base.y2 = Number(s.y2);
          } else if (s.kind === "polygon" && Array.isArray(s.points)) {
            const points = s.points
              .filter((p) => p && Number.isFinite(p.x) && Number.isFinite(p.y))
              .slice(0, 64)
              .map((p) => ({ x: Number(p.x), y: Number(p.y) }));
            if (points.length >= 3) {
              base.kind = "polygon";
              base.points = points;
            }
          } else if (["crosshair", "crosshair-circle", "dot", "square"].includes(s.target ?? "")) {
            base.kind = "point";
            base.target = s.target;
          }
          return base;
        });
    }

    if (body.tuning && typeof body.tuning === "object") {
      const emissivity = Number(body.tuning.emissivity);
      const reflected = Number(body.tuning.reflected_c);
      const tuning: Record<string, number> = {
        emissivity: Number.isFinite(emissivity) ? emissivity : 0.95,
        reflected_c: Number.isFinite(reflected) ? reflected : 20,
      };
      // Optional environment params — persisted only when provided & finite.
      for (const key of [
        "distance_m",
        "humidity_pct",
        "atmospheric_c",
        "ext_optics_temp_c",
        "ext_optics_trans",
        "reference_temp_c",
      ] as const) {
        const v = Number(body.tuning[key]);
        if (Number.isFinite(v)) tuning[key] = v;
      }
      metadata.tuning = tuning;
    }

    if (typeof body.findings === "string") {
      metadata.findings = body.findings.slice(0, 5000);
    }
    if (typeof body.in_report === "boolean") {
      metadata.in_report = body.in_report;
    }
    if (Number.isFinite(body.report_order)) {
      metadata.report_order = Number(body.report_order);
    }
    if (body.visual_pair_id !== undefined) {
      metadata.visual_pair_id =
        typeof body.visual_pair_id === "string" ? body.visual_pair_id : null;
    }
    if (typeof body.palette === "string") {
      metadata.palette = body.palette.slice(0, 40);
    }
    if (body.alignment !== undefined) {
      metadata.alignment =
        body.alignment && typeof body.alignment === "object"
          ? {
              twin_id: body.alignment.twin_id ?? null,
              scene_id: body.alignment.scene_id ?? null,
              transform: body.alignment.transform ?? null,
            }
          : null;
    }
    if (body.display_transform !== undefined) {
      const dt = body.display_transform;
      const rotation = dt?.rotation;
      metadata.display_transform =
        dt && typeof dt === "object"
          ? {
              rotation: rotation === 90 || rotation === 180 || rotation === 270 ? rotation : 0,
              flipH: !!dt.flipH,
              flipV: !!dt.flipV,
            }
          : null;
    }
    if (body.pair_align !== undefined) {
      const pa = body.pair_align;
      metadata.pair_align =
        pa && typeof pa === "object"
          ? {
              dx: Number.isFinite(pa.dx) ? pa.dx : 0,
              dy: Number.isFinite(pa.dy) ? pa.dy : 0,
              scale: Number.isFinite(pa.scale) && pa.scale! > 0 ? pa.scale : 1,
            }
          : null;
    }
    if (body.findings_review && typeof body.findings_review === "object") {
      const fr = body.findings_review;
      metadata.findings_review = {
        accepted: Array.isArray(fr.accepted) ? fr.accepted.filter((v) => typeof v === "string").slice(0, 500) : [],
        dismissed: Array.isArray(fr.dismissed) ? fr.dismissed.filter((v) => typeof v === "string").slice(0, 500) : [],
        edits:
          fr.edits && typeof fr.edits === "object"
            ? Object.fromEntries(
                Object.entries(fr.edits)
                  .filter(([, v]) => typeof v === "string")
                  .slice(0, 500)
                  .map(([k, v]) => [k, String(v).slice(0, 2000)]),
              )
            : {},
      };
    }

    const { error: updateError } = await admin
      .from("thermal_captures")
      .update({ metadata })
      .eq("id", captureId);

    if (updateError) return serverError(updateError.message);
    return ok({ captureId, metadata });
  });
