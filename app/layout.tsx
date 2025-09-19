
import type { Metadata } from 'next';
import AnimatedLogo from '../components/ui/AnimatedLogo';
import CookieBanner from '../components/ui/CookieBanner';
import './globals.css';

export const metadata: Metadata = { title: 'Slate360', description: 'From Design to Reality' };

export default function RootLayout({ children }: { children: React.ReactNode; }) {
  return (
    <html lang="en">
      <body className="font-sans">
        <AnimatedLogo />
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}
