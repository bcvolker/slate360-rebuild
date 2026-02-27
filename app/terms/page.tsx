import Link from "next/link";
import { Scale } from "lucide-react";

export const metadata = { title: "Terms of Service | Slate360", description: "Terms of Service for the Slate360 construction management platform." };

const SECTIONS = [
  {
    heading: "1. Acceptance of Terms",
    body: `By accessing or using Slate360 ("the Platform"), you agree to be bound by these Terms of Service ("Terms"). If you are entering into these Terms on behalf of a company or organization, you represent that you have authority to bind that entity. If you do not agree with these Terms, do not use the Platform.`,
  },
  {
    heading: "2. Description of Service",
    body: `Slate360 provides cloud-based construction project management software including but not limited to: project scheduling, RFI management, submittal tracking, budget management, stakeholder management, document storage, AI-assisted document summarization, and reporting tools. Features may vary by subscription tier.`,
  },
  {
    heading: "3. Eligibility",
    body: `You must be at least 18 years of age to use the Platform. The Platform is intended for use by construction industry professionals. You may not use the Platform if you are prohibited from receiving services under applicable law.`,
  },
  {
    heading: "4. User Accounts",
    body: `You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately at support@slate360.ai of any unauthorized use. We reserve the right to terminate accounts that violate these Terms.`,
  },
  {
    heading: "5. Subscription and Payment",
    body: `Paid plans are billed in advance on a monthly or annual basis and are non-refundable except as required by law. You authorize us to charge your designated payment method for all fees. Slate360 may change subscription pricing with 30 days notice. Failure to pay may result in service suspension.`,
  },
  {
    heading: "6. Data and Privacy",
    body: `Your project data remains your property. By uploading content to the Platform you grant Slate360 a limited license to store and process that content solely to provide the service. We do not sell your data to third parties. For full details, see our Privacy Policy.`,
  },
  {
    heading: "7. Acceptable Use",
    body: `You agree not to: (a) upload unlawful, harmful, or infringing content; (b) interfere with platform security or availability; (c) attempt to reverse-engineer any component of the Platform; (d) use automated scraping tools; (e) misrepresent your identity or project information; (f) use the Platform for any purpose that violates applicable law.`,
  },
  {
    heading: "8. AI Features",
    body: `Slate360 uses artificial intelligence to assist with document summarization, requirement extraction, and data analysis. AI outputs are provided for informational purposes only and do not constitute legal, financial, or professional advice. You are responsible for reviewing and validating any AI-generated content before relying on it.`,
  },
  {
    heading: "9. Intellectual Property",
    body: `All software, interfaces, designs, and trademarks on the Platform are the property of Slate360, Inc. You retain ownership of content you upload. You may not reproduce, modify, or distribute Slate360 software or materials without express written permission.`,
  },
  {
    heading: "10. Third-Party Services",
    body: `The Platform integrates with third-party services including AWS S3, Supabase, Google Maps, and Stripe. Your use of those services is governed by their own terms. Slate360 is not responsible for third-party service outages or changes.`,
  },
  {
    heading: "11. Limitation of Liability",
    body: `To the maximum extent permitted by law, Slate360 shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly. Our total liability for any claim arising out of or related to these Terms shall not exceed the amount you paid us in the 12 months preceding the claim.`,
  },
  {
    heading: "12. Disclaimer of Warranties",
    body: `The Platform is provided "AS IS" without warranties of any kind, express or implied, including but not limited to implied warranties of merchantability or fitness for a particular purpose. Slate360 does not warrant that the Platform will be uninterrupted, error-free, or free of viruses.`,
  },
  {
    heading: "13. Indemnification",
    body: `You agree to indemnify and hold harmless Slate360, its officers, directors, employees, and agents from and against any claims, liabilities, damages, and expenses (including reasonable attorneys' fees) arising from your violation of these Terms or misuse of the Platform.`,
  },
  {
    heading: "14. Termination",
    body: `Slate360 may suspend or terminate your access to the Platform at any time for cause, including violation of these Terms. You may cancel your account at any time through account settings. Upon termination, your right to use the Platform ceases immediately; project data may be exported within 30 days of cancellation.`,
  },
  {
    heading: "15. Governing Law",
    body: `These Terms shall be governed by and construed in accordance with the laws of the State of Delaware, without regard to its conflict of law provisions. Any dispute shall be resolved by binding arbitration under the rules of the American Arbitration Association, except that either party may seek injunctive relief in a court of competent jurisdiction.`,
  },
  {
    heading: "16. Changes to Terms",
    body: `We reserve the right to update these Terms at any time. We will provide 14 days notice by email or in-app notification before material changes take effect. Continued use of the Platform after changes constitutes acceptance of the new Terms.`,
  },
  {
    heading: "17. Contact",
    body: `Questions about these Terms? Contact us at legal@slate360.ai or write to: Slate360, Inc., Legal Department, Wilmington, DE 19801.`,
  },
];

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="bg-[#1E3A8A] py-16 text-center">
        <div className="mx-auto max-w-3xl px-4">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10">
            <Scale size={24} className="text-white" />
          </div>
          <h1 className="text-3xl font-black text-white sm:text-4xl">Terms of Service</h1>
          <p className="mt-3 text-sm text-blue-200">Effective Date: January 1, 2025 · Last Updated: June 1, 2025</p>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-3xl px-4 py-12">
        <div className="rounded-2xl border border-gray-100 bg-white shadow-sm divide-y divide-gray-100">
          {SECTIONS.map((s) => (
            <div key={s.heading} className="px-8 py-6">
              <h2 className="text-sm font-black text-gray-900 mb-2">{s.heading}</h2>
              <p className="text-sm text-gray-600 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link href="/privacy" className="text-sm font-semibold text-[#1E3A8A] hover:underline">Privacy Policy</Link>
          <span className="text-gray-300">·</span>
          <Link href="/signup" className="text-sm font-semibold text-[#FF4D00] hover:underline">Create Account</Link>
          <span className="text-gray-300">·</span>
          <Link href="/" className="text-sm font-semibold text-gray-600 hover:underline">Back to Home</Link>
        </div>
      </div>
    </main>
  );
}
