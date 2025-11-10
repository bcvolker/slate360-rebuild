export default function FooterLinks() {
  return (
    <footer className="w-full bg-slate-700 text-white py-4 md:py-6 text-center text-sm space-x-4">
      <div className="max-w-6xl mx-auto px-4">
        <p className="footer-text text-sm font-medium text-white">
          &copy; {new Date().getFullYear()} Slate360. All rights reserved.
          <span className="mx-2">|</span>
          <a href="/subscribe" className="text-white hover:text-white/90 mx-1 transition-colors duration-200">Subscribe</a>
          <span className="mx-2">|</span>
          <a href="/about" className="text-white hover:text-white/90 mx-1 transition-colors duration-200">About</a>
          <span className="mx-2">|</span>
          <a href="/contact" className="text-white hover:text-white/90 mx-1 transition-colors duration-200">Contact</a>
          <span className="mx-2">|</span>
          <a href="/terms" className="text-white hover:text-white/90 mx-1 transition-colors duration-200">Terms</a>
          <span className="mx-2">|</span>
          <a href="/privacy" className="text-white hover:text-white/90 mx-1 transition-colors duration-200">Privacy</a>
          <span className="mx-2">|</span>
          <a href="/cookies" className="text-white hover:text-white/90 mx-1 transition-colors duration-200">Cookies</a>
        </p>
        {/* Build hash removed (dev artifact) */}
      </div>
    </footer>
  );
}
