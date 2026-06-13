"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import { IconChevronDown } from "@tabler/icons-react";
import { MARKETING_FAQ } from "@/lib/marketing/homepage-content";
import {
  MKT_BTN_PRIMARY,
  MKT_CONTAINER,
  MKT_LABEL,
  MKT_SECTION,
  MKT_SECTION_TITLE,
} from "@/app/(public)/_components/marketing-styles";
import { cn } from "@/lib/utils";

export function MarketingFaq() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section id="faq" className={cn(MKT_SECTION, "border-t border-white/[0.06]")}>
      <div className={cn(MKT_CONTAINER, "grid items-start gap-10 lg:grid-cols-[1fr_1.2fr] lg:gap-14")}>
        {/* CTA card */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.55 }}
          className="flex flex-col items-start justify-center rounded-3xl border border-white/10 p-8 sm:p-10"
          style={{
            background:
              "linear-gradient(135deg, color-mix(in srgb, var(--graphite-primary) 14%, var(--graphite-canvas)), color-mix(in srgb, var(--twin360-blue) 14%, var(--graphite-canvas)))",
          }}
        >
          <h2 className="text-3xl font-bold leading-tight tracking-tight text-[var(--graphite-text-header)] sm:text-4xl">
            Your next walk
            <br />
            could be the demo.
          </h2>
          <p className="mt-4 text-base leading-relaxed text-[var(--graphite-muted)]">
            Start free, walk one job, and send your first interactive deliverable today.
          </p>
          <Link
            href="/signup"
            className={cn(
              MKT_BTN_PRIMARY,
              "mt-8 bg-[var(--graphite-text-header)] text-[var(--graphite-canvas)] hover:brightness-95",
            )}
          >
            Start free
          </Link>
        </motion.div>

        {/* FAQ accordion */}
        <div>
          <p className={MKT_LABEL}>Questions</p>
          <h2 className={cn(MKT_SECTION_TITLE, "mt-3")}>The short answers</h2>
          <div className="mt-7 flex flex-col gap-3">
            {MARKETING_FAQ.map((item, index) => {
              const open = openIndex === index;
              return (
                <div
                  key={item.q}
                  className={cn(
                    "rounded-2xl border bg-white/[0.02] transition-colors",
                    open ? "border-white/20" : "border-white/10 hover:border-white/15",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => setOpenIndex(open ? null : index)}
                    aria-expanded={open}
                    className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                  >
                    <span className="text-sm font-semibold text-[var(--graphite-text-header)]">
                      {item.q}
                    </span>
                    <IconChevronDown
                      size={18}
                      className={cn(
                        "shrink-0 text-[var(--graphite-muted)] transition-transform",
                        open && "rotate-180",
                      )}
                    />
                  </button>
                  {open ? (
                    <p className="px-5 pb-5 text-sm leading-relaxed text-[var(--graphite-muted)]">
                      {item.a}
                    </p>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
