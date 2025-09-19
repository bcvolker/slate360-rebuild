

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Logo from './Logo';

export default function AnimatedLogo() {
  return (
    <Link href="/" passHref>
      <motion.div
        className="fixed top-4 left-4 z-50 flex items-center space-x-2 cursor-pointer"
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
      >
        <Logo className="w-32 h-auto" />
      </motion.div>
    </Link>
  );
}
