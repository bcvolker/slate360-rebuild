import PageLayout from '@/components/ui/PageLayout';
import SectionHeader from '@/components/ui/SectionHeader';

export default function Contact() {
  return (
    <PageLayout>
      <SectionHeader title="Contact Us" subtitle="Get in Touch" align="center" />
      <p className="text-center mb-8">Reach out for support or inquiries.</p>
      <div className="mt-8 text-center">
        <p>Email: support@slate360.com</p>
      </div>
    </PageLayout>
  );
}
