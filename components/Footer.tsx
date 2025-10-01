import { Twitter, Linkedin } from "lucide-react";

export default function Footer() {
  return (
    <footer className="w-full border-t border-[#B87333]/20 snap-start relative">
      {/* Wave Divider */}
      <div className="absolute -top-8 left-0 w-full overflow-hidden pointer-events-none" aria-hidden="true">
        <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-16">
          <path fill="#f8fafc" d="M0,32 C480,80 960,0 1440,48 L1440,80 L0,80 Z" />
        </svg>
      </div>
      <div className="mx-auto w-full max-w-7xl px-4 md:px-8 py-12 text-sm text-slate-600 bg-gradient-to-br from-slate-50 to-slate-200">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col space-y-2 text-center md:text-left">
            <p className="text-lg font-semibold text-gray-900">© {new Date().getFullYear()} Slate360</p>
            <p className="text-sm text-slate-500">From Design to Reality - All rights reserved.</p>
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-4 md:gap-6 mt-4 md:mt-0">
            <a href="/about" className="hover:text-[#B87333] transition-colors">About</a>
            <a href="/contact" className="hover:text-[#B87333] transition-colors">Contact</a>
            <a href="/pricing" className="hover:text-[#B87333] transition-colors">Pricing</a>
            <a href="/privacy" className="hover:text-[#B87333] transition-colors">Privacy</a>
            <a href="/terms" className="hover:text-[#B87333] transition-colors">Terms</a>
            <a href="/cookies" className="hover:text-[#B87333] transition-colors">Cookies</a>
          </nav>
        </div>
        <div className="mt-8 pt-6 border-t border-slate-200">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-400">
            <p className="mb-2 md:mb-0">Professional tools for modern AEC workflows</p>
            <div className="flex gap-4">
              <a href="https://twitter.com/slate360" className="hover:text-[#4B9CD3] transition-colors flex items-center gap-1" aria-label="Twitter">
                <Twitter className="w-4 h-4" /> <span className="hidden sm:inline">Twitter</span>
              </a>
              <a href="https://linkedin.com/company/slate360" className="hover:text-[#4B9CD3] transition-colors flex items-center gap-1" aria-label="LinkedIn">
                <Linkedin className="w-4 h-4" /> <span className="hidden sm:inline">LinkedIn</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
