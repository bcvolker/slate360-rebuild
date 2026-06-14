"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { IconCheck } from "@tabler/icons-react";
import { PhoneCaptureMock } from "@/components/marketing/PhoneCaptureMock";
import {
  MARKETING_APPS,
  MARKETING_DELIVERABLE_STRIP,
} from "@/lib/marketing/homepage-content";
import {
  MKT_CONTAINER,
  MKT_LABEL,
  MKT_SECTION,
  MKT_SECTION_TITLE,
  MKT_SUBHEAD,
} from "@/app/(public)/_components/marketing-styles";
import { cn } from "@/lib/utils";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.55 },
} as const;

/** Per-app panels — one entry in MARKETING_APPS = one full panel. */
export function MarketingApps() {
  return (
    <section id="apps" className={cn(MKT_SECTION, "border-t border-white/[0.06]")}>
      <div className={MKT_CONTAINER}>
        <motion.div {...fadeUp} className="mx-auto max-w-3xl text-center">
          <p className={MKT_LABEL}>Two independent apps</p>
          <h2 className={cn(MKT_SECTION_TITLE, "mt-3")}>Use one. Or use both together.</h2>
          <p className={MKT_SUBHEAD}>
            Each app stands on its own with its own plans — and they share projects and files when
            you run them side by side.
          </p>
        </motion.div>

        <div className="mt-14 flex flex-col gap-20 lg:gap-24">
          {MARKETING_APPS.map((app, index) => {
            const accent = `var(${app.accentVar})`;
            const reversed = index % 2 === 1;
            return (
              <motion.article
                key={app.id}
                {...fadeUp}
                className={cn(
                  "grid items-center gap-10 lg:grid-cols-2 lg:gap-14",
                )}
                aria-label={app.name}
              >
                <div className={cn("min-w-0", reversed && "lg:order-2")}>
                  <p className={MKT_LABEL} style={{ color: accent }}>
                    {app.name}
                  </p>
                  <h3 className="mt-2 text-3xl font-bold tracking-tight text-[var(--graphite-text-header)] sm:text-4xl">
                    {app.headline}
                  </h3>
                  <p className="mt-4 text-base leading-relaxed text-[var(--graphite-muted)] sm:text-lg">
                    {app.subhead}
                  </p>

                  <ul className="mt-7 flex flex-col gap-4">
                    {app.capabilities.map((cap) => (
                      <li key={cap.title} className="flex items-start gap-3">
                        <span
                          className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg"
                          style={{
                            backgroundColor: `color-mix(in srgb, ${accent} 16%, transparent)`,
                            color: accent,
                          }}
                          aria-hidden
                        >
                          <IconCheck size={14} stroke={2.5} />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-[var(--graphite-text-header)]">
                            {cap.title}
                          </p>
                          <p className="mt-0.5 text-sm leading-relaxed text-[var(--graphite-muted)]">
                            {cap.description}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={app.cta.href}
                    className="mt-8 inline-flex items-center justify-center rounded-xl px-6 py-3.5 text-sm font-bold text-[var(--graphite-canvas)] transition-all hover:brightness-110 active:scale-[0.99]"
                    style={{ backgroundColor: accent }}
                  >
                    {app.cta.label}
                  </Link>
                </div>

                <div className={cn("min-w-0", reversed && "lg:order-1")}>
                  <PhoneCaptureMock
                    image={app.id === "twin-360" ? "/mock/twin.jpg" : "/mock/sitewalk.jpg"}
                    variant={app.id === "twin-360" ? "twin" : "sitewalk"}
                    accentVar={app.accentVar}
                    label={app.demoLabel}
                  />
                </div>
              </motion.article>
            );
          })}
        </div>

        {/* Send a link, not an attachment */}
        <motion.div {...fadeUp} className="mt-24">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className={MKT_SECTION_TITLE}>{MARKETING_DELIVERABLE_STRIP.title}</h2>
            <p className={MKT_SUBHEAD}>
              Deliverables from both apps are interactive — clients explore them live in a browser,
              not in a PDF attachment.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            {MARKETING_DELIVERABLE_STRIP.steps.map((step, i) => (
              <div
                key={step.title}
                className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center"
              >
                <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-r from-[var(--graphite-primary)] to-[var(--twin360-blue)] text-sm font-bold text-[var(--graphite-canvas)]">
                  {i + 1}
                </span>
                <p className="mt-4 text-base font-bold text-[var(--graphite-text-header)]">
                  {step.title}
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-[var(--graphite-muted)]">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
