export default function FooterLinks() {
  return (
  <footer className="w-full bg-slate-900 text-white py-6 text-center border-t border-slate-800">
      <div className="max-w-6xl mx-auto px-4">
        <p className="footer-text text-base font-medium text-slate-300" style={{textShadow: '0 1px 6px rgba(0,0,0,0.18)'}}>
          &copy; {new Date().getFullYear()} Slate360. All rights reserved. |
          <a href="/subscribe" className="underline hover:text-brand-copper mx-1 transition-colors duration-200">Subscribe</a>
          | <a href="/about" className="underline hover:text-brand-copper mx-1 transition-colors duration-200">About</a>
          | <a href="/contact" className="underline hover:text-brand-copper mx-1 transition-colors duration-200">Contact</a>
          | <a href="/terms" className="underline hover:text-brand-copper mx-1 transition-colors duration-200">Terms</a>
          | <a href="/privacy" className="underline hover:text-brand-copper mx-1 transition-colors duration-200">Privacy</a>
          | <a href="/cookies" className="underline hover:text-brand-copper mx-1 transition-colors duration-200">Cookies</a>
        </p>
        <p className="text-[10px] text-center text-gray-500 mt-8 mb-4">
          Build: {process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ?? 'local'}
        </p>
      </div>
    </footer>
  );
}
