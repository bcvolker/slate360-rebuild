export default function Terms() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-200 flex flex-col items-center px-4 py-12">
      <div className="max-w-2xl w-full">
        <h1 className="text-3xl md:text-4xl font-extrabold text-brand-ink mb-2 text-center">Terms of Service</h1>
        <p className="text-sm text-slate-500 mb-6 text-center">Effective September 19, 2025</p>
        <p className="mb-4 text-slate-700">By using Slate360, you agree to these terms. We provide SaaS for AEC; you must comply with laws.</p>
        <h3 className="text-xl font-bold text-brand-blue mt-6">1. Account and Use</h3>
        <p className="mb-2">You must be 18+; no unauthorized access. Subscriptions via PremiumPlus; no refunds after trial.</p>
        <h3 className="text-xl font-bold text-brand-blue mt-6">2. Intellectual Property</h3>
        <p className="mb-2">We own the platform; your uploads grant us license for processing (e.g., 3D rendering).</p>
        <h3 className="text-xl font-bold text-brand-blue mt-6">3. Limitations</h3>
        <p className="mb-2">No liability for data loss; service as-is. Disputes in [Jurisdiction].</p>
        <h3 className="text-xl font-bold text-brand-blue mt-6">4. Termination</h3>
        <p className="mb-2">We can suspend for violations; contact <a href="mailto:terms@slate360.com" className="underline">terms@slate360.com</a> for questions.</p>
      </div>
    </main>
  );
}
