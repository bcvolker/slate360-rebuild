"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { SlateIcon } from "@/components/shared/SlateIcon";
import {
  AUTH_BODY,
  AUTH_HEADING,
  AUTH_ICON_SUCCESS,
  AUTH_LINK,
  AUTH_MUTED,
  AUTH_SUBMIT,
  AUTH_TOPBAR_LINK,
} from "@/components/auth/auth-styles";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setDone(true);
  }

  return (
    <div className="auth-page">
      <div className="auth-topbar">
        <Link href="/" aria-label="Slate360 home">
          <SlateIcon className="h-9 w-9" />
        </Link>
        <Link href="/login" className={AUTH_TOPBAR_LINK}>
          Back to <span className="font-semibold auth-link">Sign in</span>
        </Link>
      </div>

      <div className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="auth-card">
          {done ? (
            <div className="text-center">
              <CheckCircle2 size={48} className={`mx-auto mb-4 ${AUTH_ICON_SUCCESS}`} />
              <h2 className={`mb-2 ${AUTH_HEADING}`}>Check your email</h2>
              <p className={`mb-6 ${AUTH_BODY}`}>
                We sent a password reset link to{" "}
                <strong className="text-[var(--graphite-text-header)]">{email}</strong>. Click the
                link to set a new password.
              </p>
              <p className={AUTH_MUTED}>
                Didn&apos;t get it? Check your spam folder, or{" "}
                <button type="button" onClick={() => setDone(false)} className={`underline ${AUTH_LINK}`}>
                  try again
                </button>
                .
              </p>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h1 className={`mb-1 ${AUTH_HEADING}`}>Reset your password</h1>
                <p className={AUTH_BODY}>Enter your email and we&apos;ll send you a reset link.</p>
              </div>

              {error && <div className="auth-error">{error}</div>}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="auth-label">Email address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@yourcompany.com"
                    className="auth-input"
                  />
                </div>

                <button type="submit" disabled={loading} className={`${AUTH_SUBMIT} disabled:cursor-not-allowed`}>
                  {loading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>
                      Send reset link <ArrowRight size={15} />
                    </>
                  )}
                </button>
              </form>

              <p className={`mt-6 text-center ${AUTH_MUTED}`}>
                Remember your password?{" "}
                <Link href="/login" className={`underline ${AUTH_LINK}`}>
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
