"use client";

import { useState, useEffect } from "react";
import LandingHeader from "@/components/home/LandingHeader";
import HeroSection from "@/components/home/HeroSection";
import AppShowcaseSection from "@/components/home/AppShowcaseSection";
import TestimonialsSection from "@/components/home/TestimonialsSection";
import PricingSection from "@/components/home/PricingSection";
import CTASection from "@/components/home/CTASection";
import LandingFooter from "@/components/home/LandingFooter";
import LoginModal from "@/components/home/LoginModal";

export function LandingPage() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <LandingHeader
        onLoginClick={() => setLoginModalOpen(true)}
        isScrolled={isScrolled}
      />
      <HeroSection onGetStarted={() => setLoginModalOpen(true)} />
      <AppShowcaseSection />
      <TestimonialsSection />
      <PricingSection onGetStarted={() => setLoginModalOpen(true)} />
      <CTASection onGetStarted={() => setLoginModalOpen(true)} />
      <LandingFooter />
      <LoginModal open={loginModalOpen} onOpenChange={setLoginModalOpen} />
    </div>
  );
}
