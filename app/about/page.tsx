import PageLayout from '@/components/ui/PageLayout';
import SectionHeader from '@/components/ui/SectionHeader';

export default function About() {
  return (
    <PageLayout>
      <SectionHeader title="About Slate360" subtitle="Empowering AEC Professionals" align="center" />
      <p className="text-lg mb-6">Slate360 is an all-in-one platform revolutionizing AEC workflows. Founded in 2025, we integrate 3D modeling, geospatial tools, and advanced analytics to bring designs to reality faster and more efficiently.</p>
      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <h3 className="text-2xl font-bold text-brand-blue">Our Mission</h3>
          <p>To streamline collaboration and innovation in architecture, engineering, and construction through cutting-edge SaaS solutions.</p>
        </div>
        <div>
          <h3 className="text-2xl font-bold text-brand-blue">Our Team</h3>
          <p>A dedicated team focused on delivering top-tier tools for AEC pros.</p>
        </div>
      </div>
    </PageLayout>
  );
}
