import { Suspense } from "react";
import { SpatialNavPreview } from "@/components/spatial-walkthrough/nav/SpatialNavPreview";

export const metadata = { title: "Spatial Walkthrough navigation preview" };

export default function SpatialNavPreviewPage() {
  return (
    <Suspense>
      <SpatialNavPreview />
    </Suspense>
  );
}
