import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export const metadata = {
  title: "Slate360 — Immersive Spatial Experiences at Scale",
  description:
    "Design, publish, and manage 360° tours, digital twins, and interactive spatial media. Built for professionals.",
};

export default async function RootPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) redirect("/dashboard");

  return (
    <div className="dark min-h-screen bg-zinc-950 flex flex-col overflow-hidden">
      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b border-zinc-800/60 bg-zinc-950/90 backdrop-blur-md px-6 sm:px-10 h-16 flex items-center justify-between">
        <img
          src="/uploads/SLATE 360-Color Reversed Lockup.svg"
          alt="Slate360"
          className="h-7 sm:h-8 w-auto"
        />
        <Link
          href="/login"
          className="px-5 py-2 rounded-xl bg-[#D4AF37] text-black text-sm font-bold hover:bg-[#c49f30] transition-colors shadow-[0_0_16px_rgba(212,175,55,0.35)]"
        >
          Login
        </Link>
      </header>

      {/* ── Hero ── */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-8 py-24">
        {/* Gold accent line */}
        <div className="w-12 h-0.5 bg-[#D4AF37] rounded-full" />

        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight leading-[1.05] max-w-3xl">
          The{" "}
          <span className="text-[#D4AF37]">360°</span>{" "}
          Platform for Spatial Media
        </h1>

        <p className="max-w-lg text-zinc-400 text-base sm:text-lg leading-relaxed">
          Design, publish, and manage immersive tours, digital twins, and
          interactive spatial experiences — all from one walled-garden workspace.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 mt-2">
          <Link
            href="/login"
            className="px-8 py-3.5 rounded-2xl bg-[#D4AF37] text-black text-sm font-bold hover:bg-[#c49f30] hover:scale-105 transition-all shadow-[0_0_32px_rgba(212,175,55,0.45)]"
          >
            Get Started
          </Link>
          <Link
            href="/login"
            className="px-8 py-3.5 rounded-2xl border border-zinc-700 text-zinc-300 text-sm font-semibold hover:border-zinc-500 hover:text-white transition-colors"
          >
            Sign In
          </Link>
        </div>
      </main>

      {/* ── Footer ── */}
      <footer className="border-t border-zinc-800/50 px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500">
        <span>© {new Date().getFullYear()} Slate360. All rights reserved.</span>
        <div className="flex items-center gap-5">
          <Link href="/privacy" className="hover:text-zinc-300 transition-colors">Privacy</Link>
          <Link href="/terms" className="hover:text-zinc-300 transition-colors">Terms</Link>
        </div>
      </footer>
    </div>
  );
}

