export function VnextHistoryLoading() {
  return (
    <div className="vnext-portfolio mx-auto w-full px-[var(--vnext-pad-x)] py-[var(--vnext-pad-y)]" data-vnext-history-loading="true" aria-hidden="true">
      <div className="h-8 w-32 bg-[var(--vnext-line)]" />
      <div className="mt-4 border border-[var(--vnext-line)]">
        <div className="h-16 border-b border-[var(--vnext-line)]" />
        <div className="h-16 border-b border-[var(--vnext-line)]" />
        <div className="h-16" />
      </div>
    </div>
  );
}
