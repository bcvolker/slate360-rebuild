import { TourOperator } from "@/components/spatial-tour/operator/TourOperator";

export const metadata = { title: "Directed Tour — Slate360" };

export default async function ProjectTourPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  return <TourOperator projectId={projectId} />;
}
