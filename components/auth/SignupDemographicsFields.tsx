"use client";

interface Props {
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
  phone: string;
  setPhone: (v: string) => void;
}

const INDUSTRIES = [
  "General Contractor",
  "Architecture",
  "Engineering",
  "Owner / Developer",
  "Subcontractor",
  "Real Estate",
  "Education",
  "Government / Public Works",
  "Other",
];

const COMPANY_SIZES = ["Just me", "2–10", "11–50", "51–200", "201–1000", "1000+"];

const REFERRAL_SOURCES = [
  "Search engine",
  "Colleague / referral",
  "Conference or event",
  "Social media",
  "Industry publication",
  "Other",
];

export default function SignupDemographicsFields({
  company,
  setCompany,
  jobTitle,
  setJobTitle,
  industry,
  setIndustry,
  companySize,
  setCompanySize,
  referralSource,
  setReferralSource,
  phone,
  setPhone,
}: Props) {
  return (
    <div className="space-y-3 rounded-xl border border-input bg-card/40 px-4 py-3">
      <div className="text-xs font-semibold text-muted-foreground">About your work</div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="auth-label">Company / Organization *</label>
          <input
            type="text"
            required
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Acme Construction"
            className="auth-input"
          />
        </div>
        <div>
          <label className="auth-label">Job title *</label>
          <input
            type="text"
            required
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
            placeholder="Project Manager"
            className="auth-input"
          />
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="auth-label">Industry *</label>
          <select
            required
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            className="auth-input"
          >
            <option value="">Select…</option>
            {INDUSTRIES.map((i) => (
              <option key={i}>{i}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="auth-label">Company size *</label>
          <select
            required
            value={companySize}
            onChange={(e) => setCompanySize(e.target.value)}
            className="auth-input"
          >
            <option value="">Select…</option>
            {COMPANY_SIZES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="auth-label">Phone (optional)</label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+1 555 123 4567"
            className="auth-input"
          />
        </div>
        <div>
          <label className="auth-label">How did you hear about us? *</label>
          <select
            required
            value={referralSource}
            onChange={(e) => setReferralSource(e.target.value)}
            className="auth-input"
          >
            <option value="">Select…</option>
            {REFERRAL_SOURCES.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
