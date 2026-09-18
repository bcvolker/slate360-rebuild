"use client";

import { TourPanoViewer } from "@/components/tours/TourPanoViewer";
import type { VnextPanoSourceData } from "@/lib/vnext/explore-types";

export default function VnextPanoViewer({ data }: { data: VnextPanoSourceData }) {
  return (
    <div className="relative h-full w-full">
      <TourPanoViewer src={data.imageUrl} />
    </div>
  );
}
