"use client";

import { motion } from "framer-motion";
import { IconLink } from "@tabler/icons-react";
import { SLATE360_APPS, SYNERGY_TILE } from "@/lib/apps-config";
import {
  MKT_CONTAINER,
  MKT_GLASS_CARD,
  MKT_LABEL,
  MKT_SECTION,
  MKT_SECTION_TITLE,
  MKT_SUBHEAD,
} from "@/app/(public)/_components/marketing-styles";
import { cn } from "@/lib/utils";

export function MarketingSalesTiles() {
  return (
    <section className={MKT_SECTION}>
      <div className={MKT_CONTAINER}>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-3xl text-center"
        >
          <p className={MKT_LABEL}>Built for the field and the office</p>
          <h2 className={cn(MKT_SECTION_TITLE, "mt-3")}>What each app delivers</h2>
          <p className={MKT_SUBHEAD}>
            Two focused apps with a shared project layer — subscribe to one or both.
          </p>
        </motion.div>

        <div className="mt-12 space-y-12 lg:mt-16">
          {SLATE360_APPS.map((app, appIndex) => (
            <motion.div
              key={app.id}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.45, delay: appIndex * 0.08 }}
            >
              <div className="mb-5 flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl border"
                  style={{
                    borderColor: `color-mix(in srgb, var(${app.accentVar}) 30%, transparent)`,
                    backgroundColor: `color-mix(in srgb, var(${app.accentVar}) 10%, transparent)`,
                    color: `var(${app.accentVar})`,
                  }}
                >
                  <app.icon size={20} stroke={1.75} />
                </div>
                <div>
                  <p className={MKT_LABEL}>{app.name}</p>
                  <p className="text-sm text-[var(--graphite-muted)]">{app.tagline}</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:gap-6">
                {app.salesTiles.map((tile) => (
                  <article
                    key={tile.title}
                    className={cn(MKT_GLASS_CARD, "transition-colors hover:bg-white/[0.06]")}
                    style={{
                      borderColor: `color-mix(in srgb, var(${app.accentVar}) 18%, transparent)`,
                    }}
                  >
                    <h3 className="text-lg font-bold text-[var(--graphite-text-header)]">{tile.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed text-[var(--graphite-muted)]">{tile.description}</p>
                  </article>
                ))}
              </div>
            </motion.div>
          ))}

          <motion.article
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.45 }}
            className={cn(
              MKT_GLASS_CARD,
              "border-[color-mix(in_srgb,var(--graphite-primary)_20%,transparent)] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--graphite-primary)_6%,transparent),color-mix(in_srgb,var(--twin360-blue)_6%,transparent))]",
            )}
          >
            <div className="flex items-start gap-4">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]"
                style={{ color: "var(--graphite-primary)" }}
              >
                <IconLink size={24} stroke={1.75} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-[var(--graphite-text-header)]">{SYNERGY_TILE.title}</h3>
                <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[var(--graphite-muted)] lg:text-base">
                  {SYNERGY_TILE.description}
                </p>
              </div>
            </div>
          </motion.article>
        </div>
      </div>
    </section>
  );
}
