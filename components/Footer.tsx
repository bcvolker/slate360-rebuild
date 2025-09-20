export default function Footer() {
  return (
    <footer className="py-6 text-sm text-center text-[var(--ink-sub)] bg-white border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <p>© {new Date().getFullYear()} Slate360. All rights reserved.</p>
        <nav className="flex items-center gap-4">
          <a className="hover:underline" href="/terms">Terms</a>
          <a className="hover:underline" href="/privacy">Privacy</a>
          <a className="hover:underline" href="/cookies">Cookies</a>
        </nav>
      </div>
    </footer>
  );
}
