"use client";
import React, { forwardRef } from "react";
import clsx from "clsx";
import AnimatedLogo from "./AnimatedLogo";

interface HeaderProps extends React.HTMLAttributes<HTMLElement> {
  className?: string;
}

const Header = forwardRef<HTMLElement, HeaderProps>(function Header(
  { className, ...props },
  ref
) {
  return (
    <header
      ref={ref}
      className={clsx(
        "fixed top-0 left-0 w-full z-50 flex items-center justify-between px-6 py-4 bg-white/80 backdrop-blur-md shadow-md transition-all duration-300 animate-fade-in",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-3">
        <AnimatedLogo className="h-10 w-10" />
        <span className="font-extrabold text-xl text-brand-blue tracking-tight select-none">
          Slate360
        </span>
      </div>
      <nav className="hidden md:flex gap-6 text-brand-gray font-medium">
        <a href="#about" className="hover:text-brand-blue transition-colors">About</a>
        <a href="#features" className="hover:text-brand-blue transition-colors">Features</a>
        <a href="#demos" className="hover:text-brand-blue transition-colors">Demos</a>
        <a href="#contact" className="hover:text-brand-blue transition-colors">Contact</a>
      </nav>
    </header>
  );
});

export default Header;
