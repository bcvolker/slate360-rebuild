"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X } from "lucide-react";

const navLinks = [
  { label: "Features", href: "/features" },
  { label: "Plans & Pricing", href: "/plans" },
  { label: "About", href: "/about" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 md:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className="text-xl font-bold tracking-widest"
          style={{ color: "#FF4D00" }}
        >
          SLATE360
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-white/70 hover:text-white transition-colors duration-200"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm font-medium text-white/70 hover:text-white transition-colors duration-200 px-4 py-2"
          >
            Login
          </Link>
          <Link
            href="/plans"
            className="text-sm font-semibold px-5 py-2 rounded-full transition-all duration-200 hover:opacity-90 hover:scale-105"
            style={{ backgroundColor: "#FF4D00", color: "#fff" }}
          >
            Start Free Trial
          </Link>
        </div>

        {/* Mobile menu toggle */}
        <button
          className="md:hidden text-white/80 hover:text-white"
          onClick={() => setOpen((prev) => !prev)}
          aria-label="Toggle menu"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-black/95 border-t border-white/10 px-6 pt-4 pb-6 flex flex-col gap-5">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="text-base font-medium text-white/70 hover:text-white transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/login"
            onClick={() => setOpen(false)}
            className="text-base font-medium text-white/70 hover:text-white transition-colors"
          >
            Login
          </Link>
          <Link
            href="/plans"
            onClick={() => setOpen(false)}
            className="text-center text-sm font-semibold px-5 py-3 rounded-full"
            style={{ backgroundColor: "#FF4D00", color: "#fff" }}
          >
            Start Free Trial
          </Link>
        </div>
      )}
    </header>
  );
}
