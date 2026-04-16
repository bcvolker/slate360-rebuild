import { notFound, redirect } from "next/navigation";
import { getScopedProjectForUser } from "@/lib/projects/access";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { resolveProjectLocation } from "@/lib/projects/location";
import { resolveNamespace } from "@/lib/slatedrop/storage";
import { ProjectDetailOverview } from "@/components/projects/ProjectDetailOverview";

type ProjectMetadata = {
	projectType?: string;
	contractType?: string;
	address?: string;
	city?: string;
	state?: string;
	region?: string;
	location?: unknown;
};

type ProjectRecord = {
	id: string;
	name: string;
	status: string | null;
	metadata: ProjectMetadata | null;
	description: string | null;
	created_at: string | null;
};

type ProjectFolderRow = {
	id: string;
	name: string;
};

type FileRow = {
	id: string;
	file_name: string;
	file_type: string | null;
	file_size: number | null;
	created_at: string;
};

type PunchItemRow = {
	id: string;
	number: number | null;
	title: string;
	status: string | null;
	priority: string | null;
	due_date: string | null;
	created_at: string;
};

function escapeLike(value: string): string {
	return value.replace(/[\\%_]/g, "\\$&");
}

function formatLabel(value: string | undefined): string | null {
	if (!value) return null;
	return value
		.split(/[-_\s]+/)
		.filter(Boolean)
		.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
		.join(" ");
}

export default async function ProjectPage({ params }: { params: Promise<{ projectId: string }> }) {
	const { projectId } = await params;
	const { user } = await resolveServerOrgContext();

	if (!user) {
		redirect(`/login?redirectTo=${encodeURIComponent(`/projects/${projectId}`)}`);
	}

	const { admin, orgId, project: scopedProject } = await getScopedProjectForUser(
		user.id,
		projectId,
		"id, name, status, metadata, description, created_at"
	);

	if (!scopedProject) notFound();

	const project = scopedProject as unknown as ProjectRecord;
	const projectMetadata = project.metadata ?? {};
	const location = resolveProjectLocation(projectMetadata, {
		fallbackAddress: projectMetadata.address,
		city: projectMetadata.city,
		state: projectMetadata.state,
		region: projectMetadata.region,
	});

	const projectType = formatLabel(projectMetadata.projectType);
	const contractType = formatLabel(projectMetadata.contractType);
	const namespace = resolveNamespace(orgId, user.id);

	const { data: folderRows } = await admin
		.from("project_folders")
		.select("id, name")
		.eq("project_id", projectId)
		.order("name", { ascending: true });

	const folders = (folderRows ?? []) as ProjectFolderRow[];
	const projectFolderIds = folders.map((folder) => folder.id).filter(Boolean);
	const photoFolderIds = folders
		.filter((folder) => folder.name.toLowerCase() === "photos")
		.map((folder) => folder.id);

	const allFileFilters = projectFolderIds.map((folderId) => `s3_key.like.${escapeLike(`orgs/${namespace}/${folderId}/`)}%`);
	const photoFileFilters = photoFolderIds.map((folderId) => `s3_key.like.${escapeLike(`orgs/${namespace}/${folderId}/`)}%`);

	let recentFilesPromise: Promise<{ data: FileRow[] | null }> = Promise.resolve({ data: [] });
	if (allFileFilters.length > 0) {
		let query = admin
			.from("slatedrop_uploads")
			.select("id, file_name, file_type, file_size, created_at")
			.eq("status", "active")
			.or(allFileFilters.join(","))
			.order("created_at", { ascending: false })
			.limit(5);
		query = orgId ? query.eq("org_id", orgId) : query.eq("uploaded_by", user.id);
		recentFilesPromise = Promise.resolve(query);
	}

	let photoCountPromise: Promise<{ count: number | null }> = Promise.resolve({ count: 0 });
	if (photoFileFilters.length > 0) {
		let query = admin
			.from("slatedrop_uploads")
			.select("id", { count: "exact", head: true })
			.eq("status", "active")
			.or(photoFileFilters.join(","));
		query = orgId ? query.eq("org_id", orgId) : query.eq("uploaded_by", user.id);
		photoCountPromise = Promise.resolve(query);
	}

	let recentPhotosPromise: Promise<{ data: FileRow[] | null }> = Promise.resolve({ data: [] });
	if (photoFileFilters.length > 0) {
		let query = admin
			.from("slatedrop_uploads")
			.select("id, file_name, file_type, file_size, created_at")
			.eq("status", "active")
			.or(photoFileFilters.join(","))
			.order("created_at", { ascending: false })
			.limit(4);
		query = orgId ? query.eq("org_id", orgId) : query.eq("uploaded_by", user.id);
		recentPhotosPromise = Promise.resolve(query);
	}

	const punchItemsPromise = admin
		.from("project_punch_items")
		.select("id, number, title, status, priority, due_date, created_at")
		.eq("project_id", projectId)
		.order("created_at", { ascending: false });

	const [{ data: recentFileRows }, photoCountResult, { data: recentPhotoRows }, { data: punchItemRows }] = await Promise.all([
		recentFilesPromise,
		photoCountPromise,
		recentPhotosPromise,
		punchItemsPromise,
	]);

	const recentFiles = (recentFileRows ?? []) as FileRow[];
	const recentPhotos = (recentPhotoRows ?? []) as FileRow[];
	const punchItems = (punchItemRows ?? []) as PunchItemRow[];
	const photoCount = photoCountResult.count ?? 0;

	const punchSummary = {
		total: punchItems.length,
		open: punchItems.filter((item) => item.status === "Open").length,
		inProgress: punchItems.filter((item) => item.status === "In Progress").length,
		review: punchItems.filter((item) => item.status === "Ready for Review").length,
		closed: punchItems.filter((item) => item.status === "Closed").length,
	};
	const activePunchItems = punchItems.filter((item) => item.status !== "Closed").slice(0, 3);

	const statusNotes = [
		project.status ? `Current status: ${project.status}` : null,
		projectType ? `Project type: ${projectType}` : null,
		contractType ? `Contract type: ${contractType}` : null,
		location.label ? `Location: ${location.label}` : null,
	].filter((note): note is string => Boolean(note));

	return (
		<ProjectDetailOverview
			project={project}
			projectType={projectType}
			contractType={contractType}
			location={location}
			statusNotes={statusNotes}
			recentFiles={recentFiles}
			photoCount={photoCount}
			recentPhotos={recentPhotos}
			punchSummary={punchSummary}
			activePunchItems={activePunchItems}
		/>
	);
}