
import type { Metadata } from 'next';
import Image from 'next/image';
import CookieBanner from '../components/ui/CookieBanner';
import './globals.css';

export const metadata: Metadata = { title: 'Slate360', description: 'From Design to Reality' };

export default function RootLayout({ children }: { children: React.ReactNode; }) {
  return (
    <html lang="en">
      <body className="font-sans">
        <div className="fixed top-0 left-0 z-[100] flex items-center" style={{padding: '2.5rem 0 0 2.5rem', height: '88px'}}>
          <img src="/logo.png" alt="Slate360 Logo" style={{height: '72px', width: 'auto', border: '3px solid red', background: '#fff'}} />
        </div>
  {children}
        <CookieBanner />
      </body>
    </html>
  );
}
