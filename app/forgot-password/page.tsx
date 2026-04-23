"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ArrowRight, Loader2, CheckCircle2 } from "lucide-react";
import { SlateLogoOnLight } from "@/components/shared/SlateLogoOnLight";

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
        <Link href="/">
          <SlateLogoOnLight />
        </Link>
        <Link href="/login" className="text-sm text-slate-300 hover:text-white">
          Back to <span className="font-semibold text-primary">Sign in</span>
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="auth-card">
          {done ? (
            <div className="text-center">
              <CheckCircle2 size={48} className="mx-auto mb-4 text-primary" />
              <h2 className="text-2xl font-black mb-2 text-slate-900">Check your email</h2>
              <p className="text-slate-600 mb-6">
                We sent a password reset link to <strong className="text-slate-900">{email}</strong>. Click the link to set a new password.
              </p>
              <p className="text-xs text-slate-600">
                Didn&apos;t get it? Check your spam folder, or{" "}
                <button onClick={() => setDone(false)} className="text-primary underline">try again</button>.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h1 className="text-2xl font-black mb-1 text-slate-900">Reset your password</h1>
                <p className="text-sm text-slate-600">Enter your email and we&apos;ll send you a reset link.</p>
              </div>

              {error && <div className="auth-error">{error}</div>}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="auth-label">Email address</label>
                  <input
                    type="email" required value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@yourcompany.com"
                    className="auth-input"
                  />
                </div>

                <button
                  type="submit" disabled={loading}
                  className="auth-btn-primary disabled:cursor-not-allowed"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <>Send reset link <ArrowRight size={15} /></>}
                </button>
              </form>

              <p className="text-xs text-center text-slate-600 mt-6">
                Remember your password?{" "}
                <Link href="/login" className="text-primary underline">Sign in</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
