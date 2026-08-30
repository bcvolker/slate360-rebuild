import { WalkthroughShareClient } from "@/components/spatial-walkthrough/share/WalkthroughShareClient";

export const dynamic = "force-dynamic";

export default async function SpatialWalkthroughSharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <WalkthroughShareClient token={token} />;
}
