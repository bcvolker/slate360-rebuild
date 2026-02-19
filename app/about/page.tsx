import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

const values = [
  {
    title: "Speed Without Compromise",
    body: "We believe great content shouldn't take days. SLATE360 eliminates the friction between capturing a moment and sharing it with the world.",
  },
  {
    title: "Built for the Field",
    body: "Every feature is designed by people who understand sports — the chaos of gameday, the pressure of deadlines, and the value of a perfect shot.",
  },
  {
    title: "No Gatekeeping",
    body: "Professional tools shouldn't be locked behind agency retainers or 6-figure budgets. SLATE360 levels the field.",
  },
];

export default function AboutPage() {
  return (
    <div className="bg-black min-h-screen text-white">
      <Navbar />

      {/* Hero */}
      <section className="pt-36 pb-20 px-6 md:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <span
            className="text-xs font-semibold uppercase tracking-widest"
            style={{ color: "#FF4D00" }}
          >
            Our Story
          </span>
          <h1 className="mt-4 text-5xl md:text-7xl font-black tracking-tight">
            We built the platform we{" "}
            <span style={{ color: "#FF4D00" }}>always needed.</span>
          </h1>
          <p className="mt-6 text-white/50 text-xl leading-relaxed max-w-2xl mx-auto">
            SLATE360 was born from frustration. Too many great sports moments
            got buried in workflow — shuttling files between clunky tools,
            waiting on agencies, missing the moment. We changed that.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="py-24 px-6 md:px-8 bg-zinc-950/50">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-4xl md:text-5xl font-bold leading-tight">
              Our mission is to give every team a world-class media operation.
            </h2>
          </div>
          <div>
            <p className="text-white/50 text-lg leading-relaxed">
              Sports is one of the most content-hungry industries on the planet.
              Yet most teams — even at high levels — are cobbling together
              consumer apps and manual processes. SLATE360 gives any organization
              the infrastructure to operate like a broadcast network, at a price
              that makes sense.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-24 px-6 md:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold mb-12 text-center">
            What we stand for
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {values.map((v) => (
              <div
                key={v.title}
                className="p-8 rounded-2xl border border-white/10 bg-white/[0.02]"
              >
                <h3
                  className="text-lg font-semibold mb-4"
                  style={{ color: "#FF4D00" }}
                >
                  {v.title}
                </h3>
                <p className="text-white/50 text-sm leading-relaxed">{v.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 md:px-8 text-center">
        <h2 className="text-4xl font-black mb-6">
          Ready to see what SLATE360 can do?
        </h2>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link
            href="/plans"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full font-semibold text-base transition-all duration-200 hover:opacity-90"
            style={{ backgroundColor: "#FF4D00", color: "#fff" }}
          >
            Start Free Trial
            <ChevronRight size={16} />
          </Link>
          <Link
            href="/features"
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-full font-semibold text-base border border-white/20 hover:border-white/40 hover:bg-white/5 transition-all duration-200"
          >
            Explore Features
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
