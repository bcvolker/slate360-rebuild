// import ClientHeader from '../components/ui/ClientHeader';

import type { Metadata } from 'next';
import Image from 'next/image';
import CookieBanner from '../components/ui/CookieBanner';
import Header from '../components/ui/Header';
import './globals.css';

export const metadata: Metadata = { title: 'Slate360', description: 'From Design to Reality' };

export default function RootLayout({ children }: { children: React.ReactNode; }) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="font-sans">
        <Header />
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}
