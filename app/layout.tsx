import "./globals.css";
import type { Metadata } from "next";
import Navbar from "@/components/ui/Navbar";

export const metadata: Metadata = {
  title: "Slate360",
  description: "From Design to Reality",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-white">
        <Navbar />
        <main id="scroll-container" className="h-[100dvh] overflow-y-scroll snap-y snap-mandatory">
          {children}
        </main>
        <footer className="w-full bg-white/95 border-t border-[#B87333]/20">
          <div className="mx-auto w-full max-w-7xl px-6 py-3 text-[11px] text-slate-600">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 whitespace-nowrap">
                <span className="font-semibold text-gray-900">© {new Date().getFullYear()} Slate360</span>
                <span className="text-slate-500">• From Design to Reality</span>
              </div>
              <nav className="flex flex-wrap items-center gap-3">
                <a href="/about" className="hover:text-[#B87333] transition-colors">About</a>
                <a href="/contact" className="hover:text-[#B87333] transition-colors">Contact</a>
                <a href="/pricing" className="hover:text-[#B87333] transition-colors">Pricing</a>
                <a href="/privacy" className="hover:text-[#B87333] transition-colors">Privacy</a>
                <a href="/terms" className="hover:text-[#B87333] transition-colors">Terms</a>
                <a href="/cookies" className="hover:text-[#B87333] transition-colors">Cookies</a>
              </nav>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
