
'use client';

import * as React from "react";
// Framer Motion removed; using CSS animations
import clsx from "clsx";

interface AnimatedLogoProps {
  className?: string;
}

const AnimatedLogo = React.forwardRef<HTMLImageElement, AnimatedLogoProps>(
  ({ className }, ref) => (
    <img
      ref={ref}
      src="/logo.png"
      alt="Slate360 Logo"
      className={clsx("h-8 w-auto", className)}
      draggable={false}
    />
  )
);
AnimatedLogo.displayName = "AnimatedLogo";
export default AnimatedLogo;
