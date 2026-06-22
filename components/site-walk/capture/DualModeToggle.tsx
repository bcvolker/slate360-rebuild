import { Camera, Map } from "lucide-react";

const MODES = [
  { label: "Camera", description: "Photo, upload, voice, and notes", icon: Camera, active: true },
  { label: "Plan", description: "Sheet, pin, and markup workflow", icon: Map, active: false },
];

export function DualModeToggle() {
  return (
    <section className="grid gap-2 rounded-2xl border border-white/10 bg-slate-900/70 p-2 shadow-lg shadow-black/30 sm:grid-cols-2" aria-label="Capture mode">
      {MODES.map((mode) => {
        const Icon = mode.icon;
        return (
          <div
            key={mode.label}
            className={mode.active
              ? "rounded-xl border border-[color-mix(in_srgb,var(--graphite-primary)_40%,transparent)] bg-[color-mix(in_srgb,var(--graphite-primary)_10%,transparent)] p-4 text-[var(--graphite-primary)]"
              : "rounded-xl border border-white/10 bg-white/[0.04] p-4 text-slate-400"}
          >
            <div className="flex items-center gap-3">
              <Icon className="h-5 w-5" />
              <div>
                <p className="font-black">{mode.label}</p>
                <p className="text-xs font-medium">{mode.description}</p>
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}
