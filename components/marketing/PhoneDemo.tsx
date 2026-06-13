"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import type { DemoStep } from "@/lib/marketing/homepage-content";

type Props = {
  steps: DemoStep[];
  accentVar: "--graphite-primary" | "--twin360-blue";
  label: string;
};

const STEP_MS = 3200;

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return reduced;
}

/**
 * Auto-playing in-phone walkthrough of real app screenshots with a tap
 * indicator. Pauses on hover/press; dots scrub; static under reduced motion.
 */
export function PhoneDemo({ steps, accentVar, label }: Props) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduced = usePrefersReducedMotion();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (reduced || paused || steps.length < 2) return;
    timerRef.current = setInterval(() => {
      setIndex((value) => (value + 1) % steps.length);
    }, STEP_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [paused, reduced, steps.length]);

  const step = steps[index]!;
  const accent = `var(${accentVar})`;

  return (
    <figure
      className="mx-auto flex w-full max-w-[300px] flex-col items-center gap-4"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onTouchEnd={() => setPaused(false)}
      aria-label={label}
    >
      {/* Device frame */}
      <div
        className="relative w-full overflow-hidden rounded-[2.2rem] border-[6px] border-[#1A222C] bg-black"
        style={{ aspectRatio: "390 / 844", boxShadow: `0 0 0 1px color-mix(in srgb, ${accent} 30%, transparent)` }}
      >
        {/* Notch */}
        <div className="absolute left-1/2 top-1.5 z-20 h-5 w-24 -translate-x-1/2 rounded-full bg-[#1A222C]" aria-hidden />

        {steps.map((s, i) => (
          <Image
            key={s.image}
            src={s.image}
            alt={i === index ? s.caption : ""}
            fill
            sizes="300px"
            className="object-cover transition-opacity duration-500"
            style={{ opacity: i === index ? 1 : 0 }}
            priority={i === 0}
          />
        ))}

        {/* Tap ripple */}
        {!reduced ? (
          <span
            key={index}
            className="pointer-events-none absolute z-10 block h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              left: `${step.tapX}%`,
              top: `${step.tapY}%`,
              border: `2px solid ${accent}`,
              animation: "mkt-tap 1.4s ease-out infinite",
            }}
            aria-hidden
          />
        ) : null}
      </div>

      {/* Caption + step dots */}
      <figcaption className="flex w-full flex-col items-center gap-2.5">
        <p className="min-h-10 text-center text-sm font-medium text-[var(--graphite-text-body)]">
          {step.caption}
        </p>
        <div className="flex items-center gap-2" role="tablist" aria-label="Demo steps">
          {steps.map((s, i) => (
            <button
              key={s.image}
              type="button"
              role="tab"
              aria-selected={i === index}
              aria-label={`Step ${i + 1}`}
              onClick={() => setIndex(i)}
              className="h-2 rounded-full transition-all"
              style={{
                width: i === index ? 20 : 8,
                backgroundColor:
                  i === index ? accent : "color-mix(in srgb, white 22%, transparent)",
              }}
            />
          ))}
        </div>
      </figcaption>

    </figure>
  );
}
