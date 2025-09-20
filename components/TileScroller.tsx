"use client";
const items = [
  { id: "slate360", label: "Slate360" },
  { id: "bim", label: "BIM Studio" },
  { id: "project-hub", label: "Project Hub" },
  { id: "tour", label: "360 Tour Builder" },
  { id: "content", label: "Content Creation" },
  { id: "geo", label: "Geospatial & Robotics" },
  { id: "reports", label: "Reports & Analytics" },
  { id: "vr", label: "VR/AR Lab" },
];

export default function TileScroller() {
  return (
    <aside className="hidden md:flex fixed top-1/2 -translate-y-1/2 right-5 z-40 flex-col gap-3">
      {items.map((it) => (
        <a key={it.id} href={`#${it.id}`} className="group relative h-2 w-2 rounded-full bg-slate-300 hover:bg-[var(--brand-blue)] transition">
          <span className="pointer-events-none opacity-0 group-hover:opacity-100 absolute right-4 top-1/2 -translate-y-1/2 translate-x-2 bg-white border border-slate-200 rounded-md px-2 py-1 text-xs text-[var(--ink)] shadow-sm">
            {it.label}
          </span>
        </a>
      ))}
    </aside>
  );
}
