"use client";

/**
 * Palette Lab — /palette-lab
 *
 * Live palette switcher + effects sandbox for picking the new Slate360 palette.
 * Renders representative UI (header, cards, buttons, badges, glow, gradients,
 * glass, opacity ladders, text treatments) so each option can be evaluated in
 * context against the dark canvas before we commit to a global swap.
 */

import { useMemo, useState } from "react";
import {
  ArrowRight,
  Bell,
  Compass,
  FileText,
  FolderKanban,
  LayoutDashboard,
  MapPin,
  Palette as PaletteIcon,
  Search,
  Settings,
  Sparkles,
} from "lucide-react";

interface Palette {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  description: string;
}

const PALETTES: Palette[] = [
  { id: "cobalt-steel",     name: "Cobalt + Steel",        primary: "#3B82F6", secondary: "#94A3B8", description: "Enterprise-grade. Bentley/Autodesk territory." },
  { id: "indigo-sky",       name: "Electric Indigo + Sky", primary: "#6366F1", secondary: "#38BDF8", description: "Linear/Vercel. Modern SaaS premium." },
  { id: "emerald-slate",    name: "Emerald + Slate",       primary: "#10B981", secondary: "#64748B", description: "Procore/Buildertrend. Construction-coded." },
  { id: "royal-gold",       name: "Royal + Gold-leaf",     primary: "#4338CA", secondary: "#F59E0B", description: "Royal gravitas with gold heritage accent." },
  { id: "cyan-graphite",    name: "Cyan + Graphite",       primary: "#22D3EE", secondary: "#475569", description: "Bluebeam/Trimble. Blueprint-coded." },
  { id: "sapphire-coral",   name: "Sapphire + Coral",      primary: "#1D4ED8", secondary: "#FB7185", description: "Bold contrast, alert-friendly secondary." },
  { id: "forest-sand",      name: "Forest + Sand",         primary: "#16A34A", secondary: "#D6BA8A", description: "Earthy. Trades + tech." },
  { id: "plum-champagne",   name: "Plum + Champagne",      primary: "#7C3AED", secondary: "#E5C07B", description: "Boutique design firm. Distinctive." },
  { id: "crimson-pewter",   name: "Crimson + Pewter",      primary: "#DC2626", secondary: "#9CA3AF", description: "Heavy-industry. Bechtel/Kiewit energy." },
  { id: "deepteal-lime",    name: "Deep Teal-Navy + Lime", primary: "#0F766E", secondary: "#84CC16", description: "Engineering software. Energy lime accent." },
];

const PAGE_BG = "#0B0F15";
const CARD_BG = "#151A23";
const BORDER = "rgba(255,255,255,0.06)";

