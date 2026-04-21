"use client";

/**
 * OnboardingTeaser — fullscreen modal that auto-shows on first visit to
 * /preview/app-shell-v1 (and is the design we'll wire to post-signup).
 *
 * Walks the user through:
 *   1. Welcome + what to expect
 *   2. Install as PWA (Add to Home Screen)
 *   3. Permissions explainer (camera, location, notifications) + WHY each is needed
 *   4. Referral program — share to earn discount
 *
 * Persists dismissal in localStorage (`slate360.onboarding.preview.dismissed`).
 */

import { useEffect, useState } from "react";
import { X, Camera, MapPin, Bell, Download, Smartphone, Gift, ArrowRight, ArrowLeft, Check } from "lucide-react";

const STORAGE_KEY = "slate360.onboarding.preview.dismissed";

// Beta seat counts — sourced from API in production. Hardcoded mock here.
// Threshold: only show progress bar once ≥ 80% of cap is filled.
const BETA_SEATS_CLAIMED = 47;
const BETA_SEATS_CAP = 200;
const BETA_VISIBILITY_THRESHOLD = 0.8;
const betaPct = BETA_SEATS_CLAIMED / BETA_SEATS_CAP;
const showBetaProgress = betaPct >= BETA_VISIBILITY_THRESHOLD;

const steps = [
  {
    id: "welcome",
    title: "Welcome to the Slate360 beta",
    body: "You're one of a limited number of early testers helping shape Slate360. This is the mobile app shell — what your installed app will look and feel like.",
    icon: Smartphone,
    showBetaProgress: true,
  },
  {
    id: "download",
    title: "Download Slate360 to your phone",
    body: "No App Store needed during beta. Slate360 installs directly from your browser and opens like a native app.",
    icon: Download,
    bullets: [
      "iPhone: Safari → tap the Share icon → Add to Home Screen",
      "Android: Chrome → ⋮ menu → Install app",
      "Slate360 icon will appear on your home screen",
    ],
  },
  {
    id: "permissions",
    title: "Permissions Slate360 will ask for",
    body: "You'll see permission prompts when you first use a feature. Here's what each one is for and why it's needed.",
    icon: Camera,
    permissions: [
      { icon: Camera, name: "Camera", why: "Capture site walk photos and 360° tours directly from your phone." },
      { icon: MapPin, name: "Location", why: "Geo-tag photos and pin observations to a coordinate on your site plan." },
      { icon: Bell, name: "Notifications", why: "Alert you when teammates assign work, share deliverables, or comment on your captures." },
    ],
  },
  {
    id: "referral",
    title: "Share Slate360 → earn rewards",
    body: "Tap the QR icon at the top of your screen to invite a teammate or another firm. Bigger rewards when invitees subscribe annually.",
    icon: Gift,
    bullets: [
      "Share generates a personal QR code + invite link",
      "1 paid signup → 1 free month",
      "1 annual signup → 50% off your next annual renewal",
      "5 annual signups → 1 free year",
      "Rewards confirm 90 days after invitee's first payment clears",
    ],
  },
];

export function OnboardingTeaser() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setOpen(true);
    } catch {
      setOpen(true);
    }
    // Listen for header Download button → reopens this modal at step 1 (download)
    const handler = () => {
      setStep(1);
      setOpen(true);
    };
    window.addEventListener("slate360:open-onboarding", handler);
    return () => window.removeEventListener("slate360:open-onboarding", handler);
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  if (!open) return null;

  const current = steps[step];
  const Icon = current.icon;
  const isLast = step === steps.length - 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      className="fixed inset-0 z-50 flex items-end lg:items-center justify-center bg-black/70 backdrop-blur-sm p-0 lg:p-6"
    >
      <div className="relative w-full max-w-md bg-[#0B0F15] border border-white/10 rounded-t-3xl lg:rounded-3xl shadow-2xl overflow-hidden">
        {/* Header with progress dots */}
        <div className="flex items-center justify-between p-4 border-b border-white/5">
          <div className="flex gap-1.5">
            {steps.map((s, i) => (
              <span
                key={s.id}
                className={`h-1.5 rounded-full transition-all ${
                  i === step ? "w-6 bg-cobalt" : i < step ? "w-1.5 bg-cobalt/50" : "w-1.5 bg-white/15"
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Skip onboarding"
            className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-foreground hover:bg-white/5"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 pb-4">
          <div className="h-12 w-12 rounded-2xl bg-cobalt/15 text-cobalt flex items-center justify-center mb-4">
            <Icon className="h-6 w-6" />
          </div>
          <h2 id="onboarding-title" className="text-lg font-semibold text-foreground">
            {current.title}
          </h2>
          <p className="text-sm text-slate-400 mt-2 leading-relaxed">{current.body}</p>

          {/* Beta seat status — show only when ≥80% full (else just a generic note) */}
          {current.showBetaProgress && (
            <div className="mt-4 rounded-xl bg-[#151A23] border border-cobalt/20 p-3">
              {showBetaProgress ? (
                <>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-foreground">Beta is filling up</span>
                    <span className="text-xs font-semibold text-cobalt">{Math.round(betaPct * 100)}% full</span>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cobalt to-cobalt-hover transition-all"
                      style={{ width: `${Math.round(betaPct * 100)}%` }}
                    />
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Gift className="h-3.5 w-3.5 text-cobalt flex-shrink-0" />
                  <span>Limited beta tester spots available — invite teammates to claim a seat.</span>
                </div>
              )}
            </div>
          )}

          {current.bullets && (
            <ul className="mt-4 space-y-2">
              {current.bullets.map((b) => (
                <li key={b} className="flex items-start gap-2 text-sm text-slate-300">
                  <Check className="h-4 w-4 text-cobalt flex-shrink-0 mt-0.5" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          )}

          {current.permissions && (
            <ul className="mt-4 space-y-3">
              {current.permissions.map((p) => {
                const PIcon = p.icon;
                return (
                  <li key={p.name} className="flex items-start gap-3 rounded-xl bg-[#151A23] border border-white/5 p-3">
                    <span className="h-9 w-9 rounded-lg bg-cobalt/15 text-cobalt flex items-center justify-center flex-shrink-0">
                      <PIcon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground">{p.name}</div>
                      <div className="text-xs text-slate-400 leading-snug mt-0.5">{p.why}</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 p-4 border-t border-white/5" style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}>
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="h-10 px-3 rounded-lg text-sm text-slate-400 hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>

          {isLast ? (
            <button
              type="button"
              onClick={dismiss}
              className="h-10 px-5 rounded-lg bg-cobalt text-white text-sm font-semibold hover:bg-cobalt-hover flex items-center gap-2"
            >
              <Share2 className="h-4 w-4" />
              Got it — let&apos;s go
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStep((s) => Math.min(steps.length - 1, s + 1))}
              className="h-10 px-5 rounded-lg bg-cobalt text-white text-sm font-semibold hover:bg-cobalt-hover flex items-center gap-2"
            >
              Next
              <ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
