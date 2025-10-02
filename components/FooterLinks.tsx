export default function FooterLinks() {
  return (
    <footer className="w-full bg-slate-900 text-slate-400 py-8 text-center border-t border-slate-800">
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex flex-col md:flex-row md:justify-between items-center gap-4">
          <p className="text-sm">&copy; {new Date().getFullYear()} Slate360. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="/subscribe" className="hover:text-brand-copper">Subscribe</a>
            <a href="/pricing" className="hover:text-brand-copper">Pricing</a>
            <a href="/about" className="hover:text-brand-copper">About</a>
            <a href="/contact" className="hover:text-brand-copper">Contact</a>
            <a href="/terms" className="hover:text-brand-copper">Terms</a>
            <a href="/privacy" className="hover:text-brand-copper">Privacy</a>
            <a href="/cookies" className="hover:text-brand-copper">Cookies</a>
          </div>
        </div>
        <p className="mt-4 text-xs text-slate-500">
          Data storage and usage may be subject to limits. Additional charges may apply.
        </p>
      </div>
    </footer>
  );
}
