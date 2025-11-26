'use client';

import React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils'; // Assuming you have a cn utility

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-[color:var(--slate-blueprint)] text-white hover:bg-[color:var(--slate-blueprint-accent)] shadow-[0_0_15px_rgba(0,71,187,0.4)] hover:shadow-[0_0_20px_rgba(26,93,255,0.6)] font-orbitron tracking-wide',
        destructive: 'bg-red-600 text-white hover:bg-red-700',
        outline: 'border border-[color:var(--slate-blueprint-soft)] bg-transparent text-[color:var(--slate-blueprint-soft)] hover:bg-[color:var(--slate-blueprint-soft)]/10 hover:text-[color:var(--slate-blueprint)] font-orbitron tracking-wide',
        secondary: 'bg-[color:var(--slate-graphite-soft)] text-[color:var(--slate-text-main)] hover:bg-[color:var(--slate-graphite-dark)] font-orbitron tracking-wide',
        ghost: 'hover:bg-[color:var(--slate-blueprint-soft)]/10 hover:text-[color:var(--slate-blueprint)]',
        link: 'text-[color:var(--slate-blueprint-accent)] underline-offset-4 hover:underline',
        copper: 'bg-[color:var(--slate-copper)] text-white hover:bg-[color:var(--slate-blueprint)] hover:text-white font-orbitron font-bold tracking-wide shadow-[0_0_15px_rgba(255,177,94,0.4)]',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = 'Button';

export default Button;
