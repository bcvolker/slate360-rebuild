"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { SlateLogo } from "@/components/shared/SlateLogo";

interface SignupConfirmationProps {
  email: string;
  emailSent: boolean;
  apiError: string | null;
  selectedPlan: string | null;
  selectedBilling: "monthly" | "annual";
  onRetry: () => void;
}

export default function SignupConfirmation({
  email,
  emailSent,
  apiError,
  selectedPlan,
  selectedBilling,
  onRetry,
}: SignupConfirmationProps) {
  const [resending, setResending] = useState(false);
  const [resendResult, setResendResult] = useState<string | null>(null);

  async function handleResendConfirmation() {
    setResending(true);
    setResendResult(null);
    try {
      const res = await fetch("/api/auth/resend-confirmation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (res.ok) {
        setResendResult("Confirmation email sent! Check your inbox.");
      } else {
        setResendResult(data.error || "Failed to resend. Try again later.");
      }
    } catch {
      setResendResult("Network error. Please try again.");
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-topbar">
        <Link href="/">
          <SlateLogo />
        </Link>
      </div>
      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="auth-card text-center">
          <CheckCircle2 size={48} className="mx-auto mb-4 text-amber-400" />
          <h2 className="mb-2 text-2xl font-black text-slate-900">
            {emailSent ? "Check your email" : "Account already exists"}
          </h2>
          {emailSent ? (
            <>
              <p className="mb-4 text-sm text-slate-600">
                We sent a confirmation link to <strong className="text-slate-900">{email}</strong>.
                Click it to verify your email.
              </p>
              {selectedPlan && (
                <p className="mb-3 text-xs text-slate-600">
                  We noted your interest in <span className="font-semibold text-slate-900 capitalize">{selectedPlan}</span> (
                  {selectedBilling}). After you sign in, the team will align your workspace during Foundational Release onboarding.
                </p>
              )}
              <p className="mb-4 text-xs text-slate-600">
                Once verified, sign in. Workspace access is granted after Slate360 reviews your request.
              </p>
              <Link href="/login" className="auth-btn-primary mb-4 max-w-xs mx-auto">
                Already confirmed? Sign in
              </Link>
              <p className="mb-2 text-xs text-slate-600">
                Confirmed on another device? Use the button above to sign in here.
              </p>
              <p className="text-xs text-slate-600">
                Didn&apos;t get the email? Check spam or{" "}
                <button
                  type="button"
                  onClick={handleResendConfirmation}
                  disabled={resending}
                  className="font-semibold text-primary underline disabled:opacity-50"
                >
                  {resending ? "sending…" : "resend it"}
                </button>
                .
              </p>
              {resendResult && (
                <p
                  className={`mt-2 text-xs ${resendResult.includes("sent") ? "text-emerald-600" : "text-destructive"}`}
                >
                  {resendResult}
                </p>
              )}
            </>
          ) : (
            <>
              <p className="mb-4 text-sm text-slate-600">
                {apiError ?? "An account with this email already exists."}
              </p>
              <Link href="/login" className="auth-btn-primary mb-3 max-w-xs mx-auto">
                Sign in
              </Link>
              <p className="mt-2 text-xs text-slate-600">
                Forgot your password?{" "}
                <Link href="/forgot-password" className="font-semibold text-primary underline">
                  Reset it here
                </Link>
                .
              </p>
              <p className="mt-3 text-xs text-slate-600">
                Wrong email?{" "}
                <button type="button" onClick={onRetry} className="font-semibold text-primary underline">
                  Try a different address
                </button>
                .
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
