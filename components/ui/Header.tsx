

'use client';
import React from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import Link from 'next/link';

const tileNavItems = [
  { name: 'BIM Studio', id: 'bim-studio' },
  { name: 'Project Hub', id: 'project-hub' },
  // ... add other tile nav items here
];

export default function Header({ activeSection }: { activeSection: string | null; }) {
  return (
    <motion.header
      className="fixed top-4 right-4 z-50 flex items-center space-x-4"
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <nav className="hidden md:flex items-center space-x-2 bg-black/30 backdrop-blur-md p-2 rounded-lg border border-white/20">
        {tileNavItems.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className={clsx(
              'px-3 py-1 text-xs rounded-md transition-all duration-300',
              activeSection === item.id ? 'bg-brand-blue text-white' : 'text-gray-300 hover:text-white'
            )}
          >
            {item.name}
          </a>
        ))}
      </nav>
      <nav className="flex items-center space-x-2">
        <Link href="/about" className="text-white bg-black/30 backdrop-blur-md p-3 rounded-lg border border-white/20 text-sm font-medium hover:text-brand-blue transition-colors">About</Link>
        <Link href="/subscribe" className="text-white bg-brand-blue p-3 rounded-lg text-sm font-semibold hover:bg-brand-copper transition-colors">Subscribe</Link>
      </nav>
    </motion.header>
  );
}
