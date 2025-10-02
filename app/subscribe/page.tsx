  return (
    <main className="max-w-4xl mx-auto px-6 py-16 text-white">
      <h1 className="text-4xl font-bold mb-6">Subscribe to Slate360</h1>
      <p className="mb-8 text-slate-300">
        Choose a plan that fits your needs. Data usage may be subject to limits; additional charges may apply.
      </p>
      <a href="/pricing" className="text-brand-copper font-semibold hover:underline">
        View Detailed Pricing →
      </a>
    </main>
  );
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
