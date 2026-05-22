import Link from "next/link";
import { Shield } from "lucide-react";
import { SlateLogo } from "@/components/shared/SlateLogo";

export const metadata = {
  title: "Privacy Policy | Slate360",
  description: "Privacy Policy for the Slate360 construction documentation platform.",
};

const SECTIONS = [
  {
    heading: "1. Introduction",
    body: `Slate360, Inc. ("Slate360", "we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard information when you use the Slate360 platform ("Platform"). By using the Platform, you agree to the practices described here.`,
  },
  {
    heading: "2. Information We Collect",
    body: `Account Information: name, email address, company name, and password (hashed).\n\nProject Data: information you upload or enter including drawings, documents, schedules, daily logs, site-walk captures, and images.\n\nUsage Data: pages visited, features used, IP addresses, browser type, device identifiers, and timestamps.`,
  },
  {
    heading: "3. How We Use Your Information",
    body: `We use your information to: (a) provide, maintain, and improve the Platform; (b) process account requests and manage Foundational Release access; (c) send transactional emails (account creation, password reset, approval notifications); (d) provide customer support; (e) generate aggregated, anonymized analytics; (f) comply with legal obligations; (g) detect and prevent fraud and abuse.`,
  },
  {
    heading: "4. AI Processing",
    body: `Slate360 may use AI providers for features such as transcription and document assistance. Content you submit for AI processing may be transmitted to those providers under data processing agreements that prohibit using your data to train public models without authorization.`,
  },
  {
    heading: "5. Data Storage and Security",
    body: `Project files are stored with encryption at rest and in transit. Database access uses row-level security. Passwords are hashed and never stored in plain text.`,
  },
  {
    heading: "6. Data Retention",
    body: `We retain your project data for as long as your account is active or as needed to provide services. Foundational Release participants should refer to in-product notices about data retention during early access.`,
  },
  {
    heading: "7. Sharing of Information",
    body: `We do not sell your personal information. We may share information with service providers acting on our behalf (cloud hosting, email, authentication) under data processing agreements, and when required by law.`,
  },
  {
    heading: "8. Cookies and Tracking",
    body: `We use essential cookies for authentication and session management. We may use analytics to understand platform usage. We do not use third-party advertising cookies.`,
  },
  {
    heading: "9. Your Rights",
    body: `Depending on your location, you may have rights to access, correct, delete, or port your personal data. Contact privacy@slate360.ai. We will respond within 30 days where required.`,
  },
  {
    heading: "10. Children's Privacy",
    body: `The Platform is not intended for children under 18. We do not knowingly collect personal information from children.`,
  },
  {
    heading: "11. Changes to This Policy",
    body: `We may update this Privacy Policy periodically. Material changes will be communicated by email or in-product notice before they take effect.`,
  },
  {
    heading: "12. Contact Us",
    body: `Privacy questions or data requests: privacy@slate360.ai · Slate360, Inc., Privacy Officer, Wilmington, DE 19801.`,
  },
];

export default function PrivacyPage() {
  return (
    <div className="dark min-h-screen bg-[#0B0F15] text-slate-200">
      <header className="border-b border-white/10 px-6 py-4">
        <Link href="/">
          <SlateLogo />
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-12">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 ring-1 ring-amber-500/20">
            <Shield className="h-7 w-7 text-amber-400" />
          </div>
          <h1 className="text-3xl font-black text-white sm:text-4xl">Privacy Policy</h1>
          <p className="mt-3 text-sm text-amber-200/90">Effective Date: January 1, 2025 · Last Updated: May 2026</p>
          <p className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-slate-300">
            Foundational Release: paid subscriptions may not be active for all accounts during early access.
          </p>
        </div>

        <div className="divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md">
          {SECTIONS.map((s) => (
            <div key={s.heading} className="px-6 py-6 sm:px-8">
              <h2 className="mb-2 text-sm font-black text-white">{s.heading}</h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-slate-400">{s.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link href="/terms" className="text-sm font-semibold text-amber-300 hover:text-amber-200">
            Terms of Service
          </Link>
          <span className="text-slate-600">·</span>
          <Link href="/signup" className="text-sm font-semibold text-amber-300 hover:text-amber-200">
            Request access
          </Link>
          <span className="text-slate-600">·</span>
          <Link href="/" className="text-sm font-semibold text-slate-400 hover:text-slate-200">
            Back to home
          </Link>
        </div>
      </main>
    </div>
  );
}
