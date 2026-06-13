"use client";

import { DesktopSlateDropBrowser } from "./DesktopSlateDropBrowser";
import { MobileSlateDropBrowser } from "./MobileSlateDropBrowser";
import type { SlateDropBrowserShellProps } from "./slatedrop-browser-types";
import { useSlateDropBrowserData } from "./useSlateDropBrowserData";

export function SlateDropBrowserShell(props: SlateDropBrowserShellProps) {
  const browserData = useSlateDropBrowserData(props);

  return (
    <>
      <div className="lg:hidden">
        <MobileSlateDropBrowser {...browserData} />
      </div>
      <div className="hidden lg:-mx-2 lg:-mt-2 lg:block lg:h-[calc(100svh-7rem)]">
        <DesktopSlateDropBrowser {...browserData} />
      </div>
    </>
  );
}
