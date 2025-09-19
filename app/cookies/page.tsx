import PageLayout from '@/components/ui/PageLayout';
import SectionHeader from '@/components/ui/SectionHeader';

export default function Cookies() {
  return (
    <PageLayout>
      <SectionHeader title="Cookie Policy" subtitle="Effective September 19, 2025" align="center" />
      <p className="mb-4">We use cookies to enhance your experience on Slate360.</p>
      <h3 className="text-xl font-bold text-brand-blue mt-6">1. Types of Cookies</h3>
      <p>Essential (session), analytics (Google Analytics), functional (preferences).</p>
      <h3 className="text-xl font-bold text-brand-blue mt-6">2. Management</h3>
      <p>Opt-out via browser settings or our consent banner. Third-party cookies for AEC integrations.</p>
      <p className="mt-8 text-sm">Contact cookies@slate360.com for more.</p>
    </PageLayout>
  );
}
