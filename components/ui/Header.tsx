'use client';

import React from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import Link from 'next/link';
import Logo from './Logo';


const tileNavItems = [
  { name: 'BIM Studio', id: 'bim-studio' },
  { name: 'Project Hub', id: 'project-hub' },
  { name: '360 Tour Builder', id: 'tour-builder' },
  { name: 'Content Creation', id: 'content-creation' },
  { name: 'Geospatial & Robotics', id: 'geospatial' },
  { name: 'Reports & Analytics', id: 'reports' },
  { name: 'VR/AR Lab', id: 'vr-ar-lab' },
];


export default function Header({ activeSection }: { activeSection: string | null; }) {
  // Split tile nav into two rows of 4 (pad with empty if needed)
  const navRows = [
    tileNavItems.slice(0, 4),
    tileNavItems.slice(4, 8)
  ];
  return (
    <motion.header
      className="fixed top-0 left-0 w-full z-50 flex items-center justify-between px-8 py-3 bg-white/80 backdrop-blur border-b border-gray-200 shadow-sm"
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      {/* Logo on far left */}
      <div className="flex items-center min-w-[140px]">
        <Link href="/" className="flex items-center">
          <Logo className="w-28 h-auto" />
        </Link>
      </div>

      {/* Tile nav links in two rows, centered, spaced 1" from logo and About */}
      <div className="flex-1 flex flex-col items-center justify-center mx-8">
        <div className="flex flex-col space-y-1">
          {navRows.map((row, i) => (
            <div key={i} className="flex flex-row space-x-2">
              {row.map((item) => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  className={clsx(
                    'px-3 py-1 text-sm rounded-md font-medium transition-all duration-300',
                    activeSection === item.id ? 'bg-brand-blue text-white shadow' : 'text-brand-gray hover:bg-gray-100',
                  )}
                  style={{ minWidth: '7.5rem', textAlign: 'center' }}
                >
                  {item.name}
                </a>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Right nav: About, Contact, Subscribe, Login (rightmost) */}
      <div className="flex items-center space-x-2 min-w-[420px] justify-end">
        <Link href="/about" className="text-brand-gray px-3 py-1 text-sm font-medium rounded-md hover:bg-gray-100 transition-colors">About</Link>
        <Link href="/contact" className="text-brand-gray px-3 py-1 text-sm font-medium rounded-md hover:bg-gray-100 transition-colors">Contact</Link>
        <Link href="/subscribe" className="text-brand-gray px-3 py-1 text-sm font-medium rounded-md hover:bg-gray-100 transition-colors">Subscribe</Link>
        <Link href="/login" className="text-brand-blue px-3 py-1 text-sm font-semibold rounded-md border border-brand-blue hover:bg-brand-blue hover:text-white transition-colors">Login</Link>
      </div>
    </motion.header>
  );
}