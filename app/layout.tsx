import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/ui/Navbar';
import SiteLogo from '@/components/ui/SiteLogo';

export const metadata: Metadata = { title: 'Slate360', description: 'From Design to Reality' };

export default function RootLayout({ children }:{children:React.ReactNode}){
  return (
    <html lang="en">
      <body className="bg-white text-[var(--ink)]">
        <SiteLogo />
        <Navbar />
        <main className="pt-16">{children}</main>
      </body>
    </html>
  );
}
