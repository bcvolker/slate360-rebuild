
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import AnimatedLogo from '../components/ui/AnimatedLogo';
import CookieBanner from '../components/ui/CookieBanner';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Slate360',
  description: 'From Design to Reality',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AnimatedLogo />
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}
