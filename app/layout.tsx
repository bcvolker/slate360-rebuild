// import ClientHeader from '../components/ui/ClientHeader';

import type { Metadata } from 'next';
import Image from 'next/image';
import CookieBanner from '../components/ui/CookieBanner';
import Header from '../components/ui/Header';
import Navbar from '../components/ui/Navbar';
import './globals.css';

export const metadata: Metadata = { title: 'Slate360', description: 'From Design to Reality' };

export default function RootLayout({ children }: { children: React.ReactNode; }) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="font-sans">
        <Header />
        {/* Secondary nav bar directly below header */}
        <div className="fixed top-[70px] left-0 right-0 z-40 bg-white/85 backdrop-blur border-b border-slate-200">
          <div className="mx-auto max-w-7xl px-6 py-2">
            <Navbar />
          </div>
        </div>
        {/* Page content offset to clear header + navbar (approx 70px + ~44px) */}
        <div className="pt-[118px]">
          {children}
        </div>
        <CookieBanner />
      </body>
    </html>
  );
}
