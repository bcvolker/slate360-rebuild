import React from "react";
import clsx from "clsx";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
  className?: string;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", className, children, ...props }, ref) => (
    <button
      ref={ref}
      className={clsx(
        "px-5 py-2 rounded-lg font-semibold transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2",
        variant === "primary"
          ? "bg-brand-blue text-white hover:bg-brand-copper focus:ring-brand-blue"
          : "bg-white text-brand-blue border border-brand-blue hover:bg-brand-blue hover:text-white focus:ring-brand-copper",
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
);
Button.displayName = "Button";
export default Button;
