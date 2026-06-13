"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
import { MARKETING_HERO } from "@/lib/marketing/homepage-content";
import {
  MKT_BTN_GHOST,
  MKT_BTN_PRIMARY,
  MKT_CONTAINER,
  MKT_HEADING,
  MKT_SECTION,
  MKT_SUBHEAD,
} from "@/app/(public)/_components/marketing-styles";
import { cn } from "@/lib/utils";

/**
 * Reality → Twin scene. mode="line" renders the jobsite as quiet line work;
 * mode="points" renders the same geometry as a glowing capture point cloud.
 * Placeholder art until cleared real twins replace it — same mask mechanic.
 */
function SiteScene({ mode }: { mode: "line" | "points" }) {
  const isPoints = mode === "points";
  const stroke = isPoints ? "url(#mkt-twin-gradient)" : "color-mix(in srgb, white 16%, transparent)";
  const strokeWidth = isPoints ? 2.2 : 1.4;
  const dash = isPoints ? "0.5 7" : undefined;

  // Simple skyline: warehouse, mid-rise, tower crane, low building.
  const paths = [
    "M20 300 L20 200 L150 200 L150 300", // warehouse
    "M40 200 L85 165 L130 200", // warehouse roof
    "M180 300 L180 120 L290 120 L290 300", // mid-rise
    "M200 145 H270 M200 175 H270 M200 205 H270 M200 235 H270 M200 265 H270", // floors
    "M340 300 L340 90 L350 90 L350 300", // crane mast
    "M345 90 L480 110 M345 90 L300 120", // crane jib + counter
    "M440 116 L440 170", // crane cable
    "M520 300 L520 210 L660 210 L660 300", // low building
    "M520 240 H660 M520 270 H660", // low floors
    "M0 300 H700", // ground
  ];

  return (
    <svg
      viewBox="0 0 700 320"
      className="h-full w-full"
      preserveAspectRatio="xMidYMax meet"
      aria-hidden
    >
      <defs>
        <linearGradient id="mkt-twin-gradient" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--graphite-primary)" />
          <stop offset="100%" stopColor="var(--twin360-blue)" />
        </linearGradient>
      </defs>
      {paths.map((d) => (
        <path
          key={d}
          d={d}
          fill="none"
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={dash}
        />
      ))}
      {isPoints
        ? [
            [60, 230], [110, 250], [230, 160], [255, 250], [345, 130], [430, 150],
            [560, 230], [620, 260], [90, 280], [200, 285], [470, 280], [600, 285],
          ].map(([x, y]) => (
            <circle key={`${x}-${y}`} cx={x} cy={y} r={2.4} fill="url(#mkt-twin-gradient)" opacity={0.9} />
          ))
        : null}
    </svg>
  );
}

function useSpotlight() {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
  }, []);

  const onMove = useCallback((clientX: number, clientY: number) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mkt-x", `${((clientX - rect.left) / rect.width) * 100}%`);
    el.style.setProperty("--mkt-y", `${((clientY - rect.top) / rect.height) * 100}%`);
  }, []);

  return { ref, active, setActive, reduced, onMove };
}

export function MarketingHero() {
  const spot = useSpotlight();

  return (
    <section className={cn(MKT_SECTION, "overflow-hidden pt-28 lg:pt-36")}>
      <div className={cn(MKT_CONTAINER, "relative z-10 text-center")}>
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-sm font-semibold uppercase tracking-[0.2em] text-[var(--graphite-muted)]"
        >
          {MARKETING_HERO.eyebrow}
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.08 }}
          className={cn(MKT_HEADING, "mt-4")}
        >
          {MARKETING_HERO.titleLine1}
          <br />
          <span className="bg-gradient-to-r from-[var(--graphite-primary)] to-[var(--twin360-blue)] bg-clip-text text-transparent">
            {MARKETING_HERO.titleLine2}
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.16 }}
          className={cn(MKT_SUBHEAD, "mx-auto max-w-3xl")}
        >
          {MARKETING_HERO.subhead}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.24 }}
          className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:flex-wrap"
        >
          <Link
            href={MARKETING_HERO.primaryCta.href}
            className={cn(
              MKT_BTN_PRIMARY,
              "w-full sm:w-auto",
              "bg-[var(--graphite-primary)] text-[var(--graphite-canvas)] hover:brightness-110",
            )}
          >
            {MARKETING_HERO.primaryCta.label}
          </Link>
          <Link href={MARKETING_HERO.secondaryCta.href} className={cn(MKT_BTN_GHOST, "w-full sm:w-auto")}>
            {MARKETING_HERO.secondaryCta.label}
          </Link>
        </motion.div>

        {/* Reality → Twin spotlight reveal */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.34 }}
          className="relative mx-auto mt-14 max-w-4xl"
        >
          <div
            ref={spot.ref}
            className="relative h-[240px] w-full overflow-hidden rounded-2xl border border-white/10 bg-[color-mix(in_srgb,white_3%,var(--graphite-canvas))] sm:h-[320px]"
            style={{ ["--mkt-x" as string]: "50%", ["--mkt-y" as string]: "55%" }}
            onPointerMove={(e) => {
              spot.setActive(true);
              spot.onMove(e.clientX, e.clientY);
            }}
            onPointerLeave={() => spot.setActive(false)}
            onTouchMove={(e) => {
              const t = e.touches[0];
              if (t) {
                spot.setActive(true);
                spot.onMove(t.clientX, t.clientY);
              }
            }}
            aria-label="Move across the scene to reveal the digital twin"
            role="img"
          >
            {/* Base: reality as line work */}
            <div className="absolute inset-0 p-6 sm:p-8">
              <SiteScene mode="line" />
            </div>

            {/* Reveal: the twin point cloud through the spotlight */}
            <div
              className={cn(
                "absolute inset-0 p-6 sm:p-8",
                !spot.active && !spot.reduced && "mkt-hero-sweep",
              )}
              style={
                spot.reduced
                  ? { opacity: 0.85 }
                  : {
                      WebkitMaskImage:
                        "radial-gradient(circle 200px at var(--mkt-x) var(--mkt-y), black 0% 55%, transparent 78%)",
                      maskImage:
                        "radial-gradient(circle 200px at var(--mkt-x) var(--mkt-y), black 0% 55%, transparent 78%)",
                    }
              }
            >
              <SiteScene mode="points" />
            </div>

            <p className="pointer-events-none absolute bottom-3 left-1/2 w-max -translate-x-1/2 rounded-full border border-white/10 bg-[color-mix(in_srgb,var(--graphite-canvas)_80%,transparent)] px-3 py-1 text-[11px] font-medium text-[var(--graphite-muted)] backdrop-blur-md">
            {typeof window !== "undefined" && "ontouchstart" in window
                ? "Drag to reveal the twin"
                : "Move your cursor to reveal the twin"}
            </p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.44 }}
          className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center"
        >
          <a href="/install" aria-label="Download on the App Store">
            <Image src="/uploads/app-store-badge.svg" alt="Download on the App Store" width={140} height={42} className="h-10 w-auto" />
          </a>
          <a href="/install" aria-label="Get it on Google Play">
            <Image src="/uploads/google-play-badge.svg" alt="Get it on Google Play" width={155} height={46} className="h-10 w-auto" />
          </a>
        </motion.div>
      </div>
    </section>
  );
}
