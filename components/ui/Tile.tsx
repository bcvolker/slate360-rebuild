"use client";
import clsx from 'clsx';

type TileProps = {
  title: string;
  description: string;
  icon?: React.ReactNode;
  className?: string;
  onClick?: () => void;
  children?: React.ReactNode;
};

export default function Tile({ title, description, icon, className, onClick, children }: TileProps) {
  return (
    <div
      className={clsx(
        'rounded-2xl bg-white/80 dark:bg-black/40 shadow-lg p-6 flex flex-col items-center justify-center transition-transform hover:scale-105 cursor-pointer',
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
      <h3 className="text-lg font-bold mb-2 text-center">{title}</h3>
      <p className="text-sm text-center text-gray-600 dark:text-gray-300 mb-2">{description}</p>
      {children}
    </div>
  );
}

