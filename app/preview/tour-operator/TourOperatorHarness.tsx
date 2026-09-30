"use client";

import { useState } from "react";
import { TourOperator } from "@/components/spatial-tour/operator/TourOperator";
import type { TourUrls } from "@/lib/spatial-tour/urls";
import { createTourMock } from "./tour-mock";

/** Real operator UI over a mocked Tour API; video from a public share token passed in the URL. */
export function TourOperatorHarness(props: { token: string; walkthroughId: string; clipId: string; durationS: number; withRoute: boolean }) {
  const [urls] = useState<TourUrls>(() => {
    const media = `/api/spatial-walkthrough/public/${props.token}/media?clip=${props.clipId}`;
    return {
      media: (_w, _c, kind) => `${media}&kind=${kind === "poster" ? "hero" : "proxy"}`,
      // Harness stand-in: the clip poster, since stills need an operator session.
      still: () => `${media}&kind=hero`,
    };
  });
  useState(() => {
    if (typeof window === "undefined") return null;
    const mock = createTourMock(props);
    const real = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      return (await mock(url, init)) ?? real(input, init);
    };
    return null;
  });
  return <TourOperator projectId="harness" urls={urls} />;
}
