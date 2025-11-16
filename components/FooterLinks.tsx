import Link from "next/link";

export default function FooterLinks() {
  return (
    <footer
      id="footer"
      data-snap="tile"
      className="snap-start bg-slate-950 border-t border-slate-800 min-h-screen flex items-center justify-center px-6 py-12"
    >
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-6 text-center text-slate-300">
        <div>
          <p className="text-xs font-semibold tracking-[0.18em] text-sky-400/90">
            SLATE360 · FROM DESIGN TO REALITY
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-slate-50">
            Ready to see Slate360 in action?
          </h2>
          <p className="mt-2 text-sm text-slate-400">
            Schedule a walkthrough, request a sandbox account, or talk with us
            about your first pilot project.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
          <Link
            href="/contact"
            className="rounded-full bg-sky-500 px-5 py-2 font-semibold text-slate-950 shadow-lg shadow-sky-500/25 hover:bg-sky-400 hover:shadow-sky-400/30 transition-colors"
          >
            Contact sales
          </Link>
          <Link
            href="/about"
            className="rounded-full border border-slate-600 px-5 py-2 text-slate-200 hover:border-slate-400 hover:text-slate-50 transition-colors"
          >
            About Slate360
          </Link>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs text-slate-500">
          <span>© {new Date().getFullYear()} Slate360. All rights reserved.</span>
          <span className="hidden h-3 w-px bg-slate-700 sm:inline-block" />
          <Link href="/privacy" className="hover:text-slate-300">
            Privacy
          </Link>
          <span className="hidden h-3 w-px bg-slate-700 sm:inline-block" />
          <Link href="/terms" className="hover:text-slate-300">
            Terms
          </Link>
        </div>
      </div>
    </footer>
  );
}
