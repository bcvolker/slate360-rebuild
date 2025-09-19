
"use client";
import React, { forwardRef } from 'react';
import clsx from 'clsx';
import { motion } from 'framer-motion';

type TileProps = {
  id: string;
  textContent: React.ReactNode;
  mediaContent: React.ReactNode;
  dark?: boolean;
  reverse?: boolean;
  className?: string;
};

const Tile = forwardRef<HTMLElement, TileProps>(
  ({ id, textContent, mediaContent, dark = false, reverse = false, className }, ref) => {
    const animationVariants = {
      hidden: { opacity: 0, x: reverse ? 50 : -50 },
      visible: { opacity: 1, x: 0, transition: { duration: 0.6 } },
    };
    return (
      <section
        ref={ref}
        id={id}
        className={clsx('tile-section', dark ? 'tile-surface-dark' : 'tile-surface-light', className)}
      >
        <motion.div
          className={clsx(
            'max-w-7xl w-full grid gap-8 md:gap-12 grid-cols-1 md:grid-cols-2 items-center',
            reverse && 'md:flex-row-reverse'
          )}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={animationVariants}
        >
          <div>{textContent}</div>
          <div>{mediaContent}</div>
        </motion.div>
      </section>
    );
  }
);
Tile.displayName = 'Tile';
export default Tile;

