"use client";

interface SignupDemographicsProps {
  company: string;
  setCompany: (v: string) => void;
  jobTitle: string;
  setJobTitle: (v: string) => void;
  industry: string;
  setIndustry: (v: string) => void;
  companySize: string;
  setCompanySize: (v: string) => void;
  referralSource: string;
  setReferralSource: (v: string) => void;
  orgRequest: string;
  setOrgRequest: (v: string) => void;
  referredBy: string;
  setReferredBy: (v: string) => void;
  referredByLocked: boolean;
}

export function SignupDemographics({
  company, setCompany,
  jobTitle, setJobTitle,
  industry, setIndustry,
  companySize, setCompanySize,
  referralSource, setReferralSource,
  orgRequest, setOrgRequest,
  referredBy, setReferredBy,
  referredByLocked,
}: SignupDemographicsProps) {
  return (
    <details className="group rounded-xl border border-[color-mix(in_srgb,white_10%,transparent)] bg-[color-mix(in_srgb,var(--graphite-canvas)_40%,transparent)] px-4 py-3">
      <summary className="flex cursor-pointer items-center justify-between text-xs font-semibold auth-muted hover:text-[var(--graphite-text-header)]">
        <span>Tell us about your work <span className="font-normal">(optional)</span></span>
        <span className="auth-muted transition-transform group-open:rotate-180">▾</span>
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
            What will you use Slate360 for? <span className="font-normal">(optional)</span>
          </label>
          <textarea value={orgRequest} onChange={(e) => setOrgRequest(e.target.value)} placeholder="E.g. capital project documentation for a university campus" rows={3} className="auth-input resize-none" />
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
          <p className="auth-muted mt-1 text-[11px]">
            Both you and your referrer earn rewards once your subscription clears.
          </p>
        </div>
      </div>
    </details>
  );
}
