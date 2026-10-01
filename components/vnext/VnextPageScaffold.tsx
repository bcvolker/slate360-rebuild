type VnextPageScaffoldProps = {
  title: string;
  note: string;
};

export function VnextPageScaffold({ title, note }: VnextPageScaffoldProps) {
  return (
    <div className="mx-auto w-full max-w-[var(--vnext-content-max)] px-[var(--vnext-pad-x)] py-[var(--vnext-pad-y)]">
      <h1 className="m-0 text-[length:var(--vnext-title)] font-semibold tracking-tight text-[var(--vnext-ink)]">
        {title}
      </h1>
      <p className="mt-2 mb-0 max-w-[36rem] text-[length:var(--vnext-meta)] text-[var(--vnext-ink-muted)]">
        {note}
      </p>
      <div
        className="mt-6 min-h-[10rem] border border-[var(--vnext-line)] bg-[var(--vnext-surface)]"
        aria-hidden="true"
      />
    </div>
  );
}
