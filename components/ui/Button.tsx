
import React from 'react';
import clsx from 'clsx';

type ButtonProps = {
  children: React.ReactNode;
  className?: string;
  as?: 'a' | 'button';
  href?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
} & React.ButtonHTMLAttributes<HTMLButtonElement> & React.AnchorHTMLAttributes<HTMLAnchorElement>;

export default function Button({ children, className, as = 'button', href, size = 'md', ...props }: ButtonProps) {
  const base = 'inline-flex items-center justify-center font-semibold rounded-lg transition-colors hover-scale focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue';
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg',
    xl: 'px-10 py-5 text-xl',
  };
  const color = 'bg-[hsl(var(--color-brand-blue))] text-white hover:bg-[hsl(var(--color-brand-copper))]';
  const classes = clsx(base, color, sizes[size], className);
  if (as === 'a' && href) {
    return <a href={href} className={classes} {...props}>{children}</a>;
  }
  return <button className={classes} {...props}>{children}</button>;
}
