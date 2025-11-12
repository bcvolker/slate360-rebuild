

'use client';

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Logo from './Logo';

export default function AnimatedLogo() {
  return (
    <Link href="/" aria-label="Home">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>
        <Logo />
      </motion.div>
    </Link>
  );
}
