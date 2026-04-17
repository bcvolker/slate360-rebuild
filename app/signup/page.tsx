"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";
import SignupConfirmation from "@/components/auth/SignupConfirmation";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [emailSent, setEmailSent] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreePrivacy, setAgreePrivacy] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [selectedBilling, setSelectedBilling] = useState<"monthly" | "annual">("monthly");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const plan = params.get("plan");
    const billing = params.get("billing");
    if (plan) setSelectedPlan(plan);
    if (billing === "annual") setSelectedBilling("annual");
  }, []);

  const supabase = createClient();

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const redirectAfter = selectedPlan
        ? `/plans?plan=${selectedPlan}&billing=${selectedBilling}`
        : undefined;
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name, redirectAfter }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          setApiError("An account with this email already exists.");
          setEmailSent(false);
          setDone(true);
          setLoading(false);
          return;
        }
        setError(data.error || "Signup failed. Please try again.");
        setLoading(false);
        return;
      }
      setDone(true);
      setEmailSent(true);
    } catch {
      setError("Network error. Please try again.");
      setLoading(false);
    }
  }

  async function handleOAuth(provider: "google" | "azure") {
    setOauthLoading(provider);
    setError(null);
    const callbackUrl = selectedPlan
      ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(`/plans?plan=${selectedPlan}&billing=${selectedBilling}`)}`
      : `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: callbackUrl,
        scopes: provider === "azure" ? "openid profile email" : undefined,
      },
    });
    if (error) { setError(error.message); setOauthLoading(null); }
  }

  if (done) {
    return (
      <SignupConfirmation
        email={email}
        emailSent={emailSent}
        apiError={apiError}
        selectedPlan={selectedPlan}
        selectedBilling={selectedBilling}
        onRetry={() => { setDone(false); setApiError(null); setEmailSent(true); }}
      />
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-topbar">
        <Link href="/"><img src="/uploads/slate360-logo-reversed-v2.svg" alt="Slate360" className="h-7 w-auto" /></Link>
        <Link href="/login" className="text-sm text-muted-foreground auth-link">
          Have an account? <span className="font-semibold text-primary">Sign in</span>
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="auth-card">
          <div className="mb-8">
            <h1 className="text-2xl font-black mb-1 text-foreground">Start your free trial</h1>
            <p className="text-sm text-muted-foreground">No credit card required. All modules included.</p>
            {selectedPlan && (
              <p className="text-xs text-muted-foreground mt-2">
                Plan selected: <span className="font-semibold text-foreground capitalize">{selectedPlan}</span> · {selectedBilling}
              </p>
            )}
          </div>

          <div className="space-y-3 mb-6">
            <button onClick={() => handleOAuth("google")} disabled={!!oauthLoading || loading}
              className="auth-btn-oauth">
              {oauthLoading === "google" ? <Loader2 size={16} className="animate-spin" /> : (
                <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              )}
              Continue with Google
            </button>
            <button onClick={() => handleOAuth("azure")} disabled={!!oauthLoading || loading}
              className="auth-btn-oauth">
              {oauthLoading === "azure" ? <Loader2 size={16} className="animate-spin" /> : (
                <svg width="16" height="16" viewBox="0 0 23 23"><path fill="#f35325" d="M0 0h11v11H0z"/><path fill="#81bc06" d="M12 0h11v11H12z"/><path fill="#05a6f0" d="M0 12h11v11H0z"/><path fill="#ffba08" d="M12 12h11v11H12z"/></svg>
              )}
              Continue with Microsoft
            </button>
          </div>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center"><div className="auth-divider-line" /></div>
            <div className="relative flex justify-center"><span className="auth-divider-text">or sign up with email</span></div>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="auth-label">Full name *</label>
              <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Smith"
                className="auth-input" />
            </div>
            <div>
              <label className="auth-label">Work email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@yourcompany.com"
                className="auth-input" />
            </div>
            <div>
              <label className="auth-label">Password</label>
              <div className="relative">
                <input type={showPass ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters"
                  minLength={8}
                  className="auth-input pr-11" />
                <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div className="space-y-2.5 pt-1">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" required checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-input accent-primary cursor-pointer" />
                <span className="text-xs text-muted-foreground leading-relaxed">
                  I agree to the{" "}
                  <Link href="/terms" target="_blank" rel="noopener noreferrer" className="font-semibold text-foreground underline hover:text-primary">Terms of Service</Link>{" "}
                  <span className="text-destructive font-bold">*</span>
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" required checked={agreePrivacy} onChange={(e) => setAgreePrivacy(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-input accent-primary cursor-pointer" />
                <span className="text-xs text-muted-foreground leading-relaxed">
                  I agree to the{" "}
                  <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="font-semibold text-foreground underline hover:text-primary">Privacy Policy</Link>{" "}
                  and consent to receiving product updates{" "}
                  <span className="text-destructive font-bold">*</span>
                </span>
              </label>
            </div>

            <button type="submit" disabled={loading || !!oauthLoading || !agreeTerms || !agreePrivacy}
              className="auth-btn-primary disabled:cursor-not-allowed">
              {loading ? <Loader2 size={16} className="animate-spin" /> : <>Create account <ArrowRight size={15} /></>}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
