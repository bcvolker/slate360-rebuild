import { redirect } from "next/navigation";

export default async function SW360ProjectDetailIndexPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  redirect(`/sw360/projects/${projectId}/walks`);
}
