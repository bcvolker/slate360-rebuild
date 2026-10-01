import Link from "next/link";
import type { ReactNode } from "react";

export function VnextClientPreviewFrame({
  exitHref,
  candidate,
  children,
}: {
  exitHref: string;
  candidate: string | null;
  children: ReactNode;
}) {
  return (
    <div data-vnext-client-preview="true">
      <div className="flex min-h-11 items-center justify-between gap-3 border-b border-[var(--vnext-line)] bg-white px-[var(--vnext-pad-x)] text-[length:var(--vnext-body)] text-[var(--vnext-ink)]">
        <p className="m-0">{candidate ? `Preview as client · candidate ${candidate}` : "Preview as client"}</p>
        <Link href={exitHref} className="inline-flex h-11 items-center text-[var(--vnext-ink)]">Exit preview</Link>
      </div>
      {children}
    </div>
  );
}
