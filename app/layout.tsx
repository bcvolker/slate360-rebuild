
import type { Metadata } from 'next';
import Image from 'next/image';
import CookieBanner from '../components/ui/CookieBanner';
import './globals.css';

export const metadata: Metadata = { title: 'Slate360', description: 'From Design to Reality' };

export default function RootLayout({ children }: { children: React.ReactNode; }) {
  return (
    <html lang="en">
      <body className="font-sans">
        {/* --- START DEBUG IMAGE --- */}
        <img
          src="/slate360-logo.png"
          alt="Slate360 Logo Debug Test"
          style={{ width: "200px", height: "auto", display: "block", border: "3px solid red", margin: "20px", zIndex: 9999, position: 'relative' }}
        />
        {/* --- END DEBUG IMAGE --- */}
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}
