export default function Privacy() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-200 flex flex-col items-center px-4 py-12">
      <div className="max-w-2xl w-full">
        <h1 className="text-3xl md:text-4xl font-extrabold text-brand-ink mb-2 text-center">Privacy Policy</h1>
        <p className="text-sm text-slate-500 mb-6 text-center">Effective September 19, 2025</p>
        <p className="mb-4 text-slate-700">At Slate360, we respect your privacy and are committed to protecting your personal data. This policy explains how we collect, use, and share information.</p>
        <h3 className="text-xl font-bold text-brand-blue mt-6">1. Information We Collect</h3>
        <p className="mb-2">We collect personal info (e.g., email, name) when you register, upload models, or use features. Usage data (e.g., IP, browser) helps improve services.</p>
        <h3 className="text-xl font-bold text-brand-blue mt-6">2. How We Use Data</h3>
        <p className="mb-2">To provide SaaS features, analytics, and support. We don&apos;t sell data; share only with partners for AEC tools (e.g., geospatial integrations).</p>
        <h3 className="text-xl font-bold text-brand-blue mt-6">3. Security</h3>
        <p className="mb-2">We use encryption and access controls to protect data, compliant with GDPR/CCPA.</p>
        <h3 className="text-xl font-bold text-brand-blue mt-6">4. Your Rights</h3>
        <p className="mb-2">Access, delete, or opt-out via account settings. Contact <a href="mailto:privacy@slate360.com" className="underline">privacy@slate360.com</a>.</p>
        <p className="mt-8 text-xs text-slate-500">This policy may update; check back periodically.</p>
      </div>
    </main>
  );
}
