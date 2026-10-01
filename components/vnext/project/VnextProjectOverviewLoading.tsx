const BLOCK = "bg-[color-mix(in_srgb,var(--vnext-ink)_8%,var(--vnext-canvas))]";
const LINE = "bg-[color-mix(in_srgb,var(--vnext-ink)_6%,var(--vnext-canvas))]";
const SURFACE = "border border-[var(--vnext-line)] bg-[var(--vnext-surface)]";

export function VnextProjectOverviewLoading() {
  return (
    <div
      className="vnext-portfolio mx-auto w-full px-[var(--vnext-pad-x)] py-[var(--vnext-pad-y)]"
      aria-hidden="true"
    >
      <div className={`grid grid-cols-1 ${SURFACE} md:grid-cols-[minmax(0,42%)_1fr]`}>
        <div className={`h-64 min-h-[16rem] w-full ${BLOCK}`} />
        <div className="flex min-w-0 flex-col justify-center gap-3 p-6 md:p-8">
          <div className={`h-7 w-3/4 ${LINE}`} />
          <div className={`h-4 w-1/3 ${LINE}`} />
          <div className={`h-3 w-1/4 ${LINE}`} />
          <div className={`mt-3 h-[2.75rem] w-40 ${BLOCK}`} />
        </div>
      </div>
      <div className={`${SURFACE} mt-6 grid grid-cols-1 gap-0 sm:grid-cols-2`}>
        <div className="p-4">
          <div className={`h-3 w-20 ${LINE}`} />
          <div className={`mt-2 h-4 w-2/3 ${LINE}`} />
        </div>
        <div className="p-4">
          <div className={`h-3 w-20 ${LINE}`} />
          <div className={`mt-2 h-4 w-2/3 ${LINE}`} />
        </div>
      </div>
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className={`${SURFACE} p-5`}>
          <div className={`h-4 w-1/3 ${LINE}`} />
          <div className={`mt-3 h-3 w-full ${LINE}`} />
          <div className={`mt-2 h-3 w-5/6 ${LINE}`} />
        </div>
        <div className={`${SURFACE} p-5`}>
          <div className={`h-4 w-1/3 ${LINE}`} />
          <div className={`mt-3 h-3 w-full ${LINE}`} />
          <div className={`mt-2 h-3 w-5/6 ${LINE}`} />
        </div>
      </div>
    </div>
  );
}
