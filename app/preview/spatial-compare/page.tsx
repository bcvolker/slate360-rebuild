import { Suspense } from "react";
import { SpatialComparePreview } from "@/components/spatial-walkthrough/compare/SpatialComparePreview";

export const metadata = { title: "Spatial Walkthrough temporal compare preview" };

export default function SpatialComparePreviewPage() {
  return (
    <Suspense>
      <SpatialComparePreview />
    </Suspense>
  );
}
