const EXAMPLES = [
  "Interactive site walkthrough",
  "3D models",
  "Gaussian splat",
  "Aerial photography",
  "Aerial videography",
  "Commissioning video",
  "Punch lists",
  "Thermal report",
] as const;

/** Empty frames for each deliverable. No site photography. */
export function HomeExampleViewer() {
  return (
    <div id="examples">
      <p className="text-xs font-semibold uppercase tracking-[0.07em] text-[var(--mkt-accent)]">Deliverables</p>
      <h2 className="mt-2 max-w-[20ch] font-serif text-3xl font-normal leading-tight text-[var(--mkt-ink)] sm:text-4xl">
        Each deliverable, when a job is published
      </h2>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {EXAMPLES.map((name) => (
          <li key={name} className="overflow-hidden rounded-xl border border-[var(--mkt-line)] bg-[var(--mkt-surface)]">
            <div className="aspect-video bg-[var(--mkt-canvas-alt)]" aria-hidden />
            <p className="px-4 py-3 text-[15px] font-semibold text-[var(--mkt-ink)]">{name}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
