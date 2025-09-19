'use client';
import React from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import Link from 'next/link';

const tileNavItems = [
  { name: 'BIM Studio', id: 'bim-studio' },
  { name: 'Project Hub', id: 'project-hub' },
  { name: '360 Tour Builder', id: 'tour-builder' },
  // ... add other tile nav items here as needed
];

export default function Header({ activeSection }: { activeSection: string | null; }) {
  return (
    <motion.header
      className="fixed top-4 right-4 z-50 flex items-center space-x-4"
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <nav className="hidden lg:flex items-center space-x-2 bg-white/50 backdrop-blur-md p-2 rounded-lg border border-gray-200 shadow-sm">
        {tileNavItems.map((item) => (
          <a key={item.id} href={`#${item.id}`} className={clsx('px-3 py-1 text-sm rounded-md transition-all duration-300 font-medium', activeSection === item.id ? 'bg-brand-blue text-white' : 'text-brand-gray hover:bg-gray-100')}>
            {item.name}
          </a>
        ))}
      </nav>
      <nav className="flex items-center space-x-2">
        <Link href="/about" className="text-brand-gray bg-white/50 backdrop-blur-md p-3 rounded-lg border border-gray-200 text-sm font-medium hover:bg-gray-100 transition-colors shadow-sm">About</Link>
        <Link href="/subscribe" className="text-white bg-brand-blue p-3 rounded-lg text-sm font-semibold hover:bg-brand-copper transition-colors shadow-sm">Subscribe</Link>
      </nav>
    </motion.header>
  );
}