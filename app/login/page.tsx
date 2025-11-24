export default function LoginPage(){
  return (
    <main className="min-h-screen bg-transparent text-slate-900 flex items-center justify-center pt-24 pb-16 px-4">
      <div className="w-full max-w-md mx-auto bg-white/85 backdrop-blur-sm border border-brand-blue/10 rounded-3xl shadow-[0_18px_45px_rgba(15,23,42,0.12)] p-8">
        <h1 className="text-2xl sm:text-3xl font-orbitron font-semibold text-slate-900 mb-4 text-center">
          Welcome Back
        </h1>
        <p className="text-sm sm:text-base text-slate-700 mb-6 text-center">
          Secure login for Slate360 is powering up. Early access users: Check your email for a magic link.
        </p>
        <a
          href="mailto:support@slate360.ai"
          className="mb-4 block w-full rounded-full border border-brand-blue/40 bg-brand-blue/10 px-6 py-3 text-sm font-orbitron font-semibold uppercase tracking-[0.3em] text-brand-blue text-center shadow-[0_0_18px_rgba(79,137,212,0.25)] transition hover:border-brand-blue hover:bg-brand-blue/20"
        >
          Get Access Link
        </a>
        <p className="text-xs sm:text-sm text-slate-600 text-center">
          New?{" "}
          <a href="/subscribe" className="text-brand-blue hover:underline font-semibold">
            Start free trial
          </a>
          .
        </p>
      </div>
    </main>
  );
}