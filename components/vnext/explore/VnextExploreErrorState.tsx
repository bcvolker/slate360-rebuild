export function VnextExploreErrorState({ message }: { message: string }) {
  return (
    <div
      className="flex min-h-[320px] flex-col items-center justify-center gap-3 border border-[var(--vnext-line)] bg-[var(--vnext-surface)] p-8 text-center"
      role="alert"
      data-vnext-explore-error="true"
    >
      <p className="m-0 text-[length:var(--vnext-body)] text-[var(--vnext-ink-secondary)]">{message}</p>
    </div>
  );
}
