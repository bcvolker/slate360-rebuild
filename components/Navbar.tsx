"use client";

import Link from "next/link";
import { useState } from "react";
import { Menu, X, ChevronDown } from "lucide-react";

const featureLinks = [
  { label: "Design Studio", href: "/features/design-studio" },
  { label: "Project Hub", href: "/features/project-hub" },
  { label: "SlateDrop", href: "/features/slatedrop" },
  { label: "360° Capture", href: "/features/360-capture" },
  { label: "Analytics", href: "/features/analytics" },
  { label: "GPU Rendering", href: "/features/rendering" },
];

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [featuresOpen, setFeaturesOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-6 md:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center h-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/logo.svg"
            alt="SLATE360"
            className="h-9 w-auto object-contain"
          />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-8">
          {/* Features dropdown */}
          <div
            className="relative"
            onMouseEnter={() => setFeaturesOpen(true)}
            onMouseLeave={() => setFeaturesOpen(false)}
          >
            <button className="flex items-center gap-1 text-sm font-medium text-white/70 hover:text-white transition-colors duration-200">
              Features <ChevronDown size={14} className={`transition-transform duration-200 ${featuresOpen ? "rotate-180" : ""}`} />
            </button>
            {featuresOpen && (
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-52 rounded-xl bg-zinc-900 border border-white/10 shadow-2xl py-2 z-50">
                {featureLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="block px-4 py-2.5 text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="border-t border-white/10 mt-1 pt-1">
                  <Link
                    href="/features"
                    className="block px-4 py-2.5 text-sm font-semibold text-white/70 hover:text-white hover:bg-white/5 transition-colors"
                    style={{ color: "#FF4D00" }}
                  >
                    All Features →
                  </Link>
                </div>
              </div>
            )}
          </div>
          <Link href="/plans" className="text-sm font-medium text-white/70 hover:text-white transition-colors duration-200">
            Plans &amp; Pricing
          </Link>
          <Link href="/about" className="text-sm font-medium text-white/70 hover:text-white transition-colors duration-200">
            About
          </Link>
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
        <div className="md:hidden bg-black/95 border-t border-white/10 px-6 pt-4 pb-6 flex flex-col gap-1">
          <p className="text-xs uppercase tracking-widest text-white/30 font-semibold mt-2 mb-1">Features</p>
          {featureLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="text-sm font-medium text-white/70 hover:text-white transition-colors py-2"
            >
              {link.label}
            </Link>
          ))}
          <div className="border-t border-white/10 mt-2 pt-4 flex flex-col gap-3">
            <Link href="/plans" onClick={() => setOpen(false)} className="text-base font-medium text-white/70 hover:text-white transition-colors">
              Plans &amp; Pricing
            </Link>
            <Link href="/about" onClick={() => setOpen(false)} className="text-base font-medium text-white/70 hover:text-white transition-colors">
              About
            </Link>
            <Link href="/login" onClick={() => setOpen(false)} className="text-base font-medium text-white/70 hover:text-white transition-colors">
              Login
            </Link>
            <Link
              href="/plans"
              onClick={() => setOpen(false)}
              className="text-center text-sm font-semibold px-5 py-3 rounded-full mt-1"
              style={{ backgroundColor: "#FF4D00", color: "#fff" }}
            >
              Start Free Trial
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
