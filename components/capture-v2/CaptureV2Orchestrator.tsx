"use client";



import { useEffect, useMemo, useState } from "react";

import { PendingUploadPreviewModal } from "@/components/site-walk/capture/PendingUploadPreviewModal";

import { useSiteWalkSession } from "@/components/site-walk/SiteWalkSessionProvider";

import { CAPTURE_V2_LAYERS } from "./layers";

import { CaptureV2ActionHub } from "./CaptureV2ActionHub";

import { CaptureV2DetailDrawer } from "./CaptureV2DetailDrawer";

import { CaptureV2Viewfinder } from "./CaptureV2Viewfinder";

import { useCaptureV2Loop } from "./useCaptureV2Loop";

import type { CaptureV2UiPhase } from "./types";

import type { CaptureV2Session } from "./session-types";

import type { SiteWalkPlanSet, SiteWalkPlanSheet } from "@/lib/types/site-walk";



type Props = {

  session: CaptureV2Session;

  showPlanCanvas: boolean;

  showStartChoice: boolean;

  autoOpenCamera: boolean;

  launchId: string | null;

  initialItemId: string | null;

  planSets: SiteWalkPlanSet[];

  planSheets: SiteWalkPlanSheet[];

};



function resolveInitialPhase(props: Props): CaptureV2UiPhase {

  if (props.autoOpenCamera) return "viewfinder";

  if (props.initialItemId) return "drawer";

  if (props.showStartChoice) return "hub";

  return "hub";

}



export function CaptureV2Orchestrator(props: Props) {

  const { session, showPlanCanvas, planSets, planSheets, launchId, initialItemId } = props;

  const loop = useCaptureV2Loop({

    sessionId: session.id,

    projectId: session.project_id,

    initialItemId,

    launchId,

  });

  const { capturedItems } = useSiteWalkSession();

  const [phase, setPhase] = useState<CaptureV2UiPhase>(() => resolveInitialPhase(props));

  useEffect(() => {
    if (loop.activePreview && phase !== "viewfinder" && phase !== "drawer") {
      setPhase("viewfinder");
    }
  }, [loop.activePreview, phase]);



  const stopLabel = useMemo(() => {

    const count = loop.items.length || capturedItems.length;

    return count > 0 ? `Stop ${count + 1}` : "Stop 1";

  }, [capturedItems.length, loop.items.length]);



  const contextLabel = session.is_ad_hoc

    ? "Quick Walk"

    : session.project_name ?? "Plan Walk";



  const capturedCount = Math.max(loop.items.length, capturedItems.length);



  return (

    <>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">

        <div className="flex min-h-0 flex-1 overflow-hidden md:flex-row">

          <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden md:w-[60%]">

            {phase === "hub" && (

              <CaptureV2ActionHub

                session={session}

                loop={loop}

                capturedCount={capturedCount}

                onOpenDrawer={() => setPhase("drawer")}

              />

            )}

            {phase === "viewfinder" && <CaptureV2Viewfinder loop={loop} />}

            {phase === "drawer" && <CaptureV2DetailDrawer loop={loop} />}

            {phase === "plan" && (

              <PlanPlaceholder showPlanCanvas={showPlanCanvas} planCount={planSheets.length} />

            )}

            {phase === "summary" && <SummaryPlaceholder />}

          </section>



          <aside className="hidden min-h-0 w-[40%] flex-col overflow-hidden border-l border-white/5 bg-slate-950/40 md:flex">

            <DesktopDetailPanel

              session={session}

              phase={phase}

              stopLabel={stopLabel}

              contextLabel={contextLabel}

              capturedCount={capturedCount}

              machineState={loop.machineState}

              saveState={loop.saveState}

              uploadMessage={loop.status.message}

              showPlanCanvas={showPlanCanvas}

              planSetCount={planSets.length}

              planSheetCount={planSheets.length}

              activePreview={loop.activePreview}

            />

            {loop.activeItem && phase !== "drawer" && (

              <div className="min-h-0 flex-1 overflow-hidden border-t border-white/5">

                <CaptureV2DetailDrawer loop={loop} />

              </div>

            )}

          </aside>

        </div>



        <MobilePhaseBar phase={phase} onSelectPhase={setPhase} showPlanCanvas={showPlanCanvas} />

      </div>



      {loop.pendingUpload && (

        <PendingUploadPreviewModal

          fileName={loop.pendingUpload.file.name}

          imageUrl={loop.pendingUpload.url}

          busy={loop.busy || loop.confirmingUpload}

          errorMessage={loop.pendingUploadError}

          onCancel={loop.cancelPendingUpload}

          onConfirmAttach={loop.confirmPendingUpload}

        />

      )}

    </>

  );

}



function PlanPlaceholder({

  showPlanCanvas,

  planCount,

}: {

  showPlanCanvas: boolean;

  planCount: number;

}) {

  return (

    <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 text-center">

      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-300/80">

        Plan Canvas

      </p>

      <p className="mt-3 max-w-sm text-sm font-semibold leading-6 text-slate-400">

        {showPlanCanvas

          ? `${planCount} plan sheet${planCount === 1 ? "" : "s"} available. Leaflet plan viewer ships in a later slice.`

          : "This walk has no linked plan room."}

      </p>

    </div>

  );

}



