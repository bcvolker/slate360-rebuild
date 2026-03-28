"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import HeroSection from "@/components/home/HeroSection";
import PlatformSection from "@/components/home/PlatformSection";
import MoreToolsSection from "@/components/home/MoreToolsSection";
import PricingSection from "@/components/home/PricingSection";
import CTASection from "@/components/home/CTASection";
import HomeModals from "@/components/home/HomeModals";

export default function HomePage() {
  const [modal3D, setModal3D] = useState(false);
  const [heroInteractive, setHeroInteractive] = useState(false);
  const [designInteractive, setDesignInteractive] = useState(false);
  const [tourInteractive, setTourInteractive] = useState(false);
  const [modalCard, setModalCard] = useState<string | null>(null);
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="bg-white min-h-screen text-gray-900 antialiased overflow-x-hidden">
      <Navbar />

      <HeroSection
        mounted={mounted}
        heroInteractive={heroInteractive}
        setHeroInteractive={setHeroInteractive}
        onExpand3D={() => setModal3D(true)}
      />

      <PlatformSection
        mounted={mounted}
        designInteractive={designInteractive}
        setDesignInteractive={setDesignInteractive}
        tourInteractive={tourInteractive}
        setTourInteractive={setTourInteractive}
        onExpandCard={setModalCard}
      />

      <MoreToolsSection />

      <PricingSection billing={billing} setBilling={setBilling} />

      <CTASection />

      <Footer />

      <HomeModals
        mounted={mounted}
        modal3D={modal3D}
        setModal3D={setModal3D}
        modalCard={modalCard}
        setModalCard={setModalCard}
      />
    </div>
  );
}
