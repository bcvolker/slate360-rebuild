import type { CaptureItemDraft } from "@/lib/types/site-walk-capture";

export type CaptureV2MachineState =
  | "empty"
  | "opening_picker"
  | "pending_upload_preview"
  | "upload_confirming"
  | "uploading"
  | "active_item_ready"
  | "draft_dirty"
  | "saving_details"
  | "advancing_stop"
  | "opening_next_picker"
  | "error";

type DeriveArgs = {
  openingPicker: boolean;
  advancingStop: boolean;
  openingNextPicker: boolean;
  pendingUpload: unknown | null;
  confirmingUpload: boolean;
  uploadStatusKind: string;
  saveState: string;
  pendingUploadError: string | null;
  activePreview: unknown | null;
  activeItem: unknown | null;
  detailsSaving: boolean;
  externalError: string | null;
};

export function deriveCaptureV2MachineState(args: DeriveArgs): CaptureV2MachineState {
  if (args.externalError || args.pendingUploadError || args.uploadStatusKind === "error") {
    return "error";
  }
  if (args.detailsSaving) return "saving_details";
  if (args.advancingStop) return "advancing_stop";
  if (args.openingNextPicker || args.openingPicker) {
    return args.openingNextPicker ? "opening_next_picker" : "opening_picker";
  }
  if (args.confirmingUpload) return "upload_confirming";
  if (args.pendingUpload) return "pending_upload_preview";
  if (args.uploadStatusKind === "uploading" || args.uploadStatusKind === "saving") {
    return "uploading";
  }
  if (args.saveState === "saving") return "saving_details";
  if (args.saveState === "dirty") return "draft_dirty";
  if (args.activePreview && args.activeItem) return "active_item_ready";
  return "empty";
}

export function isPrimaryActionDisabled(state: CaptureV2MachineState): boolean {
  return (
    state === "opening_picker" ||
    state === "pending_upload_preview" ||
    state === "upload_confirming" ||
    state === "uploading" ||
    state === "saving_details" ||
    state === "advancing_stop" ||
    state === "opening_next_picker"
  );
}

export function getPrimaryActionLabel(state: CaptureV2MachineState, isDesktop: boolean): string {
  switch (state) {
    case "empty":
      return isDesktop ? "Select Photos" : "Take Photo";
    case "opening_picker":
      return "Opening…";
    case "pending_upload_preview":
      return "Review Upload";
    case "upload_confirming":
      return "Attaching…";
    case "uploading":
      return "Uploading…";
    case "active_item_ready":
      return "Save & Next Stop";
    case "draft_dirty":
      return "Save Details";
    case "saving_details":
      return "Saving…";
    case "advancing_stop":
      return "Advancing…";
    case "opening_next_picker":
      return "Opening Camera…";
    case "error":
      return "Retry Capture";
    default:
      return "Capture";
  }
}

export function draftHasContent(draft: CaptureItemDraft | null): boolean {
  if (!draft) return false;
  return Boolean(
    draft.title.trim() ||
      draft.notes.trim() ||
      draft.classification ||
      draft.trade ||
      draft.tags.length > 0,
  );
}
