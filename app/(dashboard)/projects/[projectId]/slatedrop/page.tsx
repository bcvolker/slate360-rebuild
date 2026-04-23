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
		redirect(`/login?redirectTo=${encodeURIComponent(`/projects/${projectId}/slatedrop`)}`);
	}

	const { project } = await getScopedProjectForUser(user.id, projectId, "id, name");

	if (!project) {
		notFound();
	}

	const projectName = (project as { name?: string }).name ?? "Project";

	return (
		<div className="flex flex-col" style={{ height: "calc(100svh - 3.5rem)" }}>
			<div className="shrink-0 border-b border-zinc-800 bg-background px-4 py-3 sm:px-6">
				<p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Project Files</p>
				<div className="mt-1 flex items-center gap-3">
				<Link
					href={`/projects/${projectId}`}
					className="flex items-center gap-1.5 text-xs font-semibold text-zinc-400 transition-colors hover:text-[#3B82F6]"
				>
					<ChevronLeft size={14} /> {projectName}
				</Link>
				<span className="text-zinc-600">/</span>
				<span className="flex items-center gap-1.5 text-xs font-semibold text-[#3B82F6]">
					<FolderOpen size={13} /> Files
				</span>
				</div>
			</div>

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
					projectName={projectName}
					embedded
				/>
			</div>
		</div>
	);
}