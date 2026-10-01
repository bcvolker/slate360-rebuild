import { WalkthroughClientView } from "@/components/spatial-walkthrough/WalkthroughClientView";

export default async function ProjectWalkthroughViewPage({
  params,
}: {
  params: Promise<{ projectId: string; id: string }>;
}) {
  const { id } = await params;
  return <WalkthroughClientView walkthroughId={id} />;
}
