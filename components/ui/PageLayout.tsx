import React from 'react';
import Link from 'next/link';
export default function PageLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-surface-light text-brand-gray">
      <main className="max-w-4xl mx-auto p-8">
        {children}
      </main>
    </div>
  );
}
