export function VnextItemsLoading() {
  return (
    <div
      className="vnext-portfolio mx-auto w-full px-[var(--vnext-pad-x)] py-[var(--vnext-pad-y)]"
      data-vnext-items-loading="true"
      aria-hidden
    >
      <div className="h-6 w-24 bg-[color-mix(in_srgb,var(--vnext-ink)_8%,var(--vnext-canvas))]" />
      <div className="mt-4 border border-[var(--vnext-line)] bg-[var(--vnext-surface)]">
        {["a", "b", "c", "d"].map((key) => (
          <div key={key} className="flex gap-3 border-b border-[var(--vnext-line)] px-4 py-3 last:border-b-0">
            <div className="h-[4.5rem] w-[4.5rem] shrink-0 bg-[color-mix(in_srgb,var(--vnext-ink)_8%,var(--vnext-canvas))]" />
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-2">
              <div className="h-4 w-2/3 bg-[color-mix(in_srgb,var(--vnext-ink)_8%,var(--vnext-canvas))]" />
              <div className="h-3 w-1/2 bg-[color-mix(in_srgb,var(--vnext-ink)_6%,var(--vnext-canvas))]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