// Build a translucent variant from any hex, e.g. #3B82F6 + 0.20 -> rgba(...).
function withAlpha(hex: string, alpha: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function PaletteLabPage() {
  const [palette, setPalette] = useState<Palette>(PALETTES[0]);

  const tokens = useMemo(() => {
    const p = palette.primary;
    const s = palette.secondary;
    return {
      primary: p,
      secondary: s,
      primarySoft: withAlpha(p, 0.20),
      primaryGlow: withAlpha(p, 0.35),
      secondarySoft: withAlpha(s, 0.20),
      gradient: `linear-gradient(135deg, ${p} 0%, ${s} 100%)`,
    };
  }, [palette]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: PAGE_BG, color: "#E2E8F0" }}>
      {/* Top picker bar */}
      <header
        className="sticky top-0 z-50 backdrop-blur-xl"
        style={{ backgroundColor: `${PAGE_BG}cc`, borderBottom: `1px solid ${BORDER}` }}
      >
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 mr-auto">
            <PaletteIcon className="h-5 w-5" style={{ color: tokens.primary }} />
            <span className="text-sm font-bold tracking-tight">Slate360 Palette Lab</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {PALETTES.map((p) => (
              <button
                key={p.id}
                onClick={() => setPalette(p)}
                className="flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all"
                style={{
                  borderColor: palette.id === p.id ? p.primary : BORDER,
                  backgroundColor: palette.id === p.id ? withAlpha(p.primary, 0.12) : "transparent",
                  color: palette.id === p.id ? "#fff" : "#94A3B8",
                }}
              >
                <span className="flex">
                  <span className="h-3 w-3 rounded-l-sm" style={{ backgroundColor: p.primary }} />
                  <span className="h-3 w-3 rounded-r-sm" style={{ backgroundColor: p.secondary }} />
                </span>
                {p.name}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10 space-y-12">
        {/* Hero readout */}
        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em]" style={{ color: tokens.secondary }}>
            Selected
          </p>
          <h1 className="text-4xl font-bold tracking-tight">
            <span style={{ color: tokens.primary }}>{palette.name.split(" + ")[0]}</span>
            <span style={{ color: "#64748B" }}> + </span>
            <span style={{ color: tokens.secondary }}>{palette.name.split(" + ")[1]}</span>
          </h1>
          <p className="text-sm text-slate-400">{palette.description}</p>
          <div className="flex gap-2 text-xs font-mono">
            <span className="rounded border px-2 py-1" style={{ borderColor: BORDER, color: tokens.primary }}>
              primary {palette.primary}
            </span>
            <span className="rounded border px-2 py-1" style={{ borderColor: BORDER, color: tokens.secondary }}>
              secondary {palette.secondary}
            </span>
          </div>
        </section>

        {/* Mock dashboard header */}
        <Section title="1. Mock Dashboard Header" subtitle="Glass blur, restrained primary, secondary-on-hover">
          <div
            className="rounded-2xl overflow-hidden border"
            style={{ borderColor: BORDER, backgroundColor: CARD_BG }}
          >
            <div
              className="flex items-center gap-4 px-5 py-3 backdrop-blur-xl"
              style={{ backgroundColor: `${PAGE_BG}cc`, borderBottom: `1px solid ${BORDER}` }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="h-8 w-8 rounded-lg flex items-center justify-center text-white font-black text-sm"
                  style={{ background: tokens.gradient, boxShadow: `0 0 18px ${tokens.primaryGlow}` }}
                >
                  S
                </div>
                <span className="text-sm font-bold tracking-tight">Slate360</span>
              </div>
              <div className="flex-1 max-w-md ml-6">
                <div
                  className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs"
                  style={{ backgroundColor: "rgba(255,255,255,0.04)", border: `1px solid ${BORDER}` }}
                >
                  <Search className="h-3.5 w-3.5 text-slate-500" />
                  <span className="text-slate-500">Search projects, files, people</span>
                </div>
              </div>
              <button className="text-slate-400 hover:text-white p-1.5 rounded-lg transition-colors" style={{ ["--hover" as string]: tokens.secondary }}>
                <Bell className="h-4 w-4" />
              </button>
              <button className="text-slate-400 hover:text-white p-1.5 rounded-lg transition-colors">
                <Settings className="h-4 w-4" />
              </button>
              <div
                className="h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ backgroundColor: tokens.primarySoft, color: tokens.primary }}
              >
                BV
              </div>
            </div>
            <div className="p-6 space-y-1">
              <p className="text-xs uppercase tracking-[0.18em]" style={{ color: tokens.secondary }}>
                Slate360 Demo Org
              </p>
              <h2 className="text-2xl font-bold">Command Center</h2>
              <p className="text-sm text-slate-400">Your workspace at a glance</p>
            </div>
          </div>
        </Section>

        {/* Buttons */}
        <Section title="2. Buttons & CTAs" subtitle="Primary fill, primary outline, secondary hover, ghost">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all"
              style={{ backgroundColor: tokens.primary, boxShadow: `0 0 20px ${tokens.primaryGlow}` }}
            >
              Primary CTA
            </button>
            <button
              className="rounded-xl px-4 py-2.5 text-sm font-semibold transition-all border"
              style={{ borderColor: tokens.primary, color: tokens.primary, backgroundColor: tokens.primarySoft }}
            >
              Outline
            </button>
            <button
              className="rounded-xl px-4 py-2.5 text-sm font-semibold transition-all border"
              style={{ borderColor: BORDER, color: "#E2E8F0", backgroundColor: "rgba(255,255,255,0.04)" }}
            >
              Secondary
            </button>
            <button
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-400 hover:text-white transition-all"
            >
              Ghost
            </button>
          </div>
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all"
              style={{ background: tokens.gradient }}
            >
              Gradient CTA
            </button>
            <button
              className="rounded-xl px-4 py-2.5 text-sm font-semibold transition-all border"
              style={{ borderColor: tokens.secondary, color: tokens.secondary, backgroundColor: tokens.secondarySoft }}
            >
              Secondary Outline
            </button>
            <button
              className="rounded-xl px-4 py-2.5 text-sm font-semibold transition-all flex items-center justify-center gap-1.5"
              style={{ backgroundColor: tokens.primary, color: "#fff" }}
            >
              Continue <ArrowRight className="h-3.5 w-3.5" />
            </button>
            <button
              className="rounded-xl px-4 py-2.5 text-sm font-semibold transition-all border"
              style={{ borderColor: BORDER, color: "#94A3B8", backgroundColor: "transparent" }}
            >
              Disabled
            </button>
          </div>
        </Section>

        {/* App cards (matches AppsGrid) */}
        <Section title="3. App Cards" subtitle="Equal-weight, hover-accented, soft-glow icon tile">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { name: "Site Walk", tagline: "Capture context.", icon: MapPin },
              { name: "360 Tours", tagline: "Immersive walkthroughs.", icon: Compass, soon: true },
              { name: "Design Studio", tagline: "2D and 3D review.", icon: PaletteIcon, soon: true },
              { name: "Content Studio", tagline: "Branded media.", icon: FileText, soon: true },
            ].map((app) => {
              const Icon = app.icon;
              return (
                <div
                  key={app.name}
                  className="group relative rounded-2xl border p-4 transition-all hover:-translate-y-0.5 cursor-pointer"
                  style={{
                    borderColor: BORDER,
                    backgroundColor: "rgba(255,255,255,0.02)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = tokens.secondary;
                    e.currentTarget.style.backgroundColor = tokens.secondarySoft;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = BORDER;
                    e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.02)";
                  }}
                >
                  {app.soon && (
                    <span
                      className="absolute right-3 top-3 rounded-full px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wide"
                      style={{ backgroundColor: "rgba(255,255,255,0.04)", color: "#94A3B8", border: `1px solid ${BORDER}` }}
                    >
                      Soon
                    </span>
                  )}
                  <div
                    className="h-11 w-11 rounded-xl flex items-center justify-center mb-3"
                    style={{ backgroundColor: "rgba(255,255,255,0.04)", color: tokens.secondary }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-sm font-semibold text-white mb-0.5">{app.name}</h3>
                  <p className="text-xs text-slate-400">{app.tagline}</p>
                </div>
              );
            })}
          </div>
        </Section>

        {/* Effects */}
        <Section title="4. Effects Sandbox" subtitle="Glow, gradient, glass, mesh — pick what feels Slate360">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <EffectTile label="Soft glow primary" bg={CARD_BG}>
              <div
                className="h-20 w-20 rounded-2xl"
                style={{ backgroundColor: tokens.primary, boxShadow: `0 0 40px ${tokens.primaryGlow}` }}
              />
            </EffectTile>

            <EffectTile label="Gradient orb" bg={CARD_BG}>
              <div
                className="h-20 w-20 rounded-full"
                style={{ background: `radial-gradient(circle at 30% 30%, ${tokens.primary}, ${tokens.secondary} 80%)`, boxShadow: `0 0 60px ${withAlpha(tokens.primary, 0.4)}` }}
              />
            </EffectTile>

            <EffectTile label="Mesh background" bg={CARD_BG}>
              <div
                className="h-20 w-full rounded-xl"
                style={{
                  background: `
                    radial-gradient(at 20% 30%, ${withAlpha(tokens.primary, 0.4)} 0px, transparent 50%),
                    radial-gradient(at 80% 70%, ${withAlpha(tokens.secondary, 0.3)} 0px, transparent 50%)
                  `,
                }}
              />
            </EffectTile>

            <EffectTile label="Glass card" bg={`linear-gradient(135deg, ${tokens.primary} 0%, ${tokens.secondary} 100%)`}>
              <div
                className="rounded-xl px-4 py-3 backdrop-blur-xl border"
                style={{ backgroundColor: "rgba(11,15,21,0.55)", borderColor: "rgba(255,255,255,0.12)" }}
              >
                <p className="text-xs font-semibold text-white">Glass over gradient</p>
                <p className="text-[10px] text-slate-300 mt-0.5">backdrop-blur 24</p>
              </div>
            </EffectTile>

            <EffectTile label="Animated border" bg={CARD_BG}>
              <div
                className="rounded-xl p-[1px]"
                style={{ background: `conic-gradient(from 0deg, ${tokens.primary}, ${tokens.secondary}, ${tokens.primary})` }}
              >
                <div className="rounded-[10px] px-3 py-2 bg-[#0B0F15]">
                  <p className="text-xs text-white">Conic ring</p>
                </div>
              </div>
            </EffectTile>

            <EffectTile label="Inner glow ring" bg={CARD_BG}>
              <div
                className="h-20 w-20 rounded-2xl border-2"
                style={{ borderColor: tokens.primary, boxShadow: `inset 0 0 20px ${tokens.primaryGlow}` }}
              />
            </EffectTile>
          </div>
        </Section>

        {/* Opacity ladder */}
        <Section title="5. Opacity Ladder" subtitle="Same color across translucency steps — for layering UI">
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
            {[5, 10, 15, 20, 30, 40, 60, 80, 90, 100].map((step) => (
              <div key={step} className="rounded-lg overflow-hidden border" style={{ borderColor: BORDER }}>
                <div className="h-12" style={{ backgroundColor: withAlpha(tokens.primary, step / 100) }} />
                <div className="text-[10px] text-center py-1 text-slate-500 font-mono">{step}%</div>
              </div>
            ))}
          </div>
        </Section>

        {/* Text treatments */}
        <Section title="6. Text Treatments" subtitle="Headings, gradients, eyebrows, links">
          <div className="space-y-6">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] mb-2" style={{ color: tokens.secondary }}>
                Eyebrow / section label
              </p>
              <h2 className="text-4xl font-bold tracking-tight text-white">
                Build the future, <span style={{ color: tokens.primary }}>one slate at a time</span>
              </h2>
            </div>

            <div>
              <h2 className="text-4xl font-bold tracking-tight">
                <span
                  className="bg-clip-text text-transparent"
                  style={{ backgroundImage: tokens.gradient }}
                >
                  Gradient headline
                </span>
              </h2>
              <p className="text-sm text-slate-400 mt-2">
                Body copy stays on slate. Inline link example:{" "}
                <a href="#" style={{ color: tokens.secondary, textDecoration: "underline", textUnderlineOffset: "3px" }}>
                  read the whitepaper
                </a>
                .
              </p>
            </div>

            <div className="rounded-xl border p-4" style={{ borderColor: BORDER, backgroundColor: "rgba(255,255,255,0.02)" }}>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4" style={{ color: tokens.primary }} />
                <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: tokens.primary }}>
                  Featured callout
                </span>
              </div>
              <p className="text-sm text-slate-300">
                Pull-quote / hero feature copy with a primary-tinted icon and label, body copy in slate-300.
              </p>
            </div>
          </div>
        </Section>

        {/* Badges & status */}
        <Section title="7. Badges & Status Pills" subtitle="Roles, plans, deadlines, alerts">
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Active", color: tokens.primary },
              { label: "Trial", color: tokens.secondary },
              { label: "Enterprise", color: "#fff", bg: tokens.gradient },
              { label: "Soon", color: "#94A3B8" },
              { label: "Beta", color: tokens.primary },
            ].map((b) => (
              <span
                key={b.label}
                className="rounded-full px-3 py-1 text-xs font-semibold border"
                style={{
                  borderColor: b.bg ? "transparent" : withAlpha(b.color, 0.4),
                  background: b.bg ?? withAlpha(b.color === "#94A3B8" ? "#94A3B8" : tokens.primary, 0.12),
                  color: b.color,
                }}
              >
                {b.label}
              </span>
            ))}
          </div>
        </Section>

        {/* Side-by-side */}
        <Section title="8. Sample Card Sidewalk" subtitle="What a typical Command Center module looks like">
          <div
            className="rounded-2xl border p-5"
            style={{ borderColor: BORDER, backgroundColor: CARD_BG }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <LayoutDashboard className="h-4 w-4" style={{ color: tokens.primary }} />
                <h3 className="text-base font-semibold text-white">Recent Projects</h3>
              </div>
              <a href="#" className="text-xs font-semibold flex items-center gap-1" style={{ color: tokens.secondary }}>
                See all <ArrowRight className="h-3 w-3" />
              </a>
            </div>
            <ul className="space-y-2">
              {["Riverside Tower – Phase 2", "Cedar Hills Renovation", "Mercantile Block"].map((name, i) => (
                <li
                  key={name}
                  className="flex items-center gap-3 rounded-xl px-3 py-2.5 border transition-all cursor-pointer"
                  style={{
                    borderColor: BORDER,
                    backgroundColor: "rgba(255,255,255,0.02)",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = tokens.secondary;
                    e.currentTarget.style.backgroundColor = tokens.secondarySoft;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = BORDER;
                    e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.02)";
                  }}
                >
                  <FolderKanban className="h-4 w-4" style={{ color: tokens.secondary }} />
                  <span className="text-sm text-white flex-1">{name}</span>
                  <span
                    className="text-[10px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5"
                    style={{ backgroundColor: withAlpha(tokens.primary, 0.12), color: tokens.primary }}
                  >
                    {["Active", "Review", "On hold"][i]}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </Section>

        <footer className="pt-6 border-t text-xs text-slate-500" style={{ borderColor: BORDER }}>
          Tip: open this page on the same screen as a competitor (Procore, Bluebeam, Linear) to compare directly.
        </footer>
      </main>
    </div>
  );
}

function Section({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-bold text-white">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function EffectTile({
  label,
  bg,
  children,
}: {
  label: string;
  bg: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border overflow-hidden" style={{ borderColor: BORDER }}>
      <div
        className="h-32 flex items-center justify-center"
        style={bg.startsWith("linear") || bg.startsWith("radial") ? { background: bg } : { backgroundColor: bg }}
      >
        {children}
      </div>
      <div className="px-3 py-2 text-[11px] text-slate-400" style={{ backgroundColor: CARD_BG }}>
        {label}
      </div>
    </div>
  );
}
