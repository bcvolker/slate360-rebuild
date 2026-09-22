import { notFound } from "next/navigation";
import { VnextItemsBrowser } from "@/components/vnext/items/VnextItemsBrowser";
import { VnextOverviewErrorNotice } from "@/components/vnext/project/VnextOverviewErrorNotice";
import { loadVnextProjectItems } from "@/lib/vnext/items/load-project-items";
import { isVnextProjectId } from "@/lib/vnext/portfolio-access";
import { vnextProjectHref } from "@/lib/vnext/nav";
import { requireVnextSession } from "@/lib/vnext/require-vnext-session";

type PageProps = {
  params: Promise<{ projectId: string }>;
};

export const metadata = {
  title: "Items — Slate360",
};

export default async function VnextProjectItemsPage({ params }: PageProps) {
  const { projectId } = await params;
  const path = `/vnext/projects/${projectId}/items`;
  const ctx = await requireVnextSession(path);
  if (!ctx.user) notFound();
  if (!isVnextProjectId(projectId)) notFound();

  const result = await loadVnextProjectItems(ctx.user.id, projectId);
  if (result.access === "denied") notFound();
  if (result.error) {
    return (
      <div className="vnext-portfolio mx-auto w-full px-[var(--vnext-pad-x)] py-[var(--vnext-pad-y)]">
        <h1 className="m-0 text-[length:var(--vnext-title)] font-semibold tracking-tight text-[var(--vnext-ink)]">
          Items
        </h1>
        <VnextOverviewErrorNotice message={result.error} />
      </div>
    );
  }

  return (
    <VnextItemsBrowser
      items={result.items}
      itemsBase={path}
      exploreBase={`${vnextProjectHref(projectId)}/explore`}
    />
  );
}
