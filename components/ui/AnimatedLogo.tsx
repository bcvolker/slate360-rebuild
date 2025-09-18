
'use client';

import * as React from "react";
// Framer Motion removed; using CSS animations
import clsx from "clsx";

interface AnimatedLogoProps {
  className?: string;
}

const AnimatedLogo = React.forwardRef<SVGSVGElement, AnimatedLogoProps>(
  ({ className }, ref) => (
    <svg
      ref={ref}
      className={clsx("inline-block animate-logo-spin", className)}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="24" cy="24" r="22" stroke="#4B9CD3" strokeWidth="4" fill="#F9FAFB" />
      <path
        className="animate-logo-draw"
        d="M24 8a16 16 0 1 1-11.31 27.31"
        stroke="#B87333"
        strokeWidth="4"
        strokeLinecap="round"
        fill="none"
      />
      <circle
        className="animate-logo-pulse"
        cx="24"
        cy="24"
        r="6"
        fill="#4B9CD3"
      />
    </svg>
  )
);
AnimatedLogo.displayName = "AnimatedLogo";
export default AnimatedLogo;
