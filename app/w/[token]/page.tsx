import { cookies } from "next/headers";
import { Suspense } from "react";
import { WalkthroughShareClient } from "@/components/spatial-walkthrough/share/WalkthroughShareClient";
import { loadPublicWalkBoot } from "@/lib/spatial-walkthrough/public-boot";

export const dynamic = "force-dynamic";

export default async function SpatialWalkthroughSharePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const boot = await loadPublicWalkBoot(token, await cookies());
  return (
    <Suspense>
      <WalkthroughShareClient token={token} boot={boot} />
    </Suspense>
  );
}
