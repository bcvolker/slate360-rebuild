"use client";

import { useState } from "react";

export default function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-20 bg-slate-900 text-white flex items-center px-6">
      <div className="flex-1 flex items-center gap-4">
        {/* Logo placeholder — replace with <Image src="/logo.svg" alt="Slate360" width={40} height={40} /> */}
        <div className="w-10 h-10 bg-white rounded" />
        <span className="text-2xl font-bold">SLATE360</span>
      </div>
      <div className="relative">
        <button onClick={() => setOpen(!open)} className="md:hidden text-white">
          Menu ▼
        </button>
        <nav className="hidden md:flex gap-6 text-sm">
          <a href="#slate360" className="hover:text-gray-300">Slate360</a>
          <a href="#bim" className="hover:text-gray-300">BIM Studio</a>
          <a href="#360" className="hover:text-gray-300">360 Tour</a>
          <a href="#content" className="hover:text-gray-300">Content</a>
          <a href="#geospatial" className="hover:text-gray-300">Geospatial</a>
          <a href="#analytics" className="hover:text-gray-300">Analytics</a>
          <a href="#vr" className="hover:text-gray-300">VR/AR</a>
        </nav>
        {open && (
          <div className="absolute top-full left-0 mt-2 w-48 bg-slate-900 border rounded shadow-lg">
            <a href="#slate360" className="block px-4 py-2 text-gray-300 hover:text-white">Slate360</a>
            <a href="#bim" className="block px-4 py-2 text-gray-300 hover:text-white">BIM Studio</a>
            <a href="#360" className="block px-4 py-2 text-gray-300 hover:text-white">360 Tour</a>
            <a href="#content" className="block px-4 py-2 text-gray-300 hover:text-white">Content</a>
            <a href="#geospatial" className="block px-4 py-2 text-gray-300 hover:text-white">Geospatial</a>
            <a href="#analytics" className="block px-4 py-2 text-gray-300 hover:text-white">Analytics</a>
            <a href="#vr" className="block px-4 py-2 text-gray-300 hover:text-white">VR/AR</a>
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