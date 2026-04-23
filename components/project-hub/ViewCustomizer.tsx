"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Columns3, LayoutList } from "lucide-react";

/* ── Types ─────────────────────────────────────────────────────── */
export type Density = "compact" | "normal" | "comfortable";

export interface ColDef {
  key: string;
  label: string;
}

export interface ViewPrefs {
  density: Density;
  visibleCols: string[];
}

/* ── Hook ──────────────────────────────────────────────────────── */
export function useViewPrefs(
  storageKey: string,
  defaultCols: string[],
): [ViewPrefs, (p: ViewPrefs) => void] {
  const [prefs, setPrefs] = useState<ViewPrefs>(() => {
    if (typeof window === "undefined") return { density: "normal", visibleCols: defaultCols };
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<ViewPrefs>;
        return {
          density: parsed.density ?? "normal",
          visibleCols: Array.isArray(parsed.visibleCols) ? parsed.visibleCols : defaultCols,
        };
      }
    } catch {
      // ignore
    }
    return { density: "normal", visibleCols: defaultCols };
  });

  const save = (p: ViewPrefs) => {
    setPrefs(p);
    try { localStorage.setItem(storageKey, JSON.stringify(p)); } catch { /* ignore */ }
  };

  return [prefs, save];
}

/* ── Density utility ───────────────────────────────────────────── */
export function densityClass(density: Density): string {
  if (density === "compact") return "py-1.5 text-xs";
  if (density === "comfortable") return "py-4 text-sm";
  return "py-2.5 text-sm";
}

/* ── Component ─────────────────────────────────────────────────── */
interface Props {
  storageKey: string;
  cols: ColDef[];
  defaultCols: string[];
  prefs: ViewPrefs;
  onPrefsChange: (p: ViewPrefs) => void;
}

const DENSITIES: { value: Density; label: string }[] = [
  { value: "compact", label: "Compact" },
  { value: "normal", label: "Normal" },
  { value: "comfortable", label: "Comfortable" },
];

export default function ViewCustomizer({ cols, prefs, onPrefsChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  /* close on outside click */
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const toggleCol = (key: string) => {
    const next = prefs.visibleCols.includes(key)
      ? prefs.visibleCols.filter((k) => k !== key)
      : [...prefs.visibleCols, key];
    if (next.length === 0) return; // must keep at least one col visible
    onPrefsChange({ ...prefs, visibleCols: next });
  };

  const setDensity = (d: Density) => onPrefsChange({ ...prefs, density: d });

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 shadow-sm hover:bg-gray-50 transition-colors"
        title="Customize view"
      >
        <Columns3 className="h-4 w-4" />
        <span className="hidden sm:inline">View</span>
        <ChevronDown className="h-3 w-3 opacity-60" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-40 mt-1 w-64 rounded-xl border border-gray-200 bg-white shadow-lg">
          {/* Density */}
          <div className="border-b border-gray-100 px-3 py-2">
            <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              <LayoutList className="h-3 w-3" />
              Row density
            </p>
            <div className="flex gap-1">
              {DENSITIES.map((d) => (
                <button
                  key={d.value}
                  onClick={() => setDensity(d.value)}
                  className={`flex-1 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                    prefs.density === d.value
                      ? "bg-amber-50 text-amber-600 ring-1 ring-orange-200"
                      : "text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Columns */}
          {cols.length > 0 && (
            <div className="px-3 py-2">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                Columns
              </p>
              <div className="space-y-0.5">
                {cols.map((col) => {
                  const visible = prefs.visibleCols.includes(col.key);
                  return (
                    <button
                      key={col.key}
                      onClick={() => toggleCol(col.key)}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors ${
                          visible
                            ? "border-amber-500 bg-amber-500 text-foreground"
                            : "border-gray-300 bg-white"
                        }`}
                      >
                        {visible && <Check className="h-3 w-3" />}
                      </span>
                      {col.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="border-t border-gray-100 px-3 py-2">
            <p className="text-[10px] text-gray-400">Preferences saved automatically</p>
          </div>
        </div>
      )}
    </div>
  );
}
