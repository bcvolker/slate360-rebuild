const BLOCK = "bg-[color-mix(in_srgb,var(--vnext-ink)_8%,var(--vnext-canvas))]";
const LINE = "bg-[color-mix(in_srgb,var(--vnext-ink)_6%,var(--vnext-canvas))]";

export function VnextProjectOverviewLoading() {
  return (
    <div
      className="mx-auto w-full max-w-[64rem] px-[var(--vnext-pad-x)] py-[var(--vnext-pad-y)]"
      aria-hidden="true"
    >
      <div className="grid grid-cols-1 gap-8 md:grid-cols-[minmax(0,22rem)_1fr] md:items-start">
        <div className={`vnext-hero max-w-[28rem] ${BLOCK}`} />
        <div className="min-w-0">
          <div className={`h-7 w-3/4 ${LINE}`} />
          <div className={`mt-3 h-4 w-1/3 ${LINE}`} />
          <div className={`mt-2 h-3 w-1/4 ${LINE}`} />
          <div className={`mt-5 h-[2.75rem] w-40 ${BLOCK}`} />
          <div className={`mt-8 h-4 w-1/3 ${LINE}`} />
          <div className={`mt-2 h-3 w-2/3 ${LINE}`} />
        </div>
      </div>
    </div>
  );
}
