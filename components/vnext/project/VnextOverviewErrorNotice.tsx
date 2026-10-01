"use client";

type Props = {
  message: string;
};

export function VnextOverviewErrorNotice({ message }: Props) {
  return (
    <div className="mt-6 flex max-w-[36rem] flex-col items-start gap-3 border border-[var(--vnext-line)] bg-[var(--vnext-surface)] p-4">
      <p className="m-0 text-[length:var(--vnext-body)] text-[var(--vnext-ink-secondary)]">{message}</p>
      <button
        type="button"
        className="inline-flex min-h-[var(--vnext-touch)] items-center text-[length:var(--vnext-body)] text-[var(--vnext-accent)]"
        onClick={() => window.location.reload()}
      >
        Try again
      </button>
    </div>
  );
}
