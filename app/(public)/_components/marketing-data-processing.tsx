"use client";

import { motion } from "framer-motion";
import { IconDatabase, IconStack2 } from "@tabler/icons-react";
import { CREDIT_EQUIVALENCE_NOTE, DATA_PROCESSING_POINTS } from "@/lib/marketing/pricing-config";
import {
  MKT_CONTAINER,
  MKT_GLASS_CARD,
  MKT_LABEL,
  MKT_SECTION,
  MKT_SECTION_TITLE,
  MKT_SUBHEAD,
} from "@/app/(public)/_components/marketing-styles";
import { cn } from "@/lib/utils";

export function MarketingDataProcessing() {
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
          <p className={MKT_LABEL}>Data & processing</p>
          <h2 className={cn(MKT_SECTION_TITLE, "mt-3")}>Credits and storage, explained</h2>
          <p className={MKT_SUBHEAD}>
            Included allotments reset each billing cycle. Add capacity when your portfolio grows.
          </p>
        </motion.div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {DATA_PROCESSING_POINTS.map((point, index) => (
            <motion.article
              key={point}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{ duration: 0.4, delay: index * 0.06 }}
              className={MKT_GLASS_CARD}
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-[var(--twin360-blue)]">
                {index < 2 ? <IconStack2 size={20} stroke={1.75} /> : <IconDatabase size={20} stroke={1.75} />}
              </div>
              <p className="text-sm font-semibold text-[var(--graphite-text-header)]">{point}</p>
            </motion.article>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mt-8 text-center text-sm text-[var(--graphite-muted)]"
        >
          {CREDIT_EQUIVALENCE_NOTE}
        </motion.p>
      </div>
    </section>
  );
}
