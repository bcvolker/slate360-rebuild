export function VnextDocumentsLoading() {
  return (
    <div
      className="vnext-portfolio mx-auto w-full px-[var(--vnext-pad-x)] py-[var(--vnext-pad-y)]"
      data-vnext-documents-loading="true"
      aria-hidden
    >
      <div className="h-6 w-32 bg-[color-mix(in_srgb,var(--vnext-ink)_8%,var(--vnext-canvas))]" />
      <div className="mt-4 h-11 border border-[var(--vnext-line)] bg-[var(--vnext-surface)]" />
      <div className="mt-4 border border-[var(--vnext-line)] bg-[var(--vnext-surface)]">
        {["a", "b", "c", "d"].map((key) => (
          <div key={key} className="border-b border-[var(--vnext-line)] px-4 py-3 last:border-b-0">
            <div className="h-4 w-1/2 bg-[color-mix(in_srgb,var(--vnext-ink)_8%,var(--vnext-canvas))]" />
            <div className="mt-2 h-3 w-1/3 bg-[color-mix(in_srgb,var(--vnext-ink)_6%,var(--vnext-canvas))]" />
          </div>
        ))}
      </div>
    </div>
  );
}
