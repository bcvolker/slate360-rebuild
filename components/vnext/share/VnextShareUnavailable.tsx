import { VnextRoot } from "@/components/vnext/VnextRoot";

export function VnextShareUnavailable() {
  return (
    <VnextRoot>
      <main
        data-vnext-share-unavailable="true"
        className="mx-auto flex min-h-[100dvh] w-full max-w-[var(--vnext-content-max)] flex-col justify-center px-[var(--vnext-pad-x)] py-[var(--vnext-pad-y)]"
      >
        <p className="m-0 text-[length:var(--vnext-meta)] uppercase tracking-wide text-[var(--vnext-ink-muted)]">Slate360</p>
        <h1 className="m-0 mt-3 text-[length:var(--vnext-title)] font-semibold tracking-tight text-[var(--vnext-ink)]">
          This link is not available.
        </h1>
      </main>
    </VnextRoot>
  );
}
