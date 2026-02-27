import Link from "next/link";
import { Shield } from "lucide-react";

export const metadata = { title: "Privacy Policy | Slate360", description: "Privacy Policy for the Slate360 construction management platform." };

const SECTIONS = [
  {
    heading: "1. Introduction",
    body: `Slate360, Inc. ("Slate360", "we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard information when you use the Slate360 platform ("Platform"). Please read this policy carefully. By using the Platform, you agree to the practices described here.`,
  },
  {
    heading: "2. Information We Collect",
    body: `Account Information: name, email address, company name, professional license number, billing address, and password (hashed). \n\nProject Data: any information you upload or enter including drawings, documents, schedules, budgets, RFIs, submittals, daily logs, and images. \n\nUsage Data: pages visited, features used, IP addresses, browser type, device identifiers, and timestamps. \n\nPayment Information: processed by Stripe; we store only the last 4 digits of your card and billing address — we do not store full card numbers.`,
  },
  {
    heading: "3. How We Use Your Information",
    body: `We use your information to: (a) provide, maintain, and improve the Platform; (b) process payments and manage subscriptions; (c) send transactional emails (account creation, password reset, billing receipts); (d) provide customer support; (e) generate aggregated, anonymized analytics to improve our service; (f) comply with legal obligations; (g) detect and prevent fraud and abuse.`,
  },
  {
    heading: "4. AI Processing",
    body: `Slate360 uses OpenAI and similar AI providers to power features such as contract summarization and requirement extraction. Documents you submit for AI analysis may be transmitted to these providers. AI providers are bound by data processing agreements prohibiting them from using your data to train their models. AI outputs are stored in your project for your user experience only.`,
  },
  {
    heading: "5. Data Storage and Security",
    body: `Your project files are stored in AWS S3 (us-east-2 region) with server-side AES-256 encryption at rest and TLS 1.2+ encryption in transit. Project data is stored in Supabase PostgreSQL with row-level security enforcing per-user access controls. Passwords are hashed using bcrypt and never stored in plain text. We maintain SOC 2-aligned security practices including access logging, MFA for production systems, and regular security reviews.`,
  },
  {
    heading: "6. Data Retention",
    body: `We retain your project data for as long as your account is active or as needed to provide services. After account cancellation, you have 30 days to export your data. After the export window closes, we will delete your project data from active storage within 90 days. Anonymized, aggregated analytics may be retained indefinitely.`,
  },
  {
    heading: "7. Sharing of Information",
    body: `We do not sell your personal information. We may share information with: (a) Service providers acting on our behalf (AWS, Supabase, Stripe, Resend, OpenAI) under data processing agreements; (b) Law enforcement or government authorities when required by law; (c) Successors in interest if Slate360 undergoes a merger or acquisition, with advance notice to affected users. We will never share your project-specific data with your competitors.`,
  },
  {
    heading: "8. Cookies and Tracking",
    body: `We use essential cookies necessary for authentication and session management. We use analytics cookies to understand platform usage. You may disable non-essential cookies through your browser settings. We do not use third-party advertising cookies or tracking pixels from ad networks.`,
  },
  {
    heading: "9. Your Rights",
    body: `Depending on your location, you may have rights including: access to your personal data, correction of inaccurate data, deletion ("right to be forgotten"), portability of your data in machine-readable format, and objection to certain types of processing. To exercise these rights, contact us at privacy@slate360.ai. We will respond within 30 days.`,
  },
  {
    heading: "10. CCPA (California Residents)",
    body: `California residents have the right to know what personal information is collected and used, the right to delete personal information, and the right to opt-out of the sale of personal information (Slate360 does not sell personal information). We do not discriminate against users who exercise their CCPA rights.`,
  },
  {
    heading: "11. GDPR (EU/EEA Residents)",
    body: `If you are located in the EU or EEA, our legal basis for processing personal data is: performance of a contract (account management), legitimate interests (platform improvement, security), and consent (marketing communications). You have the right to lodge a complaint with your local supervisory authority. Our EU representative contact: privacy@slate360.ai.`,
  },
  {
    heading: "12. Children's Privacy",
    body: `The Platform is not intended for children under 18. We do not knowingly collect personal information from children. If we discover that a child has provided us with personal information, we will promptly delete it.`,
  },
  {
    heading: "13. Changes to This Policy",
    body: `We may update this Privacy Policy periodically. We will notify you of material changes via email or in-app notification at least 14 days before they take effect. Continued use of the Platform after the effective date constitutes acceptance of the updated policy.`,
  },
  {
    heading: "14. Contact Us",
    body: `For privacy questions, data requests, or to report a concern: Email privacy@slate360.ai · Write to: Slate360, Inc., Privacy Officer, Wilmington, DE 19801.`,
  },
];

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-[#1E3A8A] py-16 text-center">
        <div className="mx-auto max-w-3xl px-4">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
            <Shield size={24} className="text-white" />
          </div>
          <h1 className="text-3xl font-black text-white sm:text-4xl">Privacy Policy</h1>
          <p className="mt-3 text-sm text-blue-200">Effective Date: January 1, 2025 · Last Updated: June 1, 2025</p>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm divide-y divide-gray-100">
          {SECTIONS.map((s) => (
            <div key={s.heading} className="px-8 py-6">
              <h2 className="text-sm font-black text-gray-900 mb-2">{s.heading}</h2>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{s.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link href="/terms" className="text-sm font-semibold text-[#1E3A8A] hover:underline">Terms of Service</Link>
          <span className="text-gray-300">·</span>
          <Link href="/signup" className="text-sm font-semibold text-[#FF4D00] hover:underline">Create Account</Link>
          <span className="text-gray-300">·</span>
          <Link href="/" className="text-sm font-semibold text-gray-600 hover:underline">Back to Home</Link>
        </div>
      </div>
    </main>
  );
}
