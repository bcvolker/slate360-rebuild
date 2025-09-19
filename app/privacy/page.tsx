import PageLayout from '@/components/ui/PageLayout';
import SectionHeader from '@/components/ui/SectionHeader';

export default function Privacy() {
  return (
    <PageLayout>
      <SectionHeader title="Privacy Policy" subtitle="Effective September 19, 2025" align="center" />
      <p className="mb-4">At Slate360, we respect your privacy and are committed to protecting your personal data. This policy explains how we collect, use, and share information.</p>
      <h3 className="text-xl font-bold text-brand-blue mt-6">1. Information We Collect</h3>
      <p>We collect personal info (e.g., email, name) when you register, upload models, or use features. Usage data (e.g., IP, browser) helps improve services.</p>
      <h3 className="text-xl font-bold text-brand-blue mt-6">2. How We Use Data</h3>
  <p>To provide SaaS features, analytics, and support. We don&apos;t sell data; share only with partners for AEC tools (e.g., geospatial integrations).</p>
      <h3 className="text-xl font-bold text-brand-blue mt-6">3. Security</h3>
      <p>We use encryption and access controls to protect data, compliant with GDPR/CCPA.</p>
      <h3 className="text-xl font-bold text-brand-blue mt-6">4. Your Rights</h3>
      <p>Access, delete, or opt-out via account settings. Contact privacy@slate360.com.</p>
      <p className="mt-8 text-sm">This policy may update; check back periodically.</p>
    </PageLayout>
  );
}
