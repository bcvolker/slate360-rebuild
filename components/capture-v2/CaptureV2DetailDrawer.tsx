"use client";

import { LogEntryDrawer } from "./LogEntryDrawer";
import { useCaptureV2DetailDrawer } from "./useCaptureV2DetailDrawer";
import type { CaptureV2DrawerDetent } from "./useCaptureV2DetailDrawer";
import type { CaptureV2Loop } from "./useCaptureV2Loop";

type Props = {
  loop: CaptureV2Loop;
  projectId: string | null;
  mode: "mobile-overlay" | "mobile-full" | "desktop";
  initialDetent?: CaptureV2DrawerDetent;
  notesFocused?: boolean;
  onNotesFocusChange?: (focused: boolean) => void;
  onAddAnotherAngle?: () => void;
  onClose?: () => void;
};

export function CaptureV2DetailDrawer({
  loop,
  projectId,
  mode,
  initialDetent = "default",
  notesFocused,
  onNotesFocusChange,
  onAddAnotherAngle,
  onClose,
}: Props) {
  const drawer = useCaptureV2DetailDrawer(loop, projectId, initialDetent);

  return (
    <LogEntryDrawer
      loop={loop}
      drawer={drawer}
      mode={mode}
      notesFocused={notesFocused}
      onNotesFocusChange={onNotesFocusChange}
      onAddAnotherAngle={onAddAnotherAngle}
      onClose={onClose}
    />
  );
}
