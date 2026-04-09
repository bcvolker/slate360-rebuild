"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { ArrowRight, Loader2, CheckCircle2 } from "lucide-react";

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
      redirectTo: `${window.location.origin}/auth/callback?next=/account/reset-password`,
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
          <img src="/uploads/SLATE 360-Color Reversed Lockup.svg" alt="Slate360" className="h-7 w-auto" />
        </Link>
        <Link href="/login" className="text-sm text-muted-foreground auth-link">
          Back to <span className="font-semibold text-primary">Sign in</span>
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="auth-card">
          {done ? (
            <div className="text-center">
              <CheckCircle2 size={48} className="mx-auto mb-4 text-primary" />
              <h2 className="text-2xl font-black mb-2 text-foreground">Check your email</h2>
              <p className="text-muted-foreground mb-6">
                We sent a password reset link to <strong className="text-foreground">{email}</strong>. Click the link to set a new password.
              </p>
              <p className="text-xs text-muted-foreground">
                Didn&apos;t get it? Check your spam folder, or{" "}
                <button onClick={() => setDone(false)} className="text-primary underline">try again</button>.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h1 className="text-2xl font-black mb-1 text-foreground">Reset your password</h1>
                <p className="text-sm text-muted-foreground">Enter your email and we&apos;ll send you a reset link.</p>
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

              <p className="text-xs text-center text-muted-foreground mt-6">
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
