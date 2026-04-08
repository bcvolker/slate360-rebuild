"use client";

import { useState, useEffect } from "react";
import { LandingHeader } from "./LandingHeader";
import { HeroSection } from "./HeroSection";
import { AppShowcaseSection } from "./AppShowcaseSection";
import { TestimonialsSection } from "./TestimonialsSection";
import { PricingSection } from "./PricingSection";
import { CTASection } from "./CTASection";
import { LandingFooter } from "./LandingFooter";
import { LoginModal } from "./LoginModal";

export function LandingPage() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const openLogin = () => setLoginModalOpen(true);

  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <LandingHeader onLoginClick={openLogin} isScrolled={isScrolled} />
      <HeroSection onGetStarted={openLogin} />
      <AppShowcaseSection />
      <TestimonialsSection />
      <PricingSection onGetStarted={openLogin} />
      <CTASection onGetStarted={openLogin} />
      <LandingFooter />
      <LoginModal open={loginModalOpen} onOpenChange={setLoginModalOpen} />
    </div>
  );
}
