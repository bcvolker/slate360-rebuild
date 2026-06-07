"use client";

import { motion } from "framer-motion";
import { IconCapture, IconDownload, IconCreditCard } from "@tabler/icons-react";
import {
  MKT_CONTAINER,
  MKT_GLASS_CARD,
  MKT_LABEL,
  MKT_SECTION,
  MKT_SECTION_TITLE,
  MKT_SUBHEAD,
} from "@/app/(public)/_components/marketing-styles";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    step: 1,
    title: "Download free",
    description: "Install Slate360 from the App Store or Google Play on your field devices.",
    icon: IconDownload,
    accentVar: "--graphite-primary" as const,
  },
  {
    step: 2,
    title: "Subscribe on slate360.ai",
    description: "Pick Site Walk, Twin 360, or the bundle. Start your 14-day trial in minutes.",
    icon: IconCreditCard,
    accentVar: "--twin360-blue" as const,
  },
  {
    step: 3,
    title: "Capture & deliver",
    description: "Document sites, build twins, and share branded deliverables with your clients.",
    icon: IconCapture,
    accentVar: "--graphite-primary" as const,
  },
] as const;

export function MarketingHowItWorks() {
  return (
    <section className={cn(MKT_SECTION, "border-t border-white/[0.06] bg-white/[0.015]")}>
      <div className={MKT_CONTAINER}>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-3xl text-center"
        >
          <p className={MKT_LABEL}>How it works</p>
          <h2 className={cn(MKT_SECTION_TITLE, "mt-3")}>From download to deliverable</h2>
          <p className={MKT_SUBHEAD}>Three steps to get your team capturing and sharing in the field.</p>
        </motion.div>

        <div className="mt-12 grid gap-4 md:grid-cols-3 lg:gap-6">
          {STEPS.map((step, index) => (
            <motion.article
              key={step.step}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.45, delay: index * 0.08 }}
              className={cn(MKT_GLASS_CARD, "relative text-center md:text-left")}
            >
              <div
                className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border md:mx-0"
                style={{
                  borderColor: `color-mix(in srgb, var(${step.accentVar}) 30%, transparent)`,
                  backgroundColor: `color-mix(in srgb, var(${step.accentVar}) 10%, transparent)`,
                  color: `var(${step.accentVar})`,
                }}
              >
                <step.icon size={24} stroke={1.75} />
              </div>
              <p className={MKT_LABEL}>Step {step.step}</p>
              <h3 className="mt-2 text-lg font-bold text-[var(--graphite-text-header)]">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--graphite-muted)]">{step.description}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}
