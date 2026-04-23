"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";
import { SlateLogoOnLight } from "@/components/shared/SlateLogoOnLight";

/** Block open-redirect attacks: only allow relative paths that stay on our origin. */
function isSafeRedirectPath(url: string): boolean {
  return url.startsWith("/") && !url.startsWith("//") && !url.includes("://");
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawRedirect = searchParams?.get("redirectTo") ?? "/dashboard";
  const redirectTo = isSafeRedirectPath(rawRedirect) ? rawRedirect : "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push(redirectTo);
      router.refresh();
    }
  }

  async function handleOAuth(provider: "google" | "azure") {
    setOauthLoading(provider);
    setError(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
        scopes: provider === "azure" ? "openid profile email" : undefined,
      },
    });
    if (error) {
      setError(error.message);
      setOauthLoading(null);
    }
  }

  return (
    <div className="auth-page">
      {/* Top bar */}
      <div className="auth-topbar">
        <Link href="/" className="flex items-center gap-2">
          <SlateLogoOnLight />
        </Link>
        <Link href="/signup" className="text-sm text-slate-300 hover:text-white">
          No account? <span className="font-semibold text-cobalt">Sign up free</span>
        </Link>
      </div>

      {/* Card */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="auth-card">
          <div className="mb-8">
            <h1 className="text-2xl font-black text-slate-900 mb-1">Welcome back</h1>
            <p className="text-sm text-slate-600">Sign in to your Slate360 account</p>
          </div>

          {/* OAuth */}
          <div className="space-y-3 mb-6">
            <button
              onClick={() => handleOAuth("google")}
              disabled={!!oauthLoading || loading}
              className="auth-btn-oauth"
            >
              {oauthLoading === "google" ? <Loader2 size={16} className="animate-spin" /> : (
                <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              )}
              Continue with Google
            </button>
            <button
              onClick={() => handleOAuth("azure")}
              disabled={!!oauthLoading || loading}
              className="auth-btn-oauth"
            >
              {oauthLoading === "azure" ? <Loader2 size={16} className="animate-spin" /> : (
                <svg width="16" height="16" viewBox="0 0 23 23"><path fill="#f35325" d="M0 0h11v11H0z"/><path fill="#81bc06" d="M12 0h11v11H12z"/><path fill="#05a6f0" d="M0 12h11v11H0z"/><path fill="#ffba08" d="M12 12h11v11H12z"/></svg>
              )}
              Continue with Microsoft
            </button>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center"><div className="auth-divider-line" /></div>
            <div className="relative flex justify-center"><span className="auth-divider-text">or sign in with email</span></div>
          </div>

          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          <form onSubmit={handleEmailLogin} className="space-y-4">
            <div>
              <label className="auth-label">Email address</label>
              <input
                type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@yourcompany.com"
                className="auth-input"
              />
            </div>
            <div>
              <label className="auth-label">Password</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"} required value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="auth-input pr-11"
                />
                <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              <div className="text-right mt-1.5">
                <Link href="/forgot-password" className="text-xs text-slate-600 hover:text-cobalt transition-colors">Forgot password?</Link>
              </div>
            </div>
            <button
              type="submit" disabled={loading || !!oauthLoading}
              className="auth-btn-primary"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <>Sign in <ArrowRight size={15} /></>}
            </button>
          </form>

          <p className="text-center text-xs text-slate-600 mt-6">
            No account?{" "}
            <Link href="/signup" className="font-semibold text-cobalt hover:underline">Start a free trial</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
