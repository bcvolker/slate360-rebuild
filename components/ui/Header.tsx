
'use client';
import React from 'react';
import { motion } from 'framer-motion';
import clsx from 'clsx';

const navItems = [
  { name: 'BIM Studio', id: 'bim-studio' },
  { name: 'Project Hub', id: 'project-hub' },
  { name: '360 Tour Builder', id: 'tour-builder' },
  { name: 'Content Creation', id: 'content-creation' },
  { name: 'Geospatial', id: 'geospatial' },
  { name: 'Reports & Analytics', id: 'reports' },
  { name: 'VR/AR Lab', id: 'vr-ar-lab' },
];

type HeaderProps = { activeSection: string | null };

export default function Header({ activeSection }: HeaderProps) {
  return (
    <motion.header
      className="fixed top-0 left-0 right-0 z-50 flex justify-end items-center p-4"
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <nav className="flex items-center space-x-4 md:space-x-6 bg-black/20 backdrop-blur-md p-3 rounded-lg">
        {navItems.map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className={clsx(
              'px-3 py-1 text-sm md:text-base rounded-md transition-all duration-300',
              activeSection === item.id ? 'bg-[var(--color-brand-blue)] text-white' : 'text-gray-300 hover:text-white'
            )}
          >
            {item.name}
          </a>
        ))}
      </nav>
    </motion.header>
  );
}
