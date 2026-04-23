"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ArrowRight, Loader2, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { SlateLogo } from "@/components/shared/SlateLogo";

export default function ResetPasswordPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setDone(true);
  }

  return (
    <div className="auth-page">
      <div className="auth-topbar">
        <Link href="/">
          <SlateLogo />
        </Link>
        <Link
          href="/login"
          className="text-sm text-slate-300 hover:text-white"
        >
          Back to <span className="font-semibold text-primary">Sign in</span>
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="auth-card">
          {done ? (
            <div className="text-center">
              <CheckCircle2 size={48} className="mx-auto mb-4 text-primary" />
              <h2 className="text-2xl font-black mb-2 text-slate-900">
                Password updated
              </h2>
              <p className="text-slate-600 mb-6">
                Your password has been reset successfully.
              </p>
              <button
                onClick={() => router.push("/login")}
                className="auth-btn-primary"
              >
                Sign in <ArrowRight size={15} />
              </button>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h1 className="text-2xl font-black mb-1 text-slate-900">
                  Set a new password
                </h1>
                <p className="text-sm text-slate-600">
                  Enter your new password below.
                </p>
              </div>

              {error && <div className="auth-error">{error}</div>}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="auth-label">New password</label>
                  <div className="relative">
                    <input
                      type={show ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="At least 8 characters"
                      className="auth-input pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShow(!show)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900"
                      aria-label={show ? "Hide password" : "Show password"}
                    >
                      {show ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="auth-label">Confirm password</label>
                  <input
                    type={show ? "text" : "password"}
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Re-enter your password"
                    className="auth-input"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="auth-btn-primary disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>
                      Update password <ArrowRight size={15} />
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
