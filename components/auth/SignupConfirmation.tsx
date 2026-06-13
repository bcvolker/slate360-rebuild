"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { AuthGlassShell } from "@/components/auth/AuthGlassShell";
import {
  AUTH_BODY,
  AUTH_HEADING,
  AUTH_ICON_SUCCESS,
  AUTH_LINK,
  AUTH_MUTED,
  AUTH_SUBMIT,
} from "@/components/auth/auth-styles";

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
    <AuthGlassShell>
      <div className="text-center">
        <CheckCircle2 size={48} className={`mx-auto mb-4 ${AUTH_ICON_SUCCESS}`} />
        <h2 className={`mb-2 ${AUTH_HEADING}`}>
          {emailSent ? "Check your email" : "Account already exists"}
        </h2>
        {emailSent ? (
          <>
            <p className={`mb-4 ${AUTH_BODY}`}>
              We sent a confirmation link to{" "}
              <strong className="text-[var(--graphite-text-header)]">{email}</strong>.
              Click it to verify your email.
            </p>
            {selectedPlan && (
              <p className={`mb-3 ${AUTH_MUTED}`}>
                We noted your interest in{" "}
                <span className="font-semibold capitalize text-[var(--graphite-text-header)]">
                  {selectedPlan}
                </span>{" "}
                ({selectedBilling}). After you sign in, the team will align your workspace during
                Foundational Release onboarding.
              </p>
            )}
            <p className={`mb-4 ${AUTH_MUTED}`}>
              Once verified, sign in. Workspace access is granted after Slate360 reviews your
              request.
            </p>
            <Link href="/login" className={`${AUTH_SUBMIT} mb-4 max-w-xs mx-auto`}>
              Already confirmed? Sign in
            </Link>
            <p className={`mb-2 ${AUTH_MUTED}`}>
              Confirmed on another device? Use the button above to sign in here.
            </p>
            <p className={AUTH_MUTED}>
              Didn&apos;t get the email? Check spam or{" "}
              <button
                type="button"
                onClick={handleResendConfirmation}
                disabled={resending}
                className={`font-semibold underline disabled:opacity-50 ${AUTH_LINK}`}
              >
                {resending ? "sending…" : "resend it"}
              </button>
              .
            </p>
            {resendResult && (
              <p
                className={`mt-2 text-xs ${resendResult.includes("sent") ? "text-[var(--graphite-primary)]" : "text-red-300"}`}
              >
                {resendResult}
              </p>
            )}
          </>
        ) : (
          <>
            <p className={`mb-4 ${AUTH_BODY}`}>
              {apiError ?? "An account with this email already exists."}
            </p>
            <Link href="/login" className={`${AUTH_SUBMIT} mb-3 max-w-xs mx-auto`}>
              Sign in
            </Link>
            <p className={`mt-2 ${AUTH_MUTED}`}>
              Forgot your password?{" "}
              <Link href="/forgot-password" className={`underline ${AUTH_LINK}`}>
                Reset it here
              </Link>
              .
            </p>
            <p className={`mt-3 ${AUTH_MUTED}`}>
              Wrong email?{" "}
              <button type="button" onClick={onRetry} className={`underline ${AUTH_LINK}`}>
                Try a different address
              </button>
              .
            </p>
          </>
        )}
      </div>
    </AuthGlassShell>
  );
}
