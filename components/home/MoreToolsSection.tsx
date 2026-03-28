"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { moreTools } from "./home-data";

export default function MoreToolsSection() {
  return (
    <section className="py-24 px-4 sm:px-6 bg-gray-100/80">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-zinc-900">
            More powerful tools
          </h2>
          <p className="text-gray-500 mt-4 text-lg max-w-xl mx-auto">
            Everything else that makes Slate360 the most complete platform for
            professionals who build.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {moreTools.map((t) => (
            <div
              key={t.title}
              className="group p-6 rounded-2xl border border-gray-200 bg-white hover:border-gray-300 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                style={{ backgroundColor: "#FF4D001A", color: "#FF4D00" }}
              >
                {t.icon}
              </div>
              <h3 className="text-base font-bold text-gray-900 mb-2 group-hover:text-[#FF4D00] transition-colors">
                {t.title}
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed">{t.desc}</p>
              {t.href && (
                <Link
                  href={t.href}
                  className="inline-flex items-center gap-1 text-sm font-semibold mt-3 transition-all group-hover:gap-2"
                  style={{ color: "#FF4D00" }}
                >
                  Learn more <ArrowRight size={14} />
                </Link>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
