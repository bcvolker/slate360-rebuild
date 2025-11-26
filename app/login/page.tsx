export default function LoginPage(){
  return (
    <main className="snap-start min-h-screen bg-[#002082] bg-[linear-gradient(to_right,rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.08)_1px,transparent_1px)] bg-[size:160px_160px] text-slate-900 flex items-center justify-center pt-24 pb-16 px-4">
      <div className="w-full max-w-md mx-auto bg-white/80 backdrop-blur-md border border-slate-200 rounded-3xl shadow-sm p-8">
        <h1 className="text-2xl sm:text-3xl font-orbitron font-semibold text-slate-900 mb-4 text-center">
          Welcome Back
        </h1>
        <p className="text-sm sm:text-base text-slate-700 mb-6 text-center">
          Secure login for Slate360 is powering up. Early access users: Check your email for a magic link.
        </p>
        <a
          href="mailto:support@slate360.ai"
          className="mb-4 block w-full rounded-full border border-[#4F89D4]/40 bg-[#4F89D4]/10 px-6 py-3 text-sm font-orbitron font-semibold uppercase tracking-[0.3em] text-[#4F89D4] text-center shadow-[0_0_18px_rgba(79,137,212,0.25)] transition hover:border-[#B37031] hover:bg-[#B37031]/10 hover:text-[#B37031]"
        >
          Get Access Link
        </a>
        <p className="text-xs sm:text-sm text-slate-600 text-center">
          New?{" "}
          <a href="/subscribe" className="text-[#4F89D4] hover:text-[#B37031] hover:underline font-semibold">
            Start free trial
          </a>
          .
        </p>
      </div>
    </main>
  );
}