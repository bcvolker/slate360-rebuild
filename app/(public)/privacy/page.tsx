import Link from "next/link";
import { HomeBrandMark } from "@/components/marketing/HomeBrandMark";

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
    body: `We use your information to: (a) respond to site-visit requests and provide the portal for projects we're engaged on; (b) send transactional emails (portal access, project updates); (c) provide customer support; (d) generate aggregated, anonymized analytics; (e) comply with legal obligations; (f) detect and prevent fraud and abuse.`,
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
    body: `We retain your project data for as long as needed to provide services and as agreed for your project's access term.`,
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
    <div className="min-h-screen bg-[var(--mkt-canvas)] text-[var(--mkt-ink-muted)]">
      <header className="border-b border-[var(--mkt-line)] bg-[var(--mkt-canvas)] px-6 pb-4 pt-[max(env(safe-area-inset-top,0px),1rem)]">
        <Link href="/" aria-label="Slate360 home">
          <HomeBrandMark iconClassName="h-8" wordClassName="text-[16px]" />
        </Link>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="mb-8">
          <h1 className="font-serif text-3xl font-normal text-[var(--mkt-ink)] sm:text-4xl">Privacy Policy</h1>
          <p className="mt-2 text-sm text-[var(--mkt-ink-muted)]">Effective Date: January 1, 2025 · Last Updated: September 2026</p>
        </div>

        <div className="divide-y divide-[var(--mkt-line)] rounded-2xl border border-[var(--mkt-line)] bg-[var(--mkt-surface)]">
          {SECTIONS.map((s) => (
            <div key={s.heading} className="px-6 py-5 sm:px-8">
              <h2 className="mb-2 text-sm font-semibold text-[var(--mkt-ink)]">{s.heading}</h2>
              <p className="whitespace-pre-line text-sm leading-relaxed text-[var(--mkt-ink-muted)]">{s.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          <Link href="/terms" className="text-sm font-semibold text-[var(--mkt-accent)]">
            Terms of Service
          </Link>
          <span className="text-[var(--mkt-line)]">·</span>
          <Link href="/#request-a-visit" className="text-sm font-semibold text-[var(--mkt-accent)]">
            Request a site visit
          </Link>
          <span className="text-[var(--mkt-line)]">·</span>
          <Link href="/" className="text-sm font-semibold text-[var(--mkt-ink-muted)]">
            Back to home
          </Link>
        </div>
      </main>
    </div>
  );
}
