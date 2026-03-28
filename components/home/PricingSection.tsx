"use client";

import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import { plans } from "./home-data";

export default function PricingSection({
  billing,
  setBilling,
}: {
  billing: "monthly" | "annual";
  setBilling: (b: "monthly" | "annual") => void;
}) {
  return (
    <section className="py-24 px-4 sm:px-6 bg-zinc-100">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-zinc-900">
            Simple, transparent pricing
          </h2>
          <p className="text-gray-500 mt-4 text-lg max-w-lg mx-auto">
            Credits are generous. Storage is real. No surprise bills.
          </p>
          <div className="inline-flex items-center rounded-full border border-gray-200 bg-white p-1 mt-6">
            {(["monthly", "annual"] as const).map((b) => (
              <button
                key={b}
                onClick={() => setBilling(b)}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition-all ${
                  billing === b
                    ? "bg-gray-900 text-white shadow"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {b === "monthly" ? "Monthly" : "Annual (save 17%)"}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`rounded-2xl p-6 relative flex flex-col ${
                plan.highlight
                  ? "border-2 border-[#FF4D00] bg-white shadow-xl"
                  : "border border-gray-200 bg-white"
              }`}
            >
              {plan.highlight && (
                <span
                  className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full text-white"
                  style={{ backgroundColor: "#FF4D00" }}
                >
                  Most popular
                </span>
              )}
              <div className="mb-auto">
                <h3 className="text-lg font-bold text-gray-900 mb-1">
                  {plan.name}
                </h3>
                <p className="text-xs text-gray-500 mb-4">{plan.desc}</p>
                <div className="flex items-baseline gap-1 mb-5">
                  {plan.price === "Custom" ? (
                    <span className="text-3xl font-black text-zinc-800">
                      Custom
                    </span>
                  ) : (
                    <>
                      <span className="text-3xl font-black text-zinc-800">
                        {billing === "annual" ? plan.annualPrice : plan.price}
                      </span>
                      <span className="text-gray-400 text-sm">/mo</span>
                    </>
                  )}
                </div>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-center gap-2 text-sm text-gray-600"
                    >
                      <Check
                        size={14}
                        style={{ color: "#FF4D00" }}
                        className="flex-shrink-0"
                      />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
              <Link
                href={
                  plan.price === "Custom"
                    ? "mailto:hello@slate360.ai"
                    : `/signup?plan=${plan.name.toLowerCase()}&billing=${billing}`
                }
                className={`flex items-center justify-center w-full py-2.5 rounded-full text-sm font-semibold transition-all hover:opacity-90 hover:scale-105 mt-auto ${
                  plan.highlight
                    ? "text-white"
                    : "border border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50"
                }`}
                style={plan.highlight ? { backgroundColor: "#FF4D00" } : {}}
              >
                {plan.price === "Custom" ? "Contact us" : "Start free trial"}
              </Link>
            </div>
          ))}
        </div>
        <div className="text-center mt-8">
          <Link
            href="/plans"
            className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-[#FF4D00] transition-colors"
          >
            See full pricing & Enterprise <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
}
