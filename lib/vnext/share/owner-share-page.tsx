import "server-only";

import { notFound } from "next/navigation";
import { APP_URL } from "@/lib/email";
import { listScopedProjectsForUser } from "@/lib/projects/access";
import { VnextShareBoard } from "@/components/vnext/share/VnextShareBoard";
import { requireVnextOwner } from "@/lib/vnext/require-vnext-session";
import { listSavedViewChoices, listShareLinks } from "./share-store";
import { formatShareDate, shareLinkStatus, sharePath, statusWord, type ShareListItem } from "./share-rules";

export async function renderOwnerSharesPage() {
  const ctx = await requireVnextOwner("/vnext/ops/shares");
  if (!ctx.user) notFound();
  const listed = await listScopedProjectsForUser(ctx.user.id);
  const projects = ((listed.projects ?? []) as Array<{ id: string; name: string }>).map((project) => ({
    id: project.id,
    name: project.name,
  }));
  const ids = projects.map((project) => project.id);
  const names = new Map(projects.map((project) => [project.id, project.name]));
  if (listed.error) {
    return <VnextShareBoard projects={projects} views={[]} links={[]} error="load" mode="live" />;
  }
  const [links, views] = await Promise.all([
    listShareLinks(listed.admin, ids),
    listSavedViewChoices(listed.admin, ids),
  ]);
  const titles = new Map(views.map((view) => [view.id, view.title]));
  const now = new Date();
  const rows: ShareListItem[] = links.map((link) => ({
    id: link.id,
    label: link.label || (link.targetType === "project" ? "Project link" : titles.get(link.savedViewId ?? "") || "Saved view"),
    projectName: names.get(link.projectId) ?? "Project",
    targetLabel: link.targetType === "project" ? "Project" : "Saved view",
    createdLabel: formatShareDate(link.createdAt),
    expiresLabel: formatShareDate(link.expiresAt),
    status: statusWord(shareLinkStatus(link, now)),
    opens: link.viewCount,
    url: `${APP_URL}${sharePath(link.token)}`,
  }));
  return <VnextShareBoard projects={projects} views={views} links={rows} error={null} mode="live" />;
}
