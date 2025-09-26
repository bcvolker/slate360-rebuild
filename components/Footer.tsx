export default function Footer() {
  return (
    <footer className="w-full bg-white border-t border-[#B87333]/20 snap-start">
      <div className="mx-auto w-full max-w-7xl px-8 py-12 text-sm text-slate-600">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex flex-col space-y-2">
            <p className="text-lg font-semibold text-gray-900">© {new Date().getFullYear()} Slate360</p>
            <p className="text-sm text-slate-500">From Design to Reality - All rights reserved.</p>
          </div>
          <nav className="flex flex-wrap items-center gap-6">
            <a href="/about" className="hover:text-[#B87333] transition-colors">About</a>
            <a href="/contact" className="hover:text-[#B87333] transition-colors">Contact</a>
            <a href="/pricing" className="hover:text-[#B87333] transition-colors">Pricing</a>
            <a href="/privacy" className="hover:text-[#B87333] transition-colors">Privacy</a>
            <a href="/terms" className="hover:text-[#B87333] transition-colors">Terms</a>
            <a href="/cookies" className="hover:text-[#B87333] transition-colors">Cookies</a>
          </nav>
        </div>
        <div className="mt-8 pt-6 border-t border-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-slate-400">
            <p>Professional tools for modern AEC workflows</p>
            <div className="flex gap-4">
              <a href="https://twitter.com/slate360" className="hover:text-[#4B9CD3] transition-colors" aria-label="Twitter">Twitter</a>
              <a href="https://linkedin.com/company/slate360" className="hover:text-[#4B9CD3] transition-colors" aria-label="LinkedIn">LinkedIn</a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
