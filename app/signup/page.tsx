"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Eye, EyeOff, ArrowRight, Loader2 } from "lucide-react";
import SignupConfirmation from "@/components/auth/SignupConfirmation";
import { SignupDemographics } from "@/components/auth/SignupDemographics";
import { AuthGlassShell } from "@/components/auth/AuthGlassShell";
import {
  AUTH_BODY,
  AUTH_DIVIDER,
  AUTH_DIVIDER_TEXT,
  AUTH_ERROR,
  AUTH_HEADING,
  AUTH_INPUT,
  AUTH_LABEL,
  AUTH_LINK,
  AUTH_MUTED,
  AUTH_OAUTH,
  AUTH_SUBMIT,
} from "@/components/auth/auth-styles";

const TURNSTILE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

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
  const [orgRequest, setOrgRequest] = useState("");
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
  // Bot prevention
  const [hp, setHp] = useState("");           // honeypot — bots fill this, humans never see it
  const [cfToken, setCfToken] = useState(""); // Cloudflare Turnstile token

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

  // Register Turnstile global callbacks once on mount
  useEffect(() => {
    if (!TURNSTILE_KEY) return;
    const g = globalThis as Record<string, unknown>;
    g["_s360TurnstileOk"] = (t: string) => setCfToken(t);
    g["_s360TurnstileExp"] = () => setCfToken("");
    return () => { delete g["_s360TurnstileOk"]; delete g["_s360TurnstileExp"]; };
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
          orgRequest: orgRequest.trim() || null,
          hp,
          cfToken: cfToken || null,
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
    <AuthGlassShell
      footer={
        <>
          Have an account?{" "}
          <Link href="/login" className={AUTH_LINK}>
            Sign in
          </Link>
        </>
      }
    >
      <div className="mb-8">
        <h1 className={`mb-1 ${AUTH_HEADING}`}>Request Foundational Release access</h1>
        <p className={AUTH_BODY}>
          Create your account. After email confirmation, the Slate360 team reviews each request before workspace access is granted.
        </p>
        {selectedPlan && (
          <p className={`mt-2 ${AUTH_MUTED}`}>
            Interest noted:{" "}
            <span className="font-semibold capitalize text-[var(--graphite-text-header)]">{selectedPlan}</span> · {selectedBilling}
          </p>
        )}
      </div>

      <div className="mb-6 space-y-3">
        <button type="button" onClick={() => handleOAuth("google")} disabled={!!oauthLoading || loading}
          className={AUTH_OAUTH}>
              {oauthLoading === "google" ? <Loader2 size={16} className="animate-spin" /> : (
                <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              )}
              Continue with Google
            </button>
        <button type="button" onClick={() => handleOAuth("azure")} disabled={!!oauthLoading || loading}
          className={AUTH_OAUTH}>
              {oauthLoading === "azure" ? <Loader2 size={16} className="animate-spin" /> : (
                <svg width="16" height="16" viewBox="0 0 23 23"><path fill="#f35325" d="M0 0h11v11H0z"/><path fill="#81bc06" d="M12 0h11v11H12z"/><path fill="#05a6f0" d="M0 12h11v11H0z"/><path fill="#ffba08" d="M12 12h11v11H12z"/></svg>
              )}
              Continue with Microsoft
            </button>
          </div>

      <div className={AUTH_DIVIDER}>
        <div className="absolute inset-0 flex items-center">
          <div className="auth-divider-line" />
        </div>
        <div className="relative flex justify-center">
          <span className={AUTH_DIVIDER_TEXT}>or sign up with email</span>
        </div>
      </div>

      {error ? <div className={`mb-4 ${AUTH_ERROR}`}>{error}</div> : null}

      <form onSubmit={handleSignup} className="space-y-4">
        <div>
          <label className={AUTH_LABEL}>Full name *</label>
          <input type="text" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Smith"
            className={AUTH_INPUT} />
        </div>
        <div>
          <label className={AUTH_LABEL}>Work email</label>
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@yourcompany.com"
            className={AUTH_INPUT} />
        </div>
        <div>
          <label className={AUTH_LABEL}>Password</label>
          <div className="relative">
            <input type={showPass ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters"
              minLength={8}
              className={`${AUTH_INPUT} pr-11`} />
            <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 auth-muted hover:text-[var(--graphite-text-header)]">
              {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

            {/* Optional demographic fields — helps tailor your experience */}
            <SignupDemographics
              company={company} setCompany={setCompany}
              jobTitle={jobTitle} setJobTitle={setJobTitle}
              industry={industry} setIndustry={setIndustry}
              companySize={companySize} setCompanySize={setCompanySize}
              referralSource={referralSource} setReferralSource={setReferralSource}
              orgRequest={orgRequest} setOrgRequest={setOrgRequest}
              referredBy={referredBy} setReferredBy={setReferredBy}
              referredByLocked={referredByLocked}
            />
            <div className="space-y-2.5 pt-1">
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" required checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-white/20 accent-[var(--graphite-primary)] cursor-pointer" />
                <span className={`${AUTH_MUTED} leading-relaxed`}>
                  I agree to the{" "}
                  <Link href="/terms" target="_blank" rel="noopener noreferrer" className={`underline ${AUTH_LINK}`}>Terms of Service</Link>{" "}
                  <span className="text-red-400 font-bold">*</span>
                </span>
              </label>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" required checked={agreePrivacy} onChange={(e) => setAgreePrivacy(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-white/20 accent-[var(--graphite-primary)] cursor-pointer" />
                <span className={`${AUTH_MUTED} leading-relaxed`}>
                  I agree to the{" "}
                  <Link href="/privacy" target="_blank" rel="noopener noreferrer" className={`underline ${AUTH_LINK}`}>Privacy Policy</Link>{" "}
                  and consent to receiving product updates{" "}
                  <span className="text-red-400 font-bold">*</span>
                </span>
              </label>
            </div>

            <button type="submit" disabled={loading || !!oauthLoading || !agreeTerms || !agreePrivacy || (!!TURNSTILE_KEY && !cfToken)}
              className={AUTH_SUBMIT}>
              {loading ? <Loader2 size={16} className="animate-spin" /> : <>Submit request <ArrowRight size={15} /></>}
            </button>

            {/* Honeypot — visually hidden, off-screen. Bots fill it; real users never see it. */}
            <input
              type="text"
              name="website"
              value={hp}
              onChange={(e) => setHp(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              style={{ position: "absolute", left: "-9999px", top: "-9999px", width: "1px", height: "1px", opacity: 0 }}
            />

            {/* Cloudflare Turnstile CAPTCHA widget — only renders when site key is set */}
            {TURNSTILE_KEY && (
              <div
                className="cf-turnstile"
                data-sitekey={TURNSTILE_KEY}
                data-callback="_s360TurnstileOk"
                data-expired-callback="_s360TurnstileExp"
                data-theme="dark"
              />
            )}
      </form>

      {TURNSTILE_KEY && (
        <Script
          src="https://challenges.cloudflare.com/turnstile/v0/api.js"
          strategy="lazyOnload"
        />
      )}
    </AuthGlassShell>
  );
}
