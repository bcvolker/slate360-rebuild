"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useMemo, useState } from "react";
import {
  CONTENT_MODES,
  SLATE360_APPS,
  type AppAccentVar,
  type ContentModeId,
} from "@/lib/apps-config";
import {
  MKT_CONTAINER,
  MKT_GLASS_CARD,
  MKT_LABEL,
  MKT_SECTION,
  MKT_SECTION_TITLE,
  MKT_SUBHEAD,
} from "@/app/(public)/_components/marketing-styles";
import { cn } from "@/lib/utils";

function accentButtonStyle(
  accentVar: AppAccentVar,
  active: boolean,
): { color?: string; borderColor?: string; backgroundColor?: string } {
  if (!active) return {};
  return {
    borderColor: `color-mix(in srgb, var(${accentVar}) 40%, transparent)`,
    backgroundColor: `color-mix(in srgb, var(${accentVar}) 12%, transparent)`,
    color: `var(${accentVar})`,
  };
}

export function MarketingShowcase() {
  const [activeAppId, setActiveAppId] = useState(SLATE360_APPS[0].id);
  const [activeModeId, setActiveModeId] = useState<ContentModeId>("walkthrough");

  const activeApp = useMemo(
    () => SLATE360_APPS.find((a) => a.id === activeAppId) ?? SLATE360_APPS[0],
    [activeAppId],
  );
  const activeMode = useMemo(
    () => CONTENT_MODES.find((m) => m.id === activeModeId) ?? CONTENT_MODES[0],
    [activeModeId],
  );

  const panelKey = `${activeApp.id}-${activeMode.id}`;

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
          <p className={MKT_LABEL}>Interactive showcase</p>
          <h2 className={cn(MKT_SECTION_TITLE, "mt-3")}>See each app in action</h2>
          <p className={MKT_SUBHEAD}>
            Switch between apps and content modes. Real example media drops into these panels without a
            redesign.
          </p>
        </motion.div>

        <div className="mt-10 flex flex-col gap-6 lg:mt-14">
          <div className="flex flex-wrap justify-center gap-2">
            {SLATE360_APPS.map((app) => {
              const active = app.id === activeAppId;
              return (
                <button
                  key={app.id}
                  type="button"
                  onClick={() => setActiveAppId(app.id)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold transition-all",
                    active ? "" : "text-[var(--graphite-muted)] hover:text-[var(--graphite-text-body)]",
                  )}
                  style={accentButtonStyle(app.accentVar, active)}
                >
                  <app.icon size={18} stroke={1.75} />
                  {app.name}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap justify-center gap-2">
            {CONTENT_MODES.map((mode) => {
              const active = mode.id === activeModeId;
              return (
                <button
                  key={mode.id}
                  type="button"
                  onClick={() => setActiveModeId(mode.id)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg border border-white/[0.08] px-3 py-2 text-xs font-medium transition-all sm:text-sm",
                    active ? "" : "text-[var(--graphite-muted)] hover:text-[var(--graphite-text-body)]",
                  )}
                  style={accentButtonStyle(activeApp.accentVar, active)}
                >
                  <mode.icon size={16} stroke={1.75} />
                  {mode.label}
                </button>
              );
            })}
          </div>

          <div className={cn(MKT_GLASS_CARD, "overflow-hidden p-0")}>
            <AnimatePresence mode="wait">
              <motion.div
                key={panelKey}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35 }}
                className="grid lg:grid-cols-[1fr_320px]"
              >
                <div
                  className="relative flex min-h-[280px] flex-col items-center justify-center border-b border-white/[0.06] p-8 sm:min-h-[360px] lg:min-h-[420px] lg:border-b-0 lg:border-r"
                  style={{
                    background: `linear-gradient(145deg, color-mix(in srgb, var(${activeApp.accentVar}) 8%, var(--graphite-canvas)) 0%, var(--graphite-canvas) 60%)`,
                  }}
                >
                  <div
                    className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border"
                    style={{
                      borderColor: `color-mix(in srgb, var(${activeApp.accentVar}) 30%, transparent)`,
                      backgroundColor: `color-mix(in srgb, var(${activeApp.accentVar}) 10%, transparent)`,
                      color: `var(${activeApp.accentVar})`,
                    }}
                  >
                    <activeMode.icon size={28} stroke={1.5} />
                  </div>
                  <p className="text-lg font-semibold text-[var(--graphite-text-header)]">
                    {activeMode.placeholderLabel}
                  </p>
                  <p className="mt-2 max-w-md text-center text-sm text-[var(--graphite-muted)]">
                    Real example media will be added — {activeApp.name} · {activeMode.label}
                  </p>
                  <div
                    className="mt-8 h-40 w-full max-w-lg rounded-xl border border-dashed sm:h-48"
                    style={{ borderColor: `color-mix(in srgb, var(${activeApp.accentVar}) 25%, transparent)` }}
                    aria-hidden
                  />
                </div>

                <div className="flex flex-col justify-center gap-4 p-6 lg:p-8">
                  <div>
                    <p className={MKT_LABEL}>{activeApp.name}</p>
                    <p className="mt-1 text-lg font-bold text-[var(--graphite-text-header)]">{activeApp.tagline}</p>
                  </div>
                  <ul className="space-y-2 text-sm text-[var(--graphite-muted)]">
                    <li>
                      <span className="font-medium text-[var(--graphite-text-body)]">Mode:</span> {activeMode.label}
                    </li>
                    <li>Placeholder panel — swap in video, panorama, mesh, or photo assets later.</li>
                    <li>Accent re-skins automatically from the selected app.</li>
                  </ul>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
