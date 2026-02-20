"use client";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { ChevronRight } from "lucide-react";

const values = [
  { title: "Built for the Field", body: "Every feature is designed by people who understand construction — the chaos of job sites, the weight of deadlines, and the value of a single source of truth." },
  { title: "Elegant, Not Complicated", body: "Professional-grade tools do not have to be hard to use. Slate360 delivers depth without friction — clean design that gets out of your way." },
  { title: "One Platform, Every Phase", body: "From preconstruction modeling to final project closeout, Slate360 stays with your team through every phase without forcing you to switch tools." },
];

export default function AboutPage() {
  return (
    <div className="bg-white min-h-screen text-gray-900 antialiased">
      <Navbar />
      <section className="pt-32 pb-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block text-xs font-semibold uppercase tracking-widest px-3 py-1.5 rounded-full mb-6" style={{ backgroundColor: "#1E3A8A1A", color: "#1E3A8A" }}>Our story</span>
          <h1 className="text-5xl sm:text-6xl font-black tracking-tight mb-6" style={{ color: "#1E3A8A" }}>About Slate360</h1>
          <p className="text-xl text-gray-500 leading-relaxed max-w-2xl mx-auto">
            We built Slate360 because construction projects deserve better tools. Not spreadsheets, not siloed apps, not expensive platforms designed for consultants rather than crews.
          </p>
        </div>
      </section>
      <section className="py-20 px-4 sm:px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-black mb-10" style={{ color: "#1E3A8A" }}>What we stand for</h2>
          <div className="space-y-6">
            {values.map((v) => (
              <div key={v.title} className="p-6 rounded-2xl bg-white border border-gray-100 shadow-sm">
                <h3 className="text-lg font-bold text-gray-900 mb-2">{v.title}</h3>
                <p className="text-gray-500 leading-relaxed">{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="py-20 px-4 sm:px-6 text-white text-center" style={{ backgroundColor: "#1E3A8A" }}>
        <div className="max-w-xl mx-auto">
          <h2 className="text-3xl font-black mb-4">Ready to see it in action?</h2>
          <p className="text-blue-200 mb-8">Start your free trial — no credit card required.</p>
          <Link href="/signup" className="inline-flex items-center gap-2 px-8 py-4 rounded-full font-semibold text-white transition-all hover:opacity-90 hover:scale-105" style={{ backgroundColor: "#FF4D00" }}>
            Start free trial <ChevronRight size={16} />
          </Link>
        </div>
      </section>
      <Footer />
    </div>
  );
}
