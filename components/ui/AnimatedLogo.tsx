
'use client';
import React from 'react';
import { motion } from 'framer-motion';

export default function AnimatedLogo() {
  return (
    <motion.div
      className="fixed top-4 left-4 z-50 text-2xl font-bold text-white"
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.2, ease: 'easeOut' }}
    >
      <span className="text-[var(--color-brand-blue)]">Slate</span>360
    </motion.div>
  );
}
