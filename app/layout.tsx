// import ClientHeader from '../components/ui/ClientHeader';

import type { Metadata } from 'next';
import Image from 'next/image';
import CookieBanner from '../components/ui/CookieBanner';
import './globals.css';

export const metadata: Metadata = { title: 'Slate360', description: 'From Design to Reality' };

export default function RootLayout({ children }: { children: React.ReactNode; }) {
  return (
    <html lang="en">
      <body className="font-sans">
        {/* <ClientHeader /> */}
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}
