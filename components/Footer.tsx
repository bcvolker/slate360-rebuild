export default function Footer() {
  return (
    <footer className="mt-24 border-t bg-white">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 text-xs text-slate-500">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} Slate360. All rights reserved.</p>
          <nav className="flex flex-wrap items-center gap-4">
            <a href="/privacy" className="hover:underline">Privacy</a>
            <a href="/security" className="hover:underline">Security</a>
            <a href="/cookies" className="hover:underline">Cookies</a>
            <a href="/terms" className="hover:underline">Terms</a>
            <a href="/contact" className="hover:underline">Contact</a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
