import { Suspense } from "react";
import { SpatialChaptersPreview } from "@/components/spatial-walkthrough/chapters/SpatialChaptersPreview";

export const metadata = { title: "Spatial Walkthrough chapters preview" };

export default function SpatialChaptersPreviewPage() {
  return (
    <Suspense>
      <SpatialChaptersPreview />
    </Suspense>
  );
}
