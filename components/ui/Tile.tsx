
"use client";
import clsx from 'clsx';


import React from 'react';

type TileProps = {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  className?: string;
  onClick?: () => void;
  children?: React.ReactNode;
  dark?: boolean;
  reverse?: boolean;
};

const Tile = React.forwardRef<HTMLDivElement, TileProps>(
  ({ title, description, icon, className, onClick, children, dark, reverse }, ref) => {
    return (
      <div
        ref={ref}
        className={clsx(
          'rounded-2xl shadow-lg p-6 flex flex-col items-center justify-center transition-transform hover:scale-105 cursor-pointer',
          dark ? 'bg-black/40 text-white' : 'bg-white/80 text-black',
          reverse ? 'flex-row-reverse' : '',
          className
        )}
        onClick={onClick}
        tabIndex={0}
        role="button"
        onKeyPress={e => {
          if (e.key === 'Enter' && onClick) onClick();
        }}
      >
        {icon && <div className="mb-4 text-4xl">{icon}</div>}
        {title && <h3 className="text-lg font-bold mb-2 text-center">{title}</h3>}
        {description && <p className="text-sm text-center text-gray-600 dark:text-gray-300 mb-2">{description}</p>}
        {children}
      </div>
    );
  }
);

Tile.displayName = 'Tile';
export default Tile;

