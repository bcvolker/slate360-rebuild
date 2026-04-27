import { Camera, Map } from "lucide-react";

const MODES = [
  { label: "Camera", description: "Photo, upload, voice, and notes", icon: Camera, active: true },
  { label: "Plan", description: "Sheet, pin, and markup workflow", icon: Map, active: false },
];

export function DualModeToggle() {
  return (
    <section className="grid gap-2 rounded-2xl border border-slate-300 bg-white p-2 shadow-sm sm:grid-cols-2" aria-label="Capture mode">
      {MODES.map((mode) => {
        const Icon = mode.icon;
        return (
          <div
            key={mode.label}
            className={mode.active
              ? "rounded-xl border border-blue-300 bg-blue-50 p-4 text-blue-950"
              : "rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-700"}
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
