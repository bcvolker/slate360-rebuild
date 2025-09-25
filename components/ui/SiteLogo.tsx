'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';

export default function SiteLogo() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if mobile on mount and window resize
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);

    const handleMobileMenuToggle = (event: CustomEvent) => {
      setIsMobileMenuOpen(event.detail.isOpen);
    };

    window.addEventListener('mobileMenuToggle', handleMobileMenuToggle as EventListener);

    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('mobileMenuToggle', handleMobileMenuToggle as EventListener);
    };
  }, []);

  // Hide logo on mobile when menu is open, always show on desktop
  const shouldHide = isMobileMenuOpen && isMobile;

  return (
    <Link 
      href="/" 
      className={`fixed top-3 left-6 z-[60] pointer-events-auto transition-opacity duration-200 ${
        shouldHide ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-sm border border-white/20">
        <Image
          src="/slate360logoforwebsite.png"
          alt="Slate360 Logo"
          width={208}
          height={62}
          priority
          className="h-16 w-auto object-contain"
        />
      </div>
    </Link>
  );
}
