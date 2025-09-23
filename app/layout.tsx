import ClientHeader from '../components/ui/ClientHeader';

import type { Metadata } from 'next';
import Image from 'next/image';
import CookieBanner from '../components/ui/CookieBanner';
import './globals.css';

export const metadata: Metadata = { title: 'Slate360', description: 'From Design to Reality' };

export default function RootLayout({ children }: { children: React.ReactNode; }) {
  return (
    <html lang="en">
      <body className="font-sans">
        <ClientHeader />
        <div style={{ background: 'lime', color: 'black', fontWeight: 'bold', fontSize: 24, padding: 16, textAlign: 'center', zIndex: 9999, position: 'relative' }}>
          LAYOUT TEST TEXT
        </div>
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}
