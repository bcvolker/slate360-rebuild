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
    <div className="dark min-h-screen bg-zinc-950 flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800">
        <Link href="/">
          <img src="/uploads/SLATE 360-Color Reversed Lockup.svg" alt="Slate360" className="h-7 w-auto" />
        </Link>
        <Link href="/login" className="text-sm text-zinc-400 hover:text-[#D4AF37] transition-colors">
          Back to <span className="font-semibold text-[#D4AF37]">Sign in</span>
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-zinc-900/60 rounded-2xl border border-zinc-800 backdrop-blur-sm shadow-xl p-8">
          {done ? (
            <div className="text-center">
              <CheckCircle2 size={48} className="mx-auto mb-4 text-[#D4AF37]" />
              <h2 className="text-2xl font-black mb-2 text-white">Check your email</h2>
              <p className="text-zinc-400 mb-6">
                We sent a password reset link to <strong className="text-zinc-200">{email}</strong>. Click the link to set a new password.
              </p>
              <p className="text-xs text-zinc-500">
                Didn&apos;t get it? Check your spam folder, or{" "}
                <button onClick={() => setDone(false)} className="text-[#D4AF37] underline">try again</button>.
              </p>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h1 className="text-2xl font-black mb-1 text-white">Reset your password</h1>
                <p className="text-sm text-zinc-400">Enter your email and we&apos;ll send you a reset link.</p>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-xl bg-red-950/30 border border-red-800/50 text-sm text-red-400">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Email address</label>
                  <input
                    type="email" required value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@yourcompany.com"
                    className="w-full px-4 py-3 rounded-xl border border-zinc-700 bg-zinc-800/50 text-white placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 focus:border-[#D4AF37] text-sm transition-all"
                  />
                </div>

                <button
                  type="submit" disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full font-semibold text-sm text-black bg-[#D4AF37] hover:bg-[#c49f30] transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(212,175,55,0.3)]"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : <>Send reset link <ArrowRight size={15} /></>}
                </button>
              </form>

              <p className="text-xs text-center text-zinc-500 mt-6">
                Remember your password?{" "}
                <Link href="/login" className="text-[#D4AF37] underline">Sign in</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
