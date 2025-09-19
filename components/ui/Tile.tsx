
'use client';
import React, { forwardRef } from 'react';
import clsx from 'clsx';
import { motion } from 'framer-motion';

type TileProps = { id: string; children: React.ReactNode; dark?: boolean; reverse?: boolean; className?: string; };

const Tile = forwardRef<HTMLElement, TileProps>(({ id, children, dark = false, reverse = false, className }, ref) => {
  const animationVariants = {
    hidden: { opacity: 0, x: reverse ? 50 : -50 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.6 } },
  };
  return (
    <section 
      ref={ref} 
      id={id} 
      className={clsx(
        'min-h-screen h-screen flex items-center justify-center snap-start relative px-4 md:px-8 py-20 md:py-24', 
        dark ? 'bg-gray-100 text-gray-800' : 'bg-white text-gray-800',
        className
      )}
    >
      <motion.div
        className="max-w-7xl w-full grid gap-8 md:gap-12 grid-cols-1 md:grid-cols-2 items-center"
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.3 }}
        variants={animationVariants}
      >
        {children}
      </motion.div>
    </section>
  );
});
Tile.displayName = 'Tile';
export default Tile;

