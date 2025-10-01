export default function SubscribePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-200 flex flex-col items-center justify-center px-4 py-12">
      <h1 className="text-4xl md:text-5xl font-extrabold text-brand-ink mb-4 text-center">Subscribe to Slate360</h1>
      <p className="text-lg text-slate-700 mb-8 text-center max-w-xl">Unlock all features, advanced analytics, and priority support. Choose the plan that fits your needs.</p>
      <div className="flex flex-col md:flex-row gap-8 w-full max-w-3xl justify-center mb-10">
        {/* Pricing Card: Starter */}
        <div className="flex-1 bg-white rounded-xl shadow-lg border border-slate-200 p-6 flex flex-col items-center">
          <h2 className="text-2xl font-bold text-brand-blue mb-2">Starter</h2>
          <div className="text-3xl font-extrabold text-brand-copper mb-2">$19<span className="text-base font-normal">/mo</span></div>
          <ul className="text-sm text-slate-600 mb-4 list-disc pl-4 text-left w-full">
            <li>Up to 3 projects</li>
            <li>Basic analytics</li>
            <li>Email support</li>
          </ul>
          <button className="bg-brand-blue text-white px-6 py-2 rounded font-semibold hover:bg-brand-copper transition">Choose Starter</button>
        </div>
        {/* Pricing Card: Pro */}
        <div className="flex-1 bg-white rounded-xl shadow-lg border-2 border-brand-copper p-6 flex flex-col items-center scale-105">
          <h2 className="text-2xl font-bold text-brand-copper mb-2">Pro</h2>
          <div className="text-3xl font-extrabold text-brand-blue mb-2">$49<span className="text-base font-normal">/mo</span></div>
          <ul className="text-sm text-slate-600 mb-4 list-disc pl-4 text-left w-full">
            <li>Unlimited projects</li>
            <li>Advanced analytics</li>
            <li>Priority support</li>
            <li>Custom branding</li>
          </ul>
          <button className="bg-brand-copper text-white px-6 py-2 rounded font-semibold hover:bg-brand-blue transition">Choose Pro</button>
        </div>
      </div>
      <div className="text-xs text-slate-500 text-center mt-6">
        By subscribing, you agree to our
        <a href="/terms" className="underline mx-1">Terms</a>,
        <a href="/privacy" className="underline mx-1">Privacy Policy</a>, and
        <a href="/cookies" className="underline mx-1">Cookie Policy</a>.
      </div>
    </main>
  );
}
