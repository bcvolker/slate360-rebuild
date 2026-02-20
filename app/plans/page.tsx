"use client";
import { useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Check, ChevronRight } from "lucide-react";

const tiers = [
  {
    name: "Creator", price: "$79", annualPrice: "$66", per: "/mo",
    desc: "For solo visual content creators and small teams.",
    features: [
      "360 Tour Builder", "Virtual Studio",
      "40 GB SlateDrop storage", "6,000 processing credits/mo",
      "Embed tours on any website", "Share links for clients",
      "PWA field capture app",
    ],
    cta: "Start free trial", href: "/signup",
  },
  {
    name: "Model", price: "$199", annualPrice: "$166", per: "/mo",
    desc: "For architects, modelers, and drone operators.",
    features: [
      "Design Studio (full access)", "Geospatial & Robotics",
      "360 Tour Builder + Virtual Studio",
      "150 GB SlateDrop storage", "15,000 processing credits/mo",
      "Photogrammetry pipeline", "3D print queue",
      "Animation export to MP4",
    ],
    cta: "Start free trial", href: "/signup",
  },
  {
    name: "Business", price: "$499", annualPrice: "$416", per: "/mo",
    desc: "Full platform for construction teams and contractors.",
    features: [
      "All modules including Project Hub",
      "750 GB SlateDrop storage", "30,000 processing credits/mo",
      "RFI and submittal workflows", "Project folder auto-structure",
      "Gantt timeline and scheduling", "Analytics and reporting",
      "PDF and CSV project exports",
    ],
    cta: "Start free trial", href: "/signup", highlight: true,
  },
  {
    name: "Enterprise", price: "Custom", annualPrice: "Custom", per: "",
    desc: "For large firms, multi-team organizations, and government clients.",
    features: [
      "Everything in Business", "Seat management and role assignment",
      "Real-time multi-user collaboration", "Dedicated support SLA",
      "Custom storage and credits", "SSO and enterprise security",
      "Onboarding and training sessions",
    ],
    cta: "Contact us", href: "mailto:hello@slate360.ai",
  },
];

const faqs = [
  { q: "Can I switch plans anytime?", a: "Yes. You can upgrade or downgrade at any time. Credits and data carry over when upgrading." },
  { q: "What are processing credits?", a: "Credits are consumed for GPU-intensive tasks like photogrammetry, 3D rendering, and 360° stitching. Credits refresh monthly and unused credits roll over up to 2x your monthly allotment." },
  { q: "Is the free trial really free?", a: "Yes — no credit card required. Trial gives you access to all tabs with starter-level limits so you can explore before committing." },
  { q: "What happens to my data if I downgrade?", a: "Your data and projects are never deleted when you downgrade. You just lose access to features above your tier until you upgrade again." },
  { q: "Do you offer nonprofit or education pricing?", a: "Yes. Contact us at hello@slate360.ai for nonprofit, academic, and government pricing." },
  { q: "Can I use Slate360 on my phone?", a: "Yes — every module has a mobile-optimized view. Field crews can use the PWA apps for 360° capture and project reporting even with limited connectivity." },
];

export default function PlansPage() {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");
  return (
    <div className="bg-white min-h-screen text-gray-900 antialiased">
      <Navbar />
      <section className="pt-24 pb-6 px-4 sm:px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <span className="inline-block text-[10px] font-semibold uppercase tracking-widest px-3 py-1 rounded-full mb-3" style={{ backgroundColor: "#FF4D001A", color: "#FF4D00" }}>Pricing</span>
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-3" style={{ color: "#1E3A8A" }}>Simple, transparent pricing</h1>
          <p className="text-base text-gray-500 mb-6">Credits are generous. Storage is real. No surprise bills.</p>
          <div className="inline-flex items-center rounded-full border border-gray-200 bg-gray-50 p-1">
            {(["monthly", "annual"] as const).map((b) => (
              <button key={b} onClick={() => setBilling(b)} className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${billing === b ? "bg-white shadow text-gray-900" : "text-gray-500 hover:text-gray-700"}`}>
                {b === "monthly" ? "Monthly" : "Annual — save 17%"}
              </button>
            ))}
          </div>
        </div>
      </section>
      <section className="pb-12 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {tiers.map((t) => (
            <div key={t.name} className={`rounded-2xl p-6 relative flex flex-col ${t.highlight ? "border-2 border-[#FF4D00] bg-white shadow-xl" : "border border-gray-200 bg-white"}`}>
              {t.highlight && <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[9px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full text-white" style={{ backgroundColor: "#FF4D00" }}>Most popular</span>}
              <div className="mb-auto">
                <h2 className="text-lg font-black text-gray-900 mb-1">{t.name}</h2>
                <p className="text-xs text-gray-500 mb-3">{t.desc}</p>
                <div className="flex items-baseline gap-1 mb-4">
                  {t.price === "Custom" ? (
                    <span className="text-2xl font-black" style={{ color: "#1E3A8A" }}>Custom</span>
                  ) : (
                    <>
                      <span className="text-3xl font-black" style={{ color: "#1E3A8A" }}>{billing === "annual" ? t.annualPrice : t.price}</span>
                      <span className="text-gray-400 text-xs">/mo</span>
                    </>
                  )}
                </div>
                <ul className="space-y-2 mb-5">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-xs text-gray-600">
                      <Check size={12} style={{ color: "#FF4D00" }} className="flex-shrink-0 mt-0.5" />{f}
                    </li>
                  ))}
                </ul>
              </div>
              <Link href={t.href} className={`flex items-center justify-center w-full py-2.5 rounded-full text-sm font-semibold transition-all hover:opacity-90 hover:scale-105 mt-2 ${t.highlight ? "text-white" : "border border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50"}`} style={t.highlight ? { backgroundColor: "#FF4D00" } : {}}>
                {t.cta} {t.price !== "Custom" && <ChevronRight size={14} className="ml-1" />}
              </Link>
            </div>
          ))}
        </div>
      </section>
      <section className="py-20 px-4 sm:px-6 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-black mb-10 text-center" style={{ color: "#1E3A8A" }}>Frequently asked questions</h2>
          <div className="space-y-5">
            {faqs.map((faq) => (
              <div key={faq.q} className="p-5 rounded-xl bg-white border border-gray-100 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-1.5">{faq.q}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
