

'use client';
import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';

export default function AnimatedLogo() {
  return (
    <Link href="/" passHref>
      <motion.div
        className="fixed top-4 left-4 z-50 flex items-center space-x-2 cursor-pointer"
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
      >
        <div className="w-10 h-10 bg-brand-blue rounded-full flex items-center justify-center">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        </div>
        <span className="text-2xl font-bold text-brand-gray">Slate<span className="text-brand-blue">360</span></span>
      </motion.div>
    </Link>
  );
}
