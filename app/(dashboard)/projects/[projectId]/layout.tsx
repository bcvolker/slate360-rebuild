import { notFound, redirect } from "next/navigation";
import { APP_STORE_MODE } from "@/lib/app-store-mode";
import { getScopedProjectForUser } from "@/lib/projects/access";
import { resolveProjectLocation } from "@/lib/projects/location";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { ProjectDetailShell } from "@/components/projects/ProjectDetailShell";

type ProjectMetadata = {
  address?: string;
  city?: string;
  state?: string;
  region?: string;
  location?: unknown;
};

function formatStatusLabel(status: string | null | undefined): string {
  const raw = (status ?? "active").trim();
  if (!raw) return "Active";
  return raw
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function ProjectDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const { user } = await resolveServerOrgContext();

  if (!user) {
    redirect(`/login?redirectTo=${encodeURIComponent(`/projects/${projectId}`)}`);
  }

  const { project: scopedProject } = await getScopedProjectForUser(
    user.id,
    projectId,
    "id, name, status, metadata",
  );
  const project = scopedProject as {
    id: string;
    name: string;
    status: string | null;
    metadata: ProjectMetadata | null;
  } | null;

  if (!project) {
    notFound();
  }

  const metadata = project.metadata ?? {};
  const location = resolveProjectLocation(metadata, {
    fallbackAddress: metadata.address,
    city: metadata.city,
    state: metadata.state,
    region: metadata.region,
  });

  return (
    <ProjectDetailShell
      projectId={project.id}
      projectName={project.name}
      status={formatStatusLabel(project.status)}
      locationLabel={location.label || "Location not set"}
      showTwins={!APP_STORE_MODE}
    >
      {children}
    </ProjectDetailShell>
  );
}
