"use client";

import { CaptureV2DesktopInspector } from "./CaptureV2DesktopInspector";
import { CaptureV2MobileDrawer } from "./CaptureV2MobileDrawer";
import { useCaptureV2DetailDrawer } from "./useCaptureV2DetailDrawer";
import type { CaptureV2DrawerDetent } from "./useCaptureV2DetailDrawer";
import type { CaptureV2Loop } from "./useCaptureV2Loop";

type Props = {
  loop: CaptureV2Loop;
  projectId: string | null;
  mode: "mobile-overlay" | "mobile-full" | "desktop";
  initialDetent?: CaptureV2DrawerDetent;
  onClose?: () => void;
};

export function CaptureV2DetailDrawer({
  loop,
  projectId,
  mode,
  initialDetent = "default",
  onClose,
}: Props) {
  const drawer = useCaptureV2DetailDrawer(loop, projectId, initialDetent);

  if (mode === "desktop") {
    return <CaptureV2DesktopInspector loop={loop} drawer={drawer} />;
  }

  if (mode === "mobile-full") {
    return (
      <CaptureV2MobileDrawer
        loop={loop}
        drawer={drawer}
        presentation="full"
        onClose={onClose}
      />
    );
  }

  return (
    <CaptureV2MobileDrawer
      loop={loop}
      drawer={drawer}
      presentation="overlay"
      onClose={onClose}
    />
  );
}
