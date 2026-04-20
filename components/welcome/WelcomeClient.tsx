"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2 } from "lucide-react";
import { WelcomeInstallStep } from "./WelcomeInstallStep";

interface UserProfile {
  id: string;
  email: string;
  name: string;
}

type Device = "ios" | "android" | "desktop";
type Status = "idle" | "saving" | "ok" | "error";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const USE_CASES = [
  "Punch lists",
  "Inspections",
  "Progress documentation",
  "360 tours",
  "Design review",
  "Other",
] as const;

export function WelcomeClient({ user }: { user: UserProfile }) {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [device, setDevice] = useState<Device>("desktop");
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [primaryUseCase, setPrimaryUseCase] = useState<string[]>([]);

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    if (/ipad|iphone|ipod/.test(ua)) setDevice("ios");
    else if (/android/.test(ua)) setDevice("android");

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const handlePwaInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setDeferredPrompt(null);
  };

  const skipInstall = async () => {
    try {
      await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skipInstall: true }),
      });
    } catch {
      // non-blocking
    }
    setStep(2);
  };

  const toggleUseCase = (uc: string) => {
    setPrimaryUseCase((prev) => {
      if (prev.includes(uc)) return prev.filter((u) => u !== uc);
      if (prev.length >= 8) return prev;
      return [...prev, uc];
    });
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("saving");
    try {
      const res = await fetch("/api/onboarding/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ primaryUseCase }),
      });
      if (!res.ok) throw new Error("Failed to save profile");
      setStatus("ok");
      setStep(3);
    } catch {
      setStatus("error");
    }
  };

  const handleComplete = async (destination: string) => {
    setStatus("saving");
    try {
      await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ next: destination }),
      });
    } catch {
      // continue navigation regardless
    }
    router.push(destination);
  };

  const qrUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/welcome?from=qr`
      : "https://slate360.ai/welcome?from=qr";

  return (
    <div className="w-full flex flex-col gap-8">
      <div className="flex items-center justify-between w-full max-w-sm mx-auto mb-2">
        {[1, 2, 3].map((num) => (
          <div key={num} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                step >= num
                  ? "bg-cobalt text-white"
                  : "bg-glass text-muted-foreground border border-border"
              }`}
            >
              {step > num ? <CheckCircle2 className="w-4 h-4" /> : num}
            </div>
            {num !== 3 && (
              <div
                className={`w-16 sm:w-24 h-1 mx-2 rounded ${
                  step > num ? "bg-cobalt" : "bg-border"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {step === 1 && (
        <WelcomeInstallStep
          device={device}
          deferredPrompt={deferredPrompt}
          qrUrl={qrUrl}
          userName={user.name}
          onContinue={() => setStep(2)}
          onSkip={skipInstall}
          onPwaInstall={handlePwaInstall}
        />
      )}

      {step === 2 && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full max-w-lg mx-auto">
          <h2 className="text-2xl font-bold mb-2 text-foreground">
            Customize your experience
          </h2>
          <p className="text-muted-foreground mb-6">
            What will you be using Slate360 for? Pick all that apply.
          </p>

          <form onSubmit={handleProfileSubmit} className="space-y-6">
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground block">
                Primary use cases
              </label>
              <div className="flex flex-wrap gap-2">
                {USE_CASES.map((uc) => (
                  <button
                    key={uc}
                    type="button"
                    onClick={() => toggleUseCase(uc)}
                    className={`px-4 py-2 rounded-full text-sm font-medium transition-colors border ${
                      primaryUseCase.includes(uc)
                        ? "bg-cobalt/20 border-cobalt text-cobalt"
                        : "bg-glass border-border text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {uc}
                  </button>
                ))}
              </div>
            </div>

            {status === "error" && (
              <p className="text-red-500 text-sm">
                Failed to save. Please try again.
              </p>
            )}

            <button
              type="submit"
              disabled={status === "saving"}
              className="bg-cobalt text-white hover:bg-cobalt/90 h-11 px-6 rounded-lg font-semibold w-full flex items-center justify-center disabled:opacity-60"
            >
              {status === "saving" ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                "Save and continue"
              )}
            </button>
          </form>
        </div>
      )}

      {step === 3 && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 text-center">
          <div className="w-16 h-16 bg-teal/20 text-teal rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-3xl font-bold mb-3 text-foreground">
            You&apos;re all set!
          </h2>
          <p className="text-muted-foreground mb-8">
            Where would you like to go first?
          </p>

          <div className="grid grid-cols-1 gap-4 max-w-sm mx-auto text-left">
            <DestinationCard
              title="Take a tour of Site Walk"
              subtitle="See how field capture works"
              onClick={() => handleComplete("/site-walk?firstrun=1")}
              disabled={status === "saving"}
            />
            <DestinationCard
              title="Create your first project"
              subtitle="Set up a workspace"
              onClick={() => handleComplete("/project-hub/new")}
              disabled={status === "saving"}
            />
            <DestinationCard
              title="Go to the dashboard"
              subtitle="See the full command center"
              onClick={() => handleComplete("/dashboard")}
              disabled={status === "saving"}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function DestinationCard({
  title,
  subtitle,
  onClick,
  disabled,
}: {
  title: string;
  subtitle: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="bg-card hover:bg-glass border border-border hover:border-cobalt transition-colors p-4 rounded-xl flex flex-col group disabled:opacity-60"
    >
      <span className="font-semibold text-foreground group-hover:text-cobalt transition-colors">
        {title}
      </span>
      <span className="text-sm text-muted-foreground">{subtitle}</span>
    </button>
  );
}
