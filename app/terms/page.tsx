import PageLayout from '@/components/ui/PageLayout';
import SectionHeader from '@/components/ui/SectionHeader';

export default function Terms() {
  return (
    <PageLayout>
      <SectionHeader title="Terms of Service" subtitle="Effective September 19, 2025" align="center" />
      <p className="mb-4">By using Slate360, you agree to these terms. We provide SaaS for AEC; you must comply with laws.</p>
      <h3 className="text-xl font-bold text-brand-blue mt-6">1. Account and Use</h3>
      <p>You must be 18+; no unauthorized access. Subscriptions via PremiumPlus; no refunds after trial.</p>
      <h3 className="text-xl font-bold text-brand-blue mt-6">2. Intellectual Property</h3>
      <p>We own the platform; your uploads grant us license for processing (e.g., 3D rendering).</p>
      <h3 className="text-xl font-bold text-brand-blue mt-6">3. Limitations</h3>
      <p>No liability for data loss; service as-is. Disputes in [Jurisdiction].</p>
      <h3 className="text-xl font-bold text-brand-blue mt-6">4. Termination</h3>
      <p>We can suspend for violations; contact terms@slate360.com for questions.</p>
    </PageLayout>
  );
}
