export default function FooterLinks() {
  return (
  <footer className="w-full bg-slate-900 text-white py-6 text-center border-t border-slate-800">
      <div className="max-w-6xl mx-auto px-4">
  <p className="text-base font-medium" style={{textShadow: '0 1px 6px rgba(0,0,0,0.18)'}}>
          &copy; {new Date().getFullYear()} Slate360. All rights reserved. |
          <a href="/subscribe" className="underline hover:text-brand-copper mx-1">Subscribe</a>
          | <a href="/about" className="underline hover:text-brand-copper mx-1">About</a>
          | <a href="/contact" className="underline hover:text-brand-copper mx-1">Contact</a>
          | <a href="/terms" className="underline hover:text-brand-copper mx-1">Terms</a>
          | <a href="/privacy" className="underline hover:text-brand-copper mx-1">Privacy</a>
          | <a href="/cookies" className="underline hover:text-brand-copper mx-1">Cookies</a>
        </p>
      </div>
    </footer>
  );
}
