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
        {/* Standard slim top bar (branding/utility, can be extended later) */}
        <div className="fixed top-0 left-0 right-0 z-40 bg-white/80 backdrop-blur border-b border-slate-200">
          <div className="mx-auto max-w-7xl px-6 h-[48px] flex items-center" />
        </div>
        {/* Tile navigation bar directly below the top bar */}
        <div className="fixed top-[48px] left-0 right-0 z-40 bg-white/90 backdrop-blur border-b border-slate-200">
          <div className="mx-auto max-w-7xl px-6 h-[44px] flex items-center">
            <Navbar />
          </div>
        </div>
        {/* Content offset for both bars (48 + 44) */}
        <div className="pt-[96px]">
          {children}
        </div>
        <CookieBanner />
      </body>
    </html>
  );
}
