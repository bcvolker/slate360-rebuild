import React from 'react';
import Link from 'next/link';
import AnimatedLogo from './AnimatedLogo';

export default function PageLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface-light text-brand-gray">
      <header className="py-4 px-8 border-b border-gray-200">
        <Link href="/">
          <AnimatedLogo />
        </Link>
      </header>
      <main className="max-w-4xl mx-auto p-8">
        {children}
      </main>
    </div>
  );
}
