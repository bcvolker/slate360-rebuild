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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-100">
        <Link href="/">
          <img src="/logo.svg" alt="Slate360" className="h-7 w-auto" />
        </Link>
        <Link href="/login" className="text-sm text-gray-500 hover:text-[#FF4D00] transition-colors">
          Back to <span className="font-semibold text-[#FF4D00]">Sign in</span>
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-white rounded-2xl border border-gray-200 shadow-sm p-8">
          {done ? (
            <div className="text-center">
              <CheckCircle2 size={48} className="mx-auto mb-4" style={{ color: "#FF4D00" }} />
              <h2 className="text-2xl font-black mb-2" style={{ color: "#1E3A8A" }}>Check your email</h2>
              <p className="text-gray-500 mb-6">
                We sent a password reset link to <strong>{email}</strong>. Click the link to set a new password.
              </p>
              <p className="text-xs text-gray-400">
                Didn&apos;t get it? Check your spam folder, or{" "}
                <button
                  onClick={() => setDone(false)}
                  className="text-[#FF4D00] underline"
                >
                  try again
                </button>
                .
              </p>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h1 className="text-2xl font-black mb-1" style={{ color: "#1E3A8A" }}>Reset your password</h1>
                <p className="text-sm text-gray-500">
                  Enter your email and we&apos;ll send you a reset link.
                </p>
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-600">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    Email address
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@yourcompany.com"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/30 focus:border-[#FF4D00] text-sm transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-full font-semibold text-sm text-white transition-all hover:opacity-90 hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ backgroundColor: "#FF4D00" }}
                >
                  {loading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>Send reset link <ArrowRight size={15} /></>
                  )}
                </button>
              </form>

              <p className="text-xs text-center text-gray-400 mt-6">
                Remember your password?{" "}
                <Link href="/login" className="text-[#FF4D00] underline">Sign in</Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
