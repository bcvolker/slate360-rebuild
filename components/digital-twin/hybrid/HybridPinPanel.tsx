"use client";

import type { HybridPinTool } from "@/hooks/useHybridPinTool";

const FIELD =
  "min-h-[36px] w-full rounded-lg border border-white/10 bg-transparent px-2 text-[11px] text-zinc-100 outline-none";

export function HybridPinPanel({
  tool,
  metricAvailable,
}: {
  tool: HybridPinTool;
  metricAvailable: boolean;
}) {
  if (!tool.active && !tool.selected && tool.pins.length === 0) return null;
  const selected = tool.selected;

  return (
    <div
      className="pointer-events-auto absolute left-3 top-12 z-20 w-[min(100%-1.5rem,18rem)] space-y-2 rounded-xl border border-white/10 bg-[color-mix(in_srgb,var(--graphite-canvas)_88%,transparent)] p-3 backdrop-blur-xl"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <p className="font-mono text-[10px] uppercase tracking-wide text-white/50">Pins / documents</p>
      {!metricAvailable ? (
        <p className="text-[11px] text-zinc-400">
          Place pins on the LiDAR/TSDF surface. Gaussian centers are not valid anchors.
        </p>
      ) : null}

      {tool.active ? (
        <div className="space-y-2">
          <input className={FIELD} value={tool.title} onChange={(e) => tool.setTitle(e.target.value)} aria-label="Pin title" />
          <textarea
            className={`${FIELD} min-h-[64px] py-2`}
            value={tool.description}
            onChange={(e) => tool.setDescription(e.target.value)}
            aria-label="Pin description"
            placeholder="Note, RFI, inspection…"
          />
          <input
            className={FIELD}
            value={tool.attachmentUrl}
            onChange={(e) => tool.setAttachmentUrl(e.target.value)}
            aria-label="Attachment URL"
            placeholder="https://… or SlateDrop link"
          />
          <select
            className={FIELD}
            value={tool.category}
            onChange={(e) => tool.setCategory(e.target.value as typeof tool.category)}
            aria-label="Pin category"
          >
            {tool.categories.map((c) => (
              <option key={c.id} value={c.id} className="bg-[var(--graphite-canvas)]">
                {c.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="text-[10px] uppercase tracking-wide text-white/50"
            onClick={() => tool.setScope(tool.scope === "project" ? "epoch" : "project")}
          >
            {tool.scope === "project" ? "Stays across capture dates" : "This scan only"}
          </button>
          <p className="text-[11px] text-zinc-400">Tap the metric surface to drop the pin.</p>
          <button type="button" className="text-[11px] text-white/60" onClick={tool.cancel}>
            Cancel
          </button>
        </div>
      ) : null}

      {selected && !tool.active ? (
        <div className="space-y-1 text-[11px] text-zinc-200">
          <p className="font-semibold">{selected.title}</p>
          <p className="uppercase tracking-wide text-white/40">{selected.category}</p>
          {selected.description ? (
            <p className="whitespace-pre-wrap text-zinc-400">{selected.description}</p>
          ) : null}
          <p className="font-mono text-[10px] text-white/40">
            {selected.anchor.position.x.toFixed(3)}, {selected.anchor.position.y.toFixed(3)},{" "}
            {selected.anchor.position.z.toFixed(3)}
          </p>
          {tool.pendingDeleteId === selected.id ? (
            <button type="button" className="text-red-300" onClick={() => tool.remove(selected.id)}>
              Confirm delete
            </button>
          ) : (
            <button type="button" onClick={() => tool.setPendingDeleteId(selected.id)}>
              Delete pin
            </button>
          )}
        </div>
      ) : null}

      {tool.error ? <p className="text-[11px] text-red-300">{tool.error}</p> : null}

      <ul className="max-h-28 space-y-1 overflow-y-auto">
        {tool.pins.map((p) => (
          <li key={p.id}>
            <button
              type="button"
              onClick={() => tool.setSelectedId(p.id)}
              className="w-full truncate text-left text-[11px] text-zinc-300 hover:text-white"
            >
              {p.title}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
