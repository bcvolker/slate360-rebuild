import { VNEXT_PROJECT_SCAFFOLD_NOTE } from "@/lib/vnext/copy";

type Props = {
  name: string;
};

/** Slice 2 destination only. Slice 3 owns Overview. */
export function VnextProjectScaffold({ name }: Props) {
  return (
    <div className="mx-auto w-full max-w-[var(--vnext-content-max)] px-[var(--vnext-pad-x)] py-[var(--vnext-pad-y)]">
      <h1 className="m-0 text-[length:var(--vnext-title)] font-semibold tracking-tight text-[var(--vnext-ink)]">
        {name}
      </h1>
      <p className="mt-2 mb-0 max-w-[36rem] text-[length:var(--vnext-meta)] text-[var(--vnext-ink-muted)]">
        {VNEXT_PROJECT_SCAFFOLD_NOTE}
      </p>
    </div>
  );
}
