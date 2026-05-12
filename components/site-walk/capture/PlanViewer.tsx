"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, FileUp, Loader2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { createClient } from "@/lib/supabase/client";
import { PlanUploaderCard } from "@/components/site-walk/PlanUploaderCard";
import type { SiteWalkPlanSet, SiteWalkPlanSheet } from "@/lib/types/site-walk";
import { PlanViewerLeaflet } from "./PlanViewerLeaflet";
import { PlanViewerPdf } from "./PlanViewerPdf";

type Props = {
  projectId?: string | null;
  sessionId?: string;
  planSets?: SiteWalkPlanSet[];
  sheets?: SiteWalkPlanSheet[];
  items?: { id: string; title?: string; description?: string | null }[];
  onCaptureRequest?: (input: "camera" | "upload") => void;
  onSelectItem?: (itemId: string) => void;
};

export function PlanViewer(props: Props) {
  const isMobile = useIsMobile();
  const [localPlanSets, setLocalPlanSets] = useState<SiteWalkPlanSet[]>([]);
  const [localSheets, setLocalSheets] = useState<SiteWalkPlanSheet[]>([]);
  const [retrying, setRetrying] = useState(false);
  const [retryMessage, setRetryMessage] = useState<string | null>(null);
  const [failedJobError, setFailedJobError] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<"loading" | "none" | "queued" | "processing" | "stale" | "failed">("loading");

  const allPlanSets = useMemo(() => [...localPlanSets, ...(props.planSets ?? [])], [localPlanSets, props.planSets]);
  const allSheets = useMemo(() => [...localSheets, ...(props.sheets ?? [])], [localSheets, props.sheets]);

  const activePlanSet = useMemo(
    () => allPlanSets.find((set) => set.processing_status === "ready") ?? allPlanSets[0] ?? null,
    [allPlanSets]
  );

  const planSheets = useMemo(
    () => (activePlanSet ? allSheets.filter((sheet) => sheet.plan_set_id === activePlanSet.id) : []),
    [activePlanSet, allSheets]
  );

  const hasRasterized = planSheets.length > 0 && planSheets.some((s) => s.rasterized_key != null);
  // On mobile: always use Leaflet (or show processing state). Never fall back to React-PDF on mobile.
  const usingLeaflet = isMobile && hasRasterized;

  // Check whether the Trigger.dev rasterization job has failed/missing so we can surface it instead of spinning.
  useEffect(() => {
    if (!activePlanSet || hasRasterized) { setFailedJobError(null); setJobStatus("loading"); return; }
    let cancelled = false;
    setJobStatus("loading");
    const supabase = createClient();
    void supabase
      .from("plan_raster_jobs")
      .select("status, error_text, created_at")
      .eq("plan_set_id", activePlanSet.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .then(({ data }) => {
        if (cancelled) return;
        const job = data?.[0];
        if (!job) {
          // Old plan — uploaded before Trigger was built. No job row exists at all.
          setJobStatus("none");
          setFailedJobError(null);
        } else if (job.status === "failed") {
          setJobStatus("failed");
          setFailedJobError(job.error_text ?? "Rasterization failed (no details)");
        } else if ((job.status === "queued" || job.status === "processing") && isStaleJob(job.created_at)) {
          setJobStatus("stale");
          setFailedJobError(null);
        } else {
          setJobStatus(job.status as "queued" | "processing");
          setFailedJobError(null);
        }
      });
    return () => { cancelled = true; };
  }, [activePlanSet?.id, hasRasterized]);

  async function handleRetryRasterization() {
    if (!activePlanSet) return;
    setRetrying(true);
    setRetryMessage(null);
    try {
      const response = await fetch(`/api/site-walk/plan-sets/${encodeURIComponent(activePlanSet.id)}/rasterize`, { method: "POST" });
      const js = await response.json().catch(() => null) as { error?: string; message?: string; status?: string } | null;
      if (!response.ok) {
        setRetryMessage(`Failed: ${js?.error ?? response.statusText}`);
      } else if (js?.status === "failed" || js?.error) {
        setJobStatus("failed");
        setFailedJobError(js.error ?? js.message ?? "Trigger dispatch failed.");
        setRetryMessage(js.error ?? js.message ?? "Trigger dispatch failed.");
      } else {
        setJobStatus("queued");
        setFailedJobError(null);
        setRetryMessage("Processing started — the plan will appear automatically when ready.");
      }
    } catch (e: unknown) {
      setRetryMessage(`Network error: ${e instanceof Error ? e.message : "Unknown"}`);
    } finally {
      setRetrying(false);
    }
  }

  // Mobile without a rasterized image → show a processing screen.
  // Never show React-PDF on mobile (it crashes with touch gestures).
  if (isMobile && !hasRasterized) {
    // no activePlanSet means this project/walk has no plans yet — show uploader immediately
    // jobStatus="none" means old plan with no raster job row — show Generate button immediately
    // jobStatus="stale" means a queued/processing row is old enough to be considered stuck
    // jobStatus="failed" means job ran but failed — show error + retry
    // jobStatus="loading"|"queued"|"processing" means in-flight — show spinner
    const showUpload = !activePlanSet && !!props.projectId;
    const showGenerate = (jobStatus === "none" || jobStatus === "stale") && !!activePlanSet;
    const showError = jobStatus === "failed" && !!failedJobError;
    const showSpinner = !showGenerate && !showError;

    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-950 px-6 text-center">
        {showUpload ? (
          <div className="w-full max-w-md">
            <div className="mb-4">
              <FileUp className="mx-auto h-10 w-10 text-amber-400" />
              <p className="mt-2 text-base font-black text-white">Add plans to this walk</p>
              <p className="mt-1 text-xs font-semibold text-slate-400">Upload a PDF set now, then Site Walk will generate the mobile plan view.</p>
            </div>
            <PlanUploaderCard
              project={{ id: props.projectId ?? "", name: "Current project" }}
              onPlanRoomChange={(payload) => {
                setLocalPlanSets(payload.planSets);
                setLocalSheets(payload.sheets);
                setJobStatus("queued");
              }}
            />
          </div>
        ) : showError ? (
          <>
            <AlertTriangle className="h-10 w-10 text-red-400" />
            <div>
              <p className="text-base font-black text-white">Plan processing failed</p>
              <p className="mt-1 text-xs font-semibold text-slate-400">Error from worker:</p>
              <p className="mt-1 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-mono text-red-300">
                {failedJobError}
              </p>
            </div>
          </>
        ) : showGenerate ? (
          <>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10">
              <AlertTriangle className="h-8 w-8 text-amber-400" />
            </div>
            <div>
              <p className="text-base font-black text-white">{jobStatus === "stale" ? "Mobile generation is stuck" : "Mobile view not generated yet"}</p>
              <p className="mt-1 text-xs font-semibold text-slate-400">
                {jobStatus === "stale"
                  ? "The queued job is stale and never reached Trigger.dev. Tap below to regenerate it."
                  : "This plan was uploaded before the mobile processor was active. Tap below to generate it now."}
              </p>
            </div>
          </>
        ) : (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
            <div>
              <p className="text-base font-black text-white">
                {activePlanSet ? "Processing plan…" : "No plan set found"}
              </p>
              <p className="mt-1 text-xs font-semibold text-slate-400">
                {activePlanSet
                  ? "The plan is being converted for mobile. It will appear here automatically — no refresh needed."
                  : "Upload a plan from the walk setup screen."}
              </p>
            </div>
          </>
        )}
        {activePlanSet && (
          <button
            onClick={() => void handleRetryRasterization()}
            disabled={retrying}
            className="rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-black text-slate-950 hover:bg-amber-400 disabled:opacity-50"
          >
            {retrying ? "Starting…" : showGenerate ? "Generate Mobile View" : "Re-process plan"}
          </button>
        )}
        {retryMessage && (
          <p className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-300">
            {retryMessage}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      {usingLeaflet ? (
        <PlanViewerLeaflet {...props} planSets={allPlanSets} sheets={allSheets} />
      ) : (
        <PlanViewerPdf {...props} planSets={allPlanSets} sheets={allSheets} />
      )}
    </div>
  );
}

function isStaleJob(value: string | null | undefined) {
  if (!value) return false;
  const createdAt = new Date(value).getTime();
  if (!Number.isFinite(createdAt)) return false;
  return Date.now() - createdAt > 5 * 60 * 1000;
}

