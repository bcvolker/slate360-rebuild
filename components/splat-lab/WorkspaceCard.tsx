"use client";

export function WorkspaceCard({
  name,
  onChangeName,
}: {
  name: string;
  onChangeName: (v: string) => void;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4 backdrop-blur">
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--graphite-muted)]">Workspace</p>
      <div className="mt-2 flex items-center gap-2">
        <input
          value={name}
          onChange={(e) => onChangeName(e.target.value)}
          placeholder="kitchen"
          className="flex-1 rounded-md border border-white/10 bg-[var(--graphite-canvas)] px-3 py-2 font-mono text-xs text-[var(--graphite-text-body)] placeholder:text-zinc-600 focus:border-[var(--twin360-blue)] focus:outline-none"
        />
        <span className="whitespace-nowrap font-mono text-[10px] text-[var(--graphite-muted)]">
          C:\Users\Brian PC\Slate360Jobs\{name || "…"}
        </span>
      </div>
    </div>
  );
}
