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
        <Link href="/"><SlateLogo /></Link>
      </div>
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="auth-card text-center">
          <CheckCircle2 size={48} className={`mx-auto mb-4 ${emailSent ? "text-primary" : "text-amber-400"}`} />
          <h2 className="text-2xl font-black mb-2 text-foreground">
            {emailSent ? "Check your email" : "Account created!"}
          </h2>
          {emailSent ? (
            <>
              <p className="text-muted-foreground mb-4">
                We sent a confirmation link to <strong className="text-foreground">{email}</strong>. Click it to activate your account.
              </p>
              {selectedPlan && (
                <p className="text-xs text-muted-foreground mb-3">
                  Your {selectedPlan} ({selectedBilling}) selection is saved — after confirmation, sign in and continue checkout.
                </p>
              )}
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-gold-glow transition-colors hover:bg-primary/90 mb-4"
              >
                Already confirmed? Sign in →
              </Link>
              <p className="text-xs text-muted-foreground mb-2">
                Confirmed on another device? Click above to sign in here.
              </p>
              <p className="text-xs text-muted-foreground">
                Didn&apos;t get the email? Check spam or{" "}
                <button onClick={handleResendConfirmation} disabled={resending} className="text-primary underline disabled:opacity-50">
                  {resending ? "sending…" : "resend it"}
                </button>.
              </p>
              {resendResult && (
                <p className={`text-xs mt-2 ${resendResult.includes("sent") ? "text-emerald-400" : "text-destructive"}`}>
                  {resendResult}
                </p>
              )}
            </>
          ) : (
            <>
              <p className="text-muted-foreground mb-4">
                {apiError ?? "An account with this email already exists."}
              </p>
              <Link
                href="/login"
                className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-gold-glow transition-colors hover:bg-primary/90 mb-3"
              >
                Sign in
              </Link>
              <p className="text-xs text-muted-foreground mt-2">
                Forgot your password?{" "}
                <Link href="/forgot-password" className="text-primary underline">Reset it here</Link>.
              </p>
              <p className="text-xs text-muted-foreground mt-3">
                Wrong email?{" "}
                <button onClick={onRetry} className="text-primary underline">Try a different address</button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
