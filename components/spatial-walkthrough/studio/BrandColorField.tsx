"use client";

import { isHexColor, normalizeHex } from "@/lib/spatial-walkthrough/theme";
import { contrastWarning } from "@/lib/spatial-walkthrough/contrast";

const RECENT_KEY = "sw-recent-colors";

export function readRecentColors(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === "string" && isHexColor(v)).slice(0, 8) : [];
  } catch {
    return [];
  }
}

export function pushRecentColor(hex: string): string[] {
  const n = normalizeHex(hex);
  if (!n || typeof window === "undefined") return readRecentColors();
  const next = [n, ...readRecentColors().filter((c) => c !== n)].slice(0, 8);
  window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  return next;
}

function pickerHex(value: string): string {
  if (isHexColor(value)) return normalizeHex(value) ?? "#111111";
  if (typeof document === "undefined") return "#111111";
  const el = document.createElement("span");
  el.style.color = value;
  document.body.appendChild(el);
  const rgb = getComputedStyle(el).color;
  el.remove();
  const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return "#111111";
  const hex = `#${[m[1], m[2], m[3]].map((p) => Number(p).toString(16).padStart(2, "0")).join("")}`;
  return normalizeHex(hex) ?? "#111111";
}

type Props = {
  label: string;
  value: string;
  against?: string;
  recent: string[];
  onChange: (value: string) => void;
  onCommit: (value: string) => void;
};

export function BrandColorField({ label, value, against, recent, onChange, onCommit }: Props) {
  const hex = pickerHex(value);
  const warn = against ? contrastWarning(value, against) : null;
  return (
    <label className="text-sm">
      <span className="mb-1 block text-[var(--graphite-muted)]">{label}</span>
      <div className="flex gap-2">
        <input
          type="color"
          value={hex}
          onChange={(e) => {
            onChange(e.target.value);
            onCommit(e.target.value);
          }}
          className="h-11 w-12 shrink-0 bg-transparent"
          aria-label={`${label} picker`}
        />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={(e) => {
            const n = normalizeHex(e.target.value);
            if (n) onCommit(n);
          }}
          className="h-11 min-w-0 flex-1 border border-white/10 bg-transparent px-3 font-mono text-sm"
          placeholder="#000000"
          spellCheck={false}
        />
      </div>
      {recent.length > 0 ? (
        <span className="mt-1 flex flex-wrap gap-1">
          {recent.map((c) => (
            <button
              key={c}
              type="button"
              title={c}
              aria-label={`Use ${c}`}
              className="h-5 w-5 border border-white/20"
              style={{ background: c }}
              onClick={() => {
                onChange(c);
                onCommit(c);
              }}
            />
          ))}
        </span>
      ) : null}
      {warn ? <span className="mt-1 block text-[11px] text-[var(--graphite-muted)]">{warn}</span> : null}
    </label>
  );
}
