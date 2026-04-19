import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, FolderOpen } from "lucide-react";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { getScopedProjectForUser } from "@/lib/projects/access";
import SlateDropClient from "@/components/slatedrop/SlateDropClient";

export default async function ProjectSlateDropPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const { user, tier } = await resolveServerOrgContext();

  if (!user) {
    redirect(`/login?redirectTo=${encodeURIComponent(`/project-hub/${projectId}/slatedrop`)}`);
  }

  const { project } = await getScopedProjectForUser(user.id, projectId, "id, name");

  if (!project) {
    notFound();
  }

  const projectName = (project as { name?: string }).name ?? "Project";

  return (
    /* Give this container the remaining viewport height after the Project Hub nav */
    <div className="flex flex-col" style={{ height: "calc(100svh - 3.5rem)" }}>
      {/* Breadcrumb header matching other Tier-3 tab pages */}
      <div className="shrink-0 flex items-center gap-3 px-4 sm:px-6 py-3 bg-white border-b border-gray-100">
        <Link
          href={`/project-hub/${projectId}`}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-[#F59E0B] transition-colors"
        >
          <ChevronLeft size={14} /> {projectName}
        </Link>
        <span className="text-gray-300">/</span>
        <span className="flex items-center gap-1.5 text-xs font-semibold text-[#F59E0B]">
          <FolderOpen size={13} /> Files
        </span>
      </div>

      {/* Embedded SlateDrop — no duplicate header */}
      <div className="flex-1 min-h-0">
        <SlateDropClient
          user={{
            name:
              user.user_metadata?.full_name ??
              user.email?.split("@")[0] ??
              "User",
            email: user.email ?? "",
          }}
          tier={tier}
          initialProjectId={projectId}
          embedded
        />
      </div>
    </div>
  );
}
