export default function FooterLinks() {
  return (
    <footer className="w-full bg-slate-900/80 backdrop-blur-sm border-t border-slate-700/50 py-6 text-center">
      <div className="max-w-6xl mx-auto px-4">
        <p className="footer-text text-base font-medium text-slate-300" style={{ textShadow: '0 1px 6px rgba(0,0,0,0.18)' }}>
          &copy; {new Date().getFullYear()} Slate360. All rights reserved. |
          <a href="/subscribe" className="text-slate-300 hover:text-white mx-1 transition-colors duration-200">Subscribe</a>
          | <a href="/about" className="text-slate-300 hover:text-white mx-1 transition-colors duration-200">About</a>
          | <a href="/contact" className="text-slate-300 hover:text-white mx-1 transition-colors duration-200">Contact</a>
          | <a href="/terms" className="text-slate-300 hover:text-white mx-1 transition-colors duration-200">Terms</a>
          | <a href="/privacy" className="text-slate-300 hover:text-white mx-1 transition-colors duration-200">Privacy</a>
          | <a href="/cookies" className="text-slate-300 hover:text-white mx-1 transition-colors duration-200">Cookies</a>
        </p>
        <p className="text-[10px] text-center text-slate-400 mt-8 mb-4">
          Build: {process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ?? 'local'}
        </p>
      </div>
    </footer>
  );
}
