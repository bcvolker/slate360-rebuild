import DashboardHeader from "@/components/shared/DashboardHeader";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getScopedProjectForUser } from "@/lib/projects/access";

const TABS = [
	{ label: "Overview", href: "" },
	{ label: "SlateDrop", href: "slatedrop" },
	{ label: "Photos", href: "photos" },
	{ label: "Punch List", href: "punch-list" },
] as const;

export default async function ProjectDetailLayout({
	children,
	params,
}: {
	children: React.ReactNode;
	params: Promise<{ projectId: string }>;
}) {
	const { projectId } = await params;
	const { user, tier, isSlateCeo, canAccessOperationsConsole } = await resolveServerOrgContext();

	if (!user) {
		redirect(`/login?redirectTo=${encodeURIComponent(`/projects/${projectId}`)}`);
	}

	const { project: scopedProject } = await getScopedProjectForUser(user.id, projectId, "id, name, status");
	const project = scopedProject as { id: string; name: string; status: string } | null;

	if (!project) {
		notFound();
	}

	return (
		<div className="min-h-screen bg-zinc-950 overflow-x-hidden">
			<DashboardHeader
				user={{
					name: user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "User",
					email: user.email ?? "",
					avatar: user.user_metadata?.avatar_url ?? undefined,
				}}
				tier={tier}
				isCeo={isSlateCeo}
				internalAccess={{ operationsConsole: canAccessOperationsConsole }}
				showBackLink
			/>
			<div className="sticky top-0 z-30 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur-md">
				<div className="mx-auto w-full max-w-7xl px-4 sm:px-6 py-3 sm:py-4 md:px-10">
					<div className="flex items-center justify-between gap-4">
						<div>
							<p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">Project Details</p>
							<h1 className="text-xl font-black text-white md:text-2xl">{project.name}</h1>
						</div>
						<span className="inline-flex rounded-full border border-zinc-700 bg-zinc-800 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-zinc-300">
							{project.status}
						</span>
					</div>

					<nav className="mt-4 overflow-x-auto pb-1 -mx-1">
						<ul className="flex min-w-max items-center gap-1 sm:gap-2 px-1">
							{TABS.map((tab) => {
								const href = tab.href ? `/projects/${projectId}/${tab.href}` : `/projects/${projectId}`;
								return (
									<li key={tab.label}>
										<Link
											href={href}
											className="inline-flex rounded-full border border-zinc-800 bg-zinc-900 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-zinc-300 transition-all hover:border-[#D4AF37]/30 hover:bg-[#D4AF37]/10 hover:text-[#D4AF37] hover:shadow-sm hover:-translate-y-px whitespace-nowrap"
										>
											{tab.label}
										</Link>
									</li>
								);
							})}
						</ul>
					</nav>
				</div>
			</div>

			<main className="mx-auto w-full max-w-7xl px-4 sm:px-6 py-6 md:px-10 md:py-8">{children}</main>
		</div>
	);
}