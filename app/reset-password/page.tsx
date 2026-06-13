"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { ArrowRight, Loader2, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { SlateIcon } from "@/components/shared/SlateIcon";
import {
  AUTH_BODY,
  AUTH_HEADING,
  AUTH_ICON_SUCCESS,
  AUTH_MUTED,
  AUTH_SUBMIT,
  AUTH_TOPBAR_LINK,
} from "@/components/auth/auth-styles";

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
              <h2 className={`mb-2 ${AUTH_HEADING}`}>Password updated</h2>
              <p className={`mb-6 ${AUTH_BODY}`}>Your password has been reset successfully.</p>
              <button type="button" onClick={() => router.push("/login")} className={AUTH_SUBMIT}>
                Sign in <ArrowRight size={15} />
              </button>
            </div>
          ) : (
            <>
              <div className="mb-8">
                <h1 className={`mb-1 ${AUTH_HEADING}`}>Set a new password</h1>
                <p className={AUTH_BODY}>Enter your new password below.</p>
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
                      className="absolute right-3 top-1/2 -translate-y-1/2 auth-muted hover:text-[var(--graphite-text-header)]"
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
                  className={`${AUTH_SUBMIT} disabled:cursor-not-allowed`}
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
