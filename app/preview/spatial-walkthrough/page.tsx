import { Suspense } from "react";
import { SpatialWalkthroughPreview } from "@/components/spatial-walkthrough/SpatialWalkthroughPreview";

export const metadata = { title: "Spatial Walkthrough preview" };

export default function SpatialWalkthroughPreviewPage() {
  return (
    <Suspense>
      <SpatialWalkthroughPreview />
    </Suspense>
  );
}
