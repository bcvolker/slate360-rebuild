import { Circle, MousePointer2, Pencil, Square, Type } from "lucide-react";

const TOOLS = [
  { label: "Select", icon: MousePointer2 },
  { label: "Draw", icon: Pencil },
  { label: "Box", icon: Square },
  { label: "Circle", icon: Circle },
  { label: "Text", icon: Type },
];

export function UnifiedVectorToolbar() {
  return (
    <section className="rounded-3xl border border-slate-300 bg-white p-4 shadow-sm" aria-label="Vector markup toolbar">
      <h2 className="text-sm font-black uppercase tracking-[0.16em] text-slate-700">Markup tools</h2>
      <div className="mt-3 grid grid-cols-5 gap-2 xl:grid-cols-1">
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          return (
            <div key={tool.label} className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700 xl:justify-start">
              <Icon className="h-4 w-4 text-blue-800" />
              <span className="hidden xl:inline">{tool.label}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
