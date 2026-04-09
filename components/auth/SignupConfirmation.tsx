"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

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
    <div className="dark min-h-screen bg-zinc-950 flex flex-col">
      <div className="flex items-center px-6 py-4 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800">
        <Link href="/"><img src="/uploads/SLATE 360-Color Reversed Lockup.svg" alt="Slate360" className="h-7 w-auto" /></Link>
      </div>
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-zinc-900/60 rounded-2xl border border-zinc-800 backdrop-blur-sm shadow-xl p-8 text-center">
          <CheckCircle2 size={48} className={`mx-auto mb-4 ${emailSent ? "text-[#D4AF37]" : "text-amber-400"}`} />
          <h2 className="text-2xl font-black mb-2 text-white">
            {emailSent ? "Check your email" : "Account created!"}
          </h2>
          {emailSent ? (
            <>
              <p className="text-zinc-400 mb-4">
                We sent a confirmation link to <strong className="text-zinc-200">{email}</strong>. Click it to activate your account.
              </p>
              {selectedPlan && (
                <p className="text-xs text-zinc-500 mb-3">
                  Your {selectedPlan} ({selectedBilling}) selection is saved — after confirmation, sign in and continue checkout.
                </p>
              )}
              <Link
                href="/login"
                className="inline-block bg-[#D4AF37] text-black px-6 py-2.5 rounded-xl font-semibold text-sm mb-4 hover:bg-[#c49f30] transition-colors"
              >
                Already confirmed? Sign in →
              </Link>
              <p className="text-xs text-zinc-500 mb-2">
                Confirmed on another device? Click above to sign in here.
              </p>
              <p className="text-xs text-zinc-500">
                Didn&apos;t get the email? Check spam or{" "}
                <button onClick={handleResendConfirmation} disabled={resending} className="text-[#D4AF37] underline disabled:opacity-50">
                  {resending ? "sending…" : "resend it"}
                </button>.
              </p>
              {resendResult && (
                <p className={`text-xs mt-2 ${resendResult.includes("sent") ? "text-emerald-400" : "text-red-400"}`}>
                  {resendResult}
                </p>
              )}
            </>
          ) : (
            <>
              <p className="text-zinc-400 mb-4">
                {apiError ?? "An account with this email already exists."}
              </p>
              <Link
                href="/login"
                className="inline-block bg-[#D4AF37] text-black px-6 py-2.5 rounded-xl font-semibold text-sm mb-3 hover:bg-[#c49f30] transition-colors"
              >
                Sign in
              </Link>
              <p className="text-xs text-zinc-500 mt-2">
                Forgot your password?{" "}
                <Link href="/forgot-password" className="text-[#D4AF37] underline">Reset it here</Link>.
              </p>
              <p className="text-xs text-zinc-500 mt-3">
                Wrong email?{" "}
                <button onClick={onRetry} className="text-[#D4AF37] underline">Try a different address</button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
