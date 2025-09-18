import React from "react";
import clsx from "clsx";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ children, className, ...props }, ref) => (
    <div
      ref={ref}
      className={clsx(
        "rounded-2xl shadow-lg bg-white p-6 transition-transform duration-300 hover:scale-105 hover:shadow-2xl",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);
Card.displayName = "Card";
export default Card;
