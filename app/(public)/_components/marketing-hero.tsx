"use client";

import Image from "next/image";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { SLATE360_APPS } from "@/lib/apps-config";
import {
  MKT_BTN_GHOST,
  MKT_BTN_PRIMARY,
  MKT_CONTAINER,
  MKT_HEADING,
  MKT_SECTION,
  MKT_SUBHEAD,
} from "@/app/(public)/_components/marketing-styles";
import { cn } from "@/lib/utils";

const APP_NAMES = SLATE360_APPS.map((a) => a.name).join(" and ");

export function MarketingHero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const glowY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const contentY = useTransform(scrollYProgress, [0, 1], [0, 80]);

  return (
    <section ref={ref} className={cn(MKT_SECTION, "overflow-hidden pt-28 lg:pt-36")}>
      <motion.div
        style={{ y: glowY }}
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/3 h-[min(800px,90vw)] w-[min(800px,90vw)] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-40"
      >
        <div
          className="h-full w-full rounded-full blur-[120px]"
          style={{
            background:
              "radial-gradient(circle, color-mix(in srgb, var(--graphite-primary) 18%, transparent) 0%, color-mix(in srgb, var(--twin360-blue) 14%, transparent) 55%, transparent 75%)",
          }}
        />
      </motion.div>

      <motion.div style={{ y: contentY }} className={cn(MKT_CONTAINER, "relative z-10 text-center")}>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--graphite-muted)]"
        >
          Slate360 Platform
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.08 }}
          className={cn(MKT_HEADING, "mt-4")}
        >
          One platform.
          <br />
          Two powerful apps.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.16 }}
          className={cn(MKT_SUBHEAD, "mx-auto max-w-3xl")}
        >
          {APP_NAMES} share projects, permissions, and deliverables — field documentation and spatial
          reality capture in one Graphite Glass workspace.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.24 }}
          className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap"
        >
          <Link
            href="/signup"
            className={cn(
              MKT_BTN_PRIMARY,
              "w-full sm:w-auto",
              "bg-[var(--graphite-primary)] text-[var(--graphite-canvas)] hover:brightness-110",
            )}
          >
            Start free trial
          </Link>
          <Link href="#pricing" className={cn(MKT_BTN_GHOST, "w-full sm:w-auto")}>
            See pricing
          </Link>
          <Link href="/contact" className={cn(MKT_BTN_GHOST, "w-full sm:w-auto")}>
            Book a demo
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.32 }}
          className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
        >
          <a href="/install" aria-label="Download on the App Store">
            <Image src="/uploads/app-store-badge.svg" alt="Download on the App Store" width={140} height={42} className="h-10 w-auto" />
          </a>
          <a href="/install" aria-label="Get it on Google Play">
            <Image src="/uploads/google-play-badge.svg" alt="Get it on Google Play" width={155} height={46} className="h-10 w-auto" />
          </a>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mx-auto mt-12 max-w-xl rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-5"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--graphite-muted)]">
            Social proof
          </p>
          <p className="mt-2 text-sm text-[var(--graphite-muted)]">
            Customer logos and testimonials will appear here.
          </p>
        </motion.div>
      </motion.div>
    </section>
  );
}
