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
import { X, Camera, MapPin, Bell, Share2, Smartphone, Gift, ArrowRight, ArrowLeft, Check } from "lucide-react";

const STORAGE_KEY = "slate360.onboarding.preview.dismissed";

const steps = [
  {
    id: "welcome",
    title: "Welcome to the Slate360 beta",
    body: "You're one of 200 early testers. This is the mobile app shell preview — what your installed app will look and feel like once you finish onboarding.",
    icon: Smartphone,
  },
  {
    id: "install",
    title: "Install Slate360 on your phone",
    body: "Tap your browser's Share button → Add to Home Screen. Slate360 will open chromeless like a native app — no App Store needed during beta.",
    icon: Smartphone,
    bullets: [
      "iPhone: Safari → Share icon → Add to Home Screen",
      "Android: Chrome → ⋮ menu → Install app",
      "Slate360 icon appears on your home screen",
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
    body: "Tap the QR icon at the top of your screen any time to invite a teammate or another firm.",
    icon: Gift,
    bullets: [
      "Share generates a personal QR code + invite link",
      "When 3 people sign up using your link → 1 month free",
      "When 10 sign up → 25% off your first paid year",
      "Track referrals in My Account → Referrals (coming with PR #28)",
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
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setStep(0);
          setOpen(true);
        }}
        className="fixed bottom-[100px] right-3 z-30 lg:bottom-6 lg:right-6 h-11 rounded-full bg-cobalt text-white text-xs font-semibold px-4 shadow-[0_4px_20px_rgba(59,130,246,0.45)] flex items-center gap-2 hover:bg-cobalt-hover transition-colors"
        aria-label="Show onboarding"
      >
        <Smartphone className="h-4 w-4" />
        How to install
      </button>
    );
  }

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
