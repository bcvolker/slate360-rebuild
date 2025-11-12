"use client";

import { useState } from "react";
import Image from "next/image";

export default function Navbar() {
  const [open, setOpen] = useState(false);

  const tiles = [
    { href: "#slate360", label: "Slate360" },
    { href: "#bim", label: "BIM Studio" },
    { href: "#360", label: "360 Tour Builder" },
    { href: "#content", label: "Content Studio" },
    { href: "#geospatial", label: "Geospatial & Robotics" },
    { href: "#analytics", label: "Analytics & Reports" },
    { href: "#vr", label: "AR/VR Studio" },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-20 bg-slate-900 text-white flex items-center px-6">
      <div className="flex-1 flex items-center gap-4">
        <Image src="/slate360logoforwebsite.png" alt="Slate360" width={40} height={40} />
        <span className="text-2xl font-bold">SLATE360</span>
      </div>
      <div className="relative">
        <button onClick={() => setOpen(!open)} className="md:hidden text-white">
          Menu ▼
        </button>
        <nav className="hidden md:flex gap-6 text-sm">
          {tiles.map((n) => (
            <a key={n.href} href={n.href} className="hover:text-gray-300">
              {n.label}
            </a>
          ))}
        </nav>
        {open && (
          <div className="absolute top-full left-0 mt-2 w-48 bg-slate-900 border rounded shadow-lg">
            {tiles.map((n) => (
              <a key={n.href} href={n.href} className="block px-4 py-2 text-gray-300 hover:text-white">
                {n.label}
              </a>
            ))}
          </div>
        )}
      </div>
      <nav className="hidden md:flex gap-6 text-sm">
        <a href="/about" className="hover:text-gray-300">About</a>
        <a href="/contact" className="hover:text-gray-300">Contact</a>
        <a href="/subscribe" className="hover:text-gray-300">Subscribe</a>
        <a href="/login" className="hover:text-gray-300">Login</a>
      </nav>
    </header>
  );
}