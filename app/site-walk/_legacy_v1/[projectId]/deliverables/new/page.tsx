import { BlockEditor } from "@/components/site-walk/BlockEditor";

interface PageProps {
  params: Promise<{ projectId: string }>;
}

export default async function NewDeliverablePage({ params }: PageProps) {
  const { projectId } = await params;

  return <BlockEditor projectId={projectId} />;
}
