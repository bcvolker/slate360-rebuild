"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

export default function SiteLogo() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleMobileMenuToggle = (event: CustomEvent) => {
      setIsMobileMenuOpen(event.detail.isOpen);
    };

    window.addEventListener('mobile-menu-toggle', handleMobileMenuToggle as EventListener);
    return () => window.removeEventListener('mobile-menu-toggle', handleMobileMenuToggle as EventListener);
  }, []);

  return (
    <Link
      href="/"
      className={`fixed top-4 left-6 z-30 pointer-events-auto inline-flex items-center transition-opacity duration-200 ${
        isMobileMenuOpen ? 'md:opacity-100 opacity-0' : ''
      }`}
    >
      <Image
        src="/slate360logoforwebsite.png"
        alt="Slate360 Logo"
        width={325}
        height={98}
        priority
        className="h-[2.5rem] md:h-[5.7rem] w-auto object-contain drop-shadow-md"
      />
    </Link>
  );
}
