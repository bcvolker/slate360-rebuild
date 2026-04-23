"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";
import SignupConfirmation from "@/components/auth/SignupConfirmation";
import { SlateLogoOnLight } from "@/components/shared/SlateLogoOnLight";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  // Optional demographic fields — collected at signup so the operations
  // console can segment users by industry, role, company size, etc.
  const [company, setCompany] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [industry, setIndustry] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [referralSource, setReferralSource] = useState("");
  // Referral code — auto-filled from ?ref=CODE URL param. Locked once set
  // from URL so the original referral attribution is preserved.
  const [referredBy, setReferredBy] = useState("");
  const [referredByLocked, setReferredByLocked] = useState(false);
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
    const ref = params.get("ref");
    if (plan) setSelectedPlan(plan);
    if (billing === "annual") setSelectedBilling("annual");
    if (ref && ref.trim().length > 0) {
      setReferredBy(ref.trim().toUpperCase());
      setReferredByLocked(true);
    }
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
        body: JSON.stringify({
          email,
          password,
          name,
          redirectAfter,
          demographics: {
            company: company || null,
            jobTitle: jobTitle || null,
            industry: industry || null,
            companySize: companySize || null,
            referralSource: referralSource || null,
            referredBy: referredBy ? referredBy.trim().toUpperCase() : null,
          },
        }),
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
        <Link href="/"><SlateLogoOnLight /></Link>
        <Link href="/login" className="text-sm text-slate-300 hover:text-white">
          Have an account? <span className="font-semibold text-primary">Sign in</span>
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="auth-card">
          <div className="mb-8">
            <h1 className="text-2xl font-black mb-1 text-slate-900">Start your free trial</h1>
            <p className="text-sm text-slate-600">No credit card required. All modules included.</p>
            {selectedPlan && (
              <p className="text-xs text-slate-600 mt-2">
                Plan selected: <span className="font-semibold text-slate-900 capitalize">{selectedPlan}</span> · {selectedBilling}
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
                <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900">
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Optional demographic fields — helps tailor your experience */}
            <details className="group rounded-xl border border-input bg-card/40 px-4 py-3">
              <summary className="flex items-center justify-between cursor-pointer text-xs font-semibold text-slate-500 hover:text-slate-900">
                <span>Tell us about your work <span className="text-slate-500 font-normal">(optional)</span></span>
                <span className="text-slate-500 group-open:rotate-180 transition-transform">▾</span>
              </summary>
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="auth-label">Company / Organization</label>
                    <input type="text" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Acme Construction" className="auth-input" />
                  </div>
                  <div>
                    <label className="auth-label">Job title</label>
                    <input type="text" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} placeholder="Project Manager" className="auth-input" />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="auth-label">Industry</label>
                    <select value={industry} onChange={(e) => setIndustry(e.target.value)} className="auth-input">
                      <option value="">Select…</option>
                      <option>General Contractor</option>
                      <option>Architecture</option>
                      <option>Engineering</option>
                      <option>Owner / Developer</option>
                      <option>Subcontractor</option>
                      <option>Real Estate</option>
                      <option>Education</option>
                      <option>Government / Public Works</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="auth-label">Company size</label>
                    <select value={companySize} onChange={(e) => setCompanySize(e.target.value)} className="auth-input">
                      <option value="">Select…</option>
                      <option>Just me</option>
                      <option>2–10</option>
                      <option>11–50</option>
                      <option>51–200</option>
                      <option>201–1000</option>
                      <option>1000+</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="auth-label">How did you hear about us?</label>
                  <input type="text" value={referralSource} onChange={(e) => setReferralSource(e.target.value)} placeholder="Search, colleague, conference…" className="auth-input" />
                </div>
                <div>
                  <label className="auth-label">
                    Referred by
                    {referredByLocked && (
                      <span className="ml-2 text-[10px] text-primary font-semibold uppercase tracking-wider">From link</span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={referredBy}
                    onChange={(e) => setReferredBy(e.target.value.toUpperCase())}
                    placeholder="Referral code (optional)"
                    readOnly={referredByLocked}
                    className={`auth-input uppercase ${referredByLocked ? "opacity-70 cursor-not-allowed" : ""}`}
                  />
                  <p className="text-[11px] text-slate-600 mt-1">
                    Both you and your referrer earn rewards once your subscription clears.
                  </p>
                </div>
              </div>
            </details>
            <div className="space-y-2.5 pt-1">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" required checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-input accent-primary cursor-pointer" />
                <span className="text-xs text-slate-600 leading-relaxed">
                  I agree to the{" "}
                  <Link href="/terms" target="_blank" rel="noopener noreferrer" className="font-semibold text-slate-900 underline hover:text-cobalt">Terms of Service</Link>{" "}
                  <span className="text-destructive font-bold">*</span>
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" required checked={agreePrivacy} onChange={(e) => setAgreePrivacy(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-input accent-primary cursor-pointer" />
                <span className="text-xs text-slate-600 leading-relaxed">
                  I agree to the{" "}
                  <Link href="/privacy" target="_blank" rel="noopener noreferrer" className="font-semibold text-slate-900 underline hover:text-cobalt">Privacy Policy</Link>{" "}
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
