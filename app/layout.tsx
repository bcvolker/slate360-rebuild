
import type { Metadata } from 'next';
import Image from 'next/image';
import CookieBanner from '../components/ui/CookieBanner';
import './globals.css';

export const metadata: Metadata = { title: 'Slate360', description: 'From Design to Reality' };

export default function RootLayout({ children }: { children: React.ReactNode; }) {
  return (
    <html lang="en">
      <body className="font-sans">
        <div className="fixed top-6 left-8 z-50 flex items-center" style={{height: '64px'}}>
          <Image src="/logo.png" alt="Slate360 Logo" width={180} height={48} priority className="h-16 w-auto drop-shadow-xl" />
        </div>
  {children}
        <CookieBanner />
      </body>
    </html>
  );
}
