"use client";

import { useState } from "react";
import { HelpCircle, Lock, ShieldCheck, Unlock } from "lucide-react";
import { TWIN_CAPTURE_CHROME } from "@/lib/digital-twin/twin-capture-chrome-layout";
import type { QualityLockControlId } from "@/lib/digital-twin/twin-capture-quality-lock";
import { TWIN_CAPTURE_GLASS, TWIN_CAPTURE_HUD_TEXT } from "./twin-capture-glass";

type Control = {
  id: QualityLockControlId;
  label: string;
  supported: boolean;
  locked: boolean;
};

type Props = {
  hidden?: boolean;
  controls: Control[];
  anySupported: boolean;
  onToggle: (id: QualityLockControlId) => void;
};

/**
 * "Quality Lock" pills (photo mode). Locked-by-default, each tappable off, with
 * unsupported controls greyed. Visible on purpose — the CEO asked to *see* exactly
 * which camera settings are being held fixed for a consistent twin.
 */
export function TwinQualityLockRow({ hidden, controls, anySupported, onToggle }: Props) {
  const [showInfo, setShowInfo] = useState(false);
  if (hidden) return null;

  const safeBottom = "env(safe-area-inset-bottom)";

  return (
    <div
      className="pointer-events-auto absolute inset-x-0 z-30 flex flex-col items-center"
      style={{
        bottom: `calc(${TWIN_CAPTURE_CHROME.qualityLockBottomPx}px + ${safeBottom})`,
        paddingLeft: TWIN_CAPTURE_CHROME.railSideInsetPx,
        paddingRight: TWIN_CAPTURE_CHROME.railSideInsetPx,
      }}
      data-twin-chrome="quality-lock"
    >
      {showInfo ? (
        <div
          className={`mb-1.5 max-w-[19rem] px-3 py-2 text-center text-[11px] leading-snug ${TWIN_CAPTURE_HUD_TEXT} ${TWIN_CAPTURE_GLASS} !rounded-2xl`}
          role="status"
        >
          Locking exposure, color, and focus keeps every photo consistent for the best 3D result.
          Tap any to let the camera adjust it automatically.
          {!anySupported ? " Full manual lock needs the installed Slate360 app on this device." : ""}
        </div>
      ) : null}

      <div
        className={`flex max-w-full items-center gap-1.5 overflow-x-auto px-2 py-1 ${TWIN_CAPTURE_GLASS} !rounded-full [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden`}
      >
        <span
          className={`flex shrink-0 items-center gap-1 pl-1 pr-0.5 text-[10px] font-semibold uppercase tracking-wider ${
            anySupported ? "text-[var(--twin360-blue)]" : TWIN_CAPTURE_HUD_TEXT
          }`}
        >
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
          Quality lock
        </span>

        {controls.map((control) => {
          const interactive = control.supported;
          const on = control.supported && control.locked;
          return (
            <button
              key={control.id}
              type="button"
              disabled={!interactive}
              onClick={(event) => {
                event.stopPropagation();
                if (interactive) onToggle(control.id);
              }}
              data-twin-chrome={`quality-lock-${control.id}`}
              data-locked={on ? "true" : "false"}
              aria-pressed={on}
              title={
                control.supported
                  ? on
                    ? `${control.label} locked — tap for auto`
                    : `${control.label} auto — tap to lock`
                  : `${control.label} not available on this device`
              }
              className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold transition active:scale-[0.97] ${
                !interactive
                  ? "border-transparent text-[color-mix(in_srgb,var(--graphite-muted)_70%,transparent)] opacity-50"
                  : on
                    ? "border-[var(--accent-border-blue)] bg-[color-mix(in_srgb,var(--twin360-blue)_18%,transparent)] text-[var(--twin360-blue)]"
                    : `border-[var(--mobile-app-card-border)] ${TWIN_CAPTURE_HUD_TEXT}`
              }`}
            >
              {on ? (
                <Lock className="h-3 w-3" aria-hidden />
              ) : (
                <Unlock className="h-3 w-3" aria-hidden />
              )}
              <span>{control.label}</span>
              {interactive && !on ? <span className="opacity-70">Auto</span> : null}
            </button>
          );
        })}

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setShowInfo((value) => !value);
          }}
          aria-label="About Quality Lock"
          aria-expanded={showInfo}
          data-twin-chrome="quality-lock-info"
          className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${TWIN_CAPTURE_HUD_TEXT} active:scale-95`}
        >
          <HelpCircle className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
