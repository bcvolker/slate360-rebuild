export default function FooterLinks() {
  return (
    <footer className="w-full bg-slate-900 text-white py-6 text-center border-t border-slate-800">
      <div className="max-w-6xl mx-auto px-4">
        <nav className="footer-text text-base font-medium text-slate-300 flex items-center justify-center gap-6">
          <a href="/about" className="underline hover:text-brand-copper transition-colors duration-200">About</a>
          <a href="/contact" className="underline hover:text-brand-copper transition-colors duration-200">Contact</a>
          <a href="/terms" className="underline hover:text-brand-copper transition-colors duration-200">Terms</a>
          <a href="/privacy" className="underline hover:text-brand-copper transition-colors duration-200">Privacy</a>
        </nav>
      </div>
    </footer>
  );
}
