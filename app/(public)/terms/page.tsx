import Link from "next/link";
import { Scale } from "lucide-react";
import { SlateLogo } from "@/components/shared/SlateLogo";

export const metadata = {
  title: "Terms of Service | Slate360",
  description: "Terms of Service for the Slate360 construction documentation platform.",
};

const SECTIONS = [
  {
    heading: "1. Acceptance of Terms",
    body: `By accessing or using Slate360 ("the Platform"), you agree to these Terms of Service ("Terms"). If you enter on behalf of a company, you represent that you have authority to bind that entity.`,
  },
  {
    heading: "2. Description of Service",
    body: `Slate360 provides cloud-based construction documentation software, including Site Walk field capture, deliverable generation, file sharing, and project coordination tools. Features available to you depend on your access tier and release phase.`,
  },
  {
    heading: "3. Foundational Release Access",
    body: `During the Foundational Release, workspace access may require manual approval after account creation. Slate360 may enable or restrict features, apps, and billing at its discretion while onboarding founding teams.`,
  },
  {
    heading: "4. Eligibility",
    body: `You must be at least 18 years of age. The Platform is intended for construction industry professionals.`,
  },
  {
    heading: "5. User Accounts",
    body: `You are responsible for your credentials and activity under your account. Notify support@slate360.ai of unauthorized use. We may suspend accounts that violate these Terms.`,
  },
  {
    heading: "6. Payment (When Enabled)",
    body: `When paid plans are offered, fees, billing cycles, and cancellation terms will be presented in-product. Until billing is enabled for your account, no subscription charges apply.`,
  },
  {
    heading: "7. Data and Privacy",
    body: `Your project data remains your property. You grant Slate360 a limited license to store and process content solely to provide the service. See our Privacy Policy for details.`,
  },
  {
    heading: "8. Acceptable Use",
    body: `You agree not to upload unlawful content, interfere with security, reverse-engineer the Platform, scrape data without permission, or misuse the service in violation of applicable law.`,
  },
  {
    heading: "9. AI Features",
    body: `AI-assisted outputs are informational only and do not constitute legal, financial, or professional advice. You are responsible for reviewing AI-generated content before relying on it.`,
  },
  {
    heading: "10. Intellectual Property",
    body: `Slate360 software, interfaces, and trademarks are owned by Slate360, Inc. You retain ownership of content you upload.`,
  },
  {
    heading: "11. Limitation of Liability",
    body: `To the maximum extent permitted by law, Slate360 is not liable for indirect or consequential damages. Total liability for any claim is limited to amounts paid in the twelve months preceding the claim, or zero during free or approval-gated access.`,
  },
  {
    heading: "12. Disclaimer of Warranties",
    body: `The Platform is provided "AS IS" without warranties of uninterrupted or error-free operation.`,
  },
  {
    heading: "13. Termination",
    body: `Slate360 may suspend or terminate access for cause. You may stop using the Platform at any time. Export provisions apply as described in-product when cancellation is available.`,
  },
  {
    heading: "14. Governing Law",
    body: `These Terms are governed by the laws of the State of Delaware, subject to applicable dispute resolution provisions.`,
  },
  {
    heading: "15. Changes to Terms",
    body: `We may update these Terms with notice before material changes take effect. Continued use after the effective date constitutes acceptance.`,
  },
  {
    heading: "16. Contact",
    body: `Questions: legal@slate360.ai · Slate360, Inc., Legal Department, Wilmington, DE 19801.`,
  },
];

export default function TermsPage() {
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
            <Scale className="h-7 w-7 text-amber-400" />
          </div>
          <h1 className="text-3xl font-black text-white sm:text-4xl">Terms of Service</h1>
          <p className="mt-3 text-sm text-amber-200/90">Effective Date: January 1, 2025 · Last Updated: May 2026</p>
          <p className="mt-4 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm text-slate-300">
            Foundational Release: self-serve billing may not be available until enabled for your account.
          </p>
        </div>

        <div className="divide-y divide-white/10 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md">
          {SECTIONS.map((s) => (
            <div key={s.heading} className="px-6 py-6 sm:px-8">
              <h2 className="mb-2 text-sm font-black text-white">{s.heading}</h2>
              <p className="text-sm leading-relaxed text-slate-400">{s.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link href="/privacy" className="text-sm font-semibold text-amber-300 hover:text-amber-200">
            Privacy Policy
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
