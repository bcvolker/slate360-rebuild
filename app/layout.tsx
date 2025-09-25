// import ClientHeader from '../components/ui/ClientHeader';

import type { Metadata } from 'next';
import CookieBanner from '../components/ui/CookieBanner';
import Navbar from '../components/ui/Navbar';
import SiteLogo from '../components/ui/SiteLogo';
import './globals.css';

export const metadata: Metadata = { title: 'Slate360', description: 'From Design to Reality' };

export default function RootLayout({ children }: { children: React.ReactNode; }) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="font-sans">
        {/* Fixed logo overlay (independent of navbar height) */}
        <SiteLogo />
        {/* Slim top header */}
        <div className="fixed top-0 left-0 right-0 h-11 bg-white/90 border-b border-slate-200 z-50" />
        
        {/* Static navigation bar below header */}
        <div className="bg-white border-b border-slate-200 pt-11">
          <div className="mx-auto max-w-7xl px-6 py-2 pr-56">
            <Navbar />
          </div>
        </div>
        
        <main>
          {children}
        </main>
        <CookieBanner />
      </body>
    </html>
  );
}
