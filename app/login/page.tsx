import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="bg-black min-h-screen text-white flex flex-col items-center justify-center px-6 py-16">
      {/* Ambient glow */}
      <div
        className="pointer-events-none fixed inset-0 flex items-center justify-center"
        aria-hidden
      >
        <div
          className="w-[500px] h-[500px] rounded-full blur-[180px] opacity-10"
          style={{ backgroundColor: "#FF4D00" }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <Link
            href="/"
            className="text-3xl font-black tracking-widest"
            style={{ color: "#FF4D00" }}
          >
            SLATE360
          </Link>
          <p className="mt-3 text-white/50 text-sm">
            Sign in to your account
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 flex flex-col gap-6">
          <form className="flex flex-col gap-5">
            {/* Email */}
            <div className="flex flex-col gap-2">
              <label
                htmlFor="email"
                className="text-xs font-semibold uppercase tracking-widest text-white/50"
              >
                Email address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@yourteam.com"
                className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#FF4D00] focus:ring-1 focus:ring-[#FF4D00] transition-colors"
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="text-xs font-semibold uppercase tracking-widest text-white/50"
                >
                  Password
                </label>
                <Link
                  href="#"
                  className="text-xs text-white/40 hover:text-white transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full bg-white/[0.05] border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-white/25 focus:outline-none focus:border-[#FF4D00] focus:ring-1 focus:ring-[#FF4D00] transition-colors"
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              className="w-full py-4 rounded-full font-semibold text-sm text-white transition-all duration-200 hover:opacity-90 hover:scale-105 mt-2"
              style={{ backgroundColor: "#FF4D00" }}
            >
              Sign In
            </button>
          </form>

          <div className="relative flex items-center gap-4">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-xs text-white/30">or</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <p className="text-center text-sm text-white/40">
            Don&apos;t have an account?{" "}
            <Link
              href="/plans"
              className="font-semibold hover:opacity-80 transition-opacity"
              style={{ color: "#FF4D00" }}
            >
              Start your free trial
            </Link>
          </p>
        </div>

        <p className="mt-8 text-center text-xs text-white/25">
          &copy; {new Date().getFullYear()} SLATE360. All rights reserved.
        </p>
      </div>
    </div>
  );
}
