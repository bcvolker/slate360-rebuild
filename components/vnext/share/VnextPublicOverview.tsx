import Link from "next/link";
import type { PublicSection } from "@/lib/vnext/share/share-rules";

const ACTION =
  "inline-flex min-h-[var(--vnext-touch)] min-w-[var(--vnext-touch)] items-center text-[length:var(--vnext-body)] text-[var(--vnext-accent)] no-underline";

export function VnextPublicOverview({
  projectName,
  exploreHref,
  historyHref,
  sections,
}: {
  projectName: string;
  exploreHref: string;
  historyHref: string;
  sections: PublicSection[];
}) {
  return (
    <article className="vnext-portfolio mx-auto w-full max-w-[var(--vnext-content-max)] px-[var(--vnext-pad-x)] py-[var(--vnext-pad-y)]">
      <p className="m-0 text-[length:var(--vnext-meta)] uppercase tracking-wide text-[var(--vnext-ink-muted)]">Published project</p>
      <h1 className="m-0 mt-2 text-[length:var(--vnext-title)] font-semibold tracking-tight text-[var(--vnext-ink)]">{projectName}</h1>
      <p className="m-0 mt-3 text-[length:var(--vnext-body)] text-[var(--vnext-ink)]">
        This link shows the project as it is currently published.
      </p>
      <div className="mt-6 flex flex-col items-start gap-2">
        {sections.includes("explore") ? (
          <Link href={exploreHref} className={ACTION}>
            Explore
          </Link>
        ) : null}
        {sections.includes("history") ? (
          <Link href={historyHref} className={ACTION}>
            History
          </Link>
        ) : null}
      </div>
    </article>
  );
}
