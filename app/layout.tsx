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
        <Navbar />
        <main className="pt-11">
          {children}
        </main>
        <CookieBanner />
      </body>
    </html>
  );
}