function SummaryPlaceholder() {

  return (

    <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 text-center">

      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-300/80">

        In-Walk Summary

      </p>

      <p className="mt-3 max-w-sm text-sm font-semibold leading-6 text-slate-400">

        Use End Walk in the header to open the dedicated summary route.

      </p>

    </div>

  );

}



function DesktopDetailPanel({

  session,

  phase,

  stopLabel,

  contextLabel,

  capturedCount,

  machineState,

  saveState,

  uploadMessage,

  showPlanCanvas,

  planSetCount,

  planSheetCount,

  activePreview,

}: {

  session: CaptureV2Session;

  phase: CaptureV2UiPhase;

  stopLabel: string;

  contextLabel: string;

  capturedCount: number;

  machineState: string;

  saveState: string;

  uploadMessage: string;

  showPlanCanvas: boolean;

  planSetCount: number;

  planSheetCount: number;

  activePreview: { url: string; title: string } | null;

}) {

  return (

    <div className="flex min-h-0 flex-col overflow-hidden p-4">

      <p className="text-[11px] font-black uppercase tracking-[0.22em] text-amber-300/80">

        Capture Detail

      </p>

      <h2 className="mt-2 truncate text-lg font-black text-white">{session.title}</h2>



      {activePreview && (

        <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-black/40">

          <img

            src={activePreview.url}

            alt={activePreview.title}

            className="max-h-40 w-full object-contain"

          />

        </div>

      )}



      <dl className="mt-4 space-y-3 text-sm">

        <div>

          <dt className="text-[10px] font-black uppercase tracking-wider text-slate-500">Phase</dt>

          <dd className="mt-0.5 font-bold capitalize text-slate-200">{phase}</dd>

        </div>

        <div>

          <dt className="text-[10px] font-black uppercase tracking-wider text-slate-500">State</dt>

          <dd className="mt-0.5 font-bold text-slate-200">{machineState}</dd>

        </div>

        <div>

          <dt className="text-[10px] font-black uppercase tracking-wider text-slate-500">Context</dt>

          <dd className="mt-0.5 font-bold text-slate-200">

            {stopLabel} · {contextLabel}

          </dd>

        </div>

        <div>

          <dt className="text-[10px] font-black uppercase tracking-wider text-slate-500">

            Captured items

          </dt>

          <dd className="mt-0.5 font-bold text-slate-200">{capturedCount}</dd>

        </div>

        <div>

          <dt className="text-[10px] font-black uppercase tracking-wider text-slate-500">Draft save</dt>

          <dd className="mt-0.5 font-bold text-slate-200">{saveState}</dd>

        </div>

        <div>

          <dt className="text-[10px] font-black uppercase tracking-wider text-slate-500">Upload</dt>

          <dd className="mt-0.5 font-bold text-slate-200">{uploadMessage}</dd>

        </div>

        <div>

          <dt className="text-[10px] font-black uppercase tracking-wider text-slate-500">Plan room</dt>

          <dd className="mt-0.5 font-bold text-slate-200">

            {showPlanCanvas

              ? `${planSetCount} set${planSetCount === 1 ? "" : "s"} · ${planSheetCount} sheet${planSheetCount === 1 ? "" : "s"}`

              : "Not linked"}

          </dd>

        </div>

      </dl>

    </div>

  );

}



const MOBILE_PHASES: CaptureV2UiPhase[] = ["hub", "viewfinder", "drawer", "plan"];



function MobilePhaseBar({

  phase,

  onSelectPhase,

  showPlanCanvas,

}: {

  phase: CaptureV2UiPhase;

  onSelectPhase: (phase: CaptureV2UiPhase) => void;

  showPlanCanvas: boolean;

}) {

  const visiblePhases = showPlanCanvas ? MOBILE_PHASES : MOBILE_PHASES.filter((p) => p !== "plan");



  return (

    <nav

      className={`${CAPTURE_V2_LAYERS.fastTrack} shrink-0 border-t border-white/5 bg-slate-950/90 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 backdrop-blur-xl md:hidden`}

      aria-label="Capture phases"

    >

      <div className="flex gap-1 overflow-x-auto no-scrollbar">

        {visiblePhases.map((item) => (

          <button

            key={item}

            type="button"

            onClick={() => onSelectPhase(item)}

            className={`shrink-0 rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-wider ${

              phase === item

                ? "bg-amber-500 text-slate-950"

                : "border border-white/10 bg-white/[0.04] text-slate-300"

            }`}

          >

            {item}

          </button>

        ))}

        {phase !== "hub" && (

          <button

            type="button"

            onClick={() => onSelectPhase("hub")}

            className="shrink-0 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-300"

          >

            Hub

          </button>

        )}

      </div>

    </nav>

  );

}


