// import ClientHeader from '../components/ui/ClientHeader';

import type { Metadata } from 'next';
import Image from 'next/image';
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
        {/* Standard slim navbar at top */}
        <div className="fixed top-0 left-0 right-0 z-40 bg-white/90 backdrop-blur border-b border-slate-200">
          <div className="mx-auto max-w-7xl px-6 h-[48px] flex items-center">
            <Navbar />
          </div>
        </div>
        {/* Content offset for slim navbar */}
        <div className="pt-[56px]">
          {children}
        </div>
        <CookieBanner />
      </body>
    </html>
  );
}
