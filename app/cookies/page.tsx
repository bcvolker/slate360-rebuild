export default function Cookies() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-200 flex flex-col items-center px-4 py-12">
      <div className="max-w-2xl w-full">
        <h1 className="text-3xl md:text-4xl font-extrabold text-brand-ink mb-2 text-center">Cookie Policy</h1>
        <p className="text-sm text-slate-500 mb-6 text-center">Effective September 19, 2025</p>
        <p className="mb-4 text-slate-700">We use cookies to enhance your experience on Slate360.</p>
        <h3 className="text-xl font-bold text-brand-blue mt-6">1. Types of Cookies</h3>
        <p className="mb-2">Essential (session), analytics (Google Analytics), functional (preferences).</p>
        <h3 className="text-xl font-bold text-brand-blue mt-6">2. Management</h3>
        <p className="mb-2">Opt-out via browser settings or our consent banner. Third-party cookies for AEC integrations.</p>
        <p className="mt-8 text-xs text-slate-500">Contact <a href="mailto:cookies@slate360.com" className="underline">cookies@slate360.com</a> for more.</p>
      </div>
    </main>
  );
}
