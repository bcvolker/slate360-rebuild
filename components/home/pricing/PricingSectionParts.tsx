"use client";

import { cn } from "@/lib/utils";
import type { BillingPeriod } from "@/components/home/pricing-data";

/* ──────────────────────────────────────────────────────────────────
   Small presentational helpers used by PricingSection.
   Kept here so PricingSection stays under the 300-line cap.
   ────────────────────────────────────────────────────────────────── */

export function BillingToggle({
  period,
  onChange,
}: {
  period: BillingPeriod;
  onChange: (p: BillingPeriod) => void;
}) {
  return (
    <div className="flex justify-center">
      <div
        className="inline-flex items-center rounded-full bg-white ring-1 ring-slate-200 shadow-sm p-1"
        role="tablist"
        aria-label="Billing period"
      >
        <ToggleButton
          active={period === "monthly"}
          onClick={() => onChange("monthly")}
          label="Monthly"
        />
        <ToggleButton
          active={period === "annual"}
          onClick={() => onChange("annual")}
          label="Annual"
          subtitle="Save 17%"
        />
      </div>
    </div>
  );
}

function ToggleButton({
  active,
  onClick,
  label,
  subtitle,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  subtitle?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "px-5 py-2 rounded-full text-sm font-medium transition-colors",
        active
          ? "bg-cobalt text-white shadow-md shadow-cobalt/30"
          : "text-slate-600 hover:text-slate-900",
      )}
    >
      {label}
      {subtitle && (
        <span className="ml-2 text-[10px] uppercase tracking-wide opacity-90">
          {subtitle}
        </span>
      )}
    </button>
  );
}

/** Per-card Basic/Pro mini-toggle for the À la carte grid. */
export function TierSwitch({
  value,
  onChange,
}: {
  value: "basic" | "pro";
  onChange: (v: "basic" | "pro") => void;
}) {
  return (
    <div className="inline-flex self-center rounded-full bg-white ring-1 ring-slate-200 p-0.5 text-[11px] font-medium shadow-sm">
      <button
        type="button"
        onClick={() => onChange("basic")}
        aria-pressed={value === "basic"}
        className={cn(
          "px-3 py-1 rounded-full transition-colors",
          value === "basic"
            ? "bg-slate-900 text-white"
            : "text-slate-500 hover:text-slate-900",
        )}
      >
        Basic
      </button>
      <button
        type="button"
        onClick={() => onChange("pro")}
        aria-pressed={value === "pro"}
        className={cn(
          "px-3 py-1 rounded-full transition-colors",
          value === "pro"
            ? "bg-cobalt text-white shadow-sm shadow-cobalt/30"
            : "text-slate-500 hover:text-slate-900",
        )}
      >
        Pro
      </button>
    </div>
  );
}

export function AddonCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white ring-1 ring-slate-200/80 shadow-[0_10px_30px_rgba(15,23,42,0.06)] p-6">
      <h4 className="text-sm font-semibold text-slate-900 mb-1">{title}</h4>
      <p className="text-xs text-slate-500 mb-4">{subtitle}</p>
      <ul className="space-y-2">{children}</ul>
    </div>
  );
}
