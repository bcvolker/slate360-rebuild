export default function SubscribePage() {
  return (
    <main className="max-w-6xl mx-auto px-6 py-16 text-white">
      <h1 className="text-4xl font-bold mb-6 text-center">Subscribe to Slate360</h1>
      <p className="text-center text-slate-400 mb-12">
        Choose a plan that fits your needs.
      </p>
      <div className="grid md:grid-cols-4 gap-6">
        {/* Single */}
        <div className="bg-slate-800 rounded-lg p-6 shadow-lg">
          <h2 className="text-2xl font-bold mb-2">Single</h2>
          <p className="text-4xl font-extrabold mb-4 text-brand-copper">$49<span className="text-lg text-slate-200">/mo</span></p>
          <ul className="text-slate-300 space-y-2">
            <li>✔ Project Hub</li>
            <li>✔ Basic reports</li>
          </ul>
        </div>
        {/* Double */}
        <div className="bg-slate-800 rounded-lg p-6 shadow-lg">
          <h2 className="text-2xl font-bold mb-2">Double</h2>
          <p className="text-4xl font-extrabold mb-4 text-brand-copper">$99<span className="text-lg text-slate-200">/mo</span></p>
          <ul className="text-slate-300 space-y-2">
            <li>✔ Everything in Single</li>
            <li>✔ 2 users included</li>
          </ul>
        </div>
        {/* Business */}
        <div className="bg-slate-800 rounded-lg p-6 shadow-lg border-2 border-brand-copper">
          <h2 className="text-2xl font-bold mb-2">Business</h2>
          <p className="text-4xl font-extrabold mb-4 text-brand-copper">$499<span className="text-lg text-slate-200">/mo</span></p>
          <ul className="text-slate-300 space-y-2">
            <li>✔ Project Hub</li>
            <li>✔ BIM Studio</li>
            <li>✔ Reports & Analytics</li>
          </ul>
        </div>
        {/* Enterprise */}
        <div className="bg-slate-800 rounded-lg p-6 shadow-lg">
          <h2 className="text-2xl font-bold mb-2">Enterprise</h2>
          <p className="text-4xl font-extrabold mb-4 text-brand-copper">Custom</p>
        </div>
      </div>
    </main>
  );
}
