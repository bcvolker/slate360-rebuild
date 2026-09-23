export function pinPressCancelledByMove(dx: number, dy: number) {
  return Math.hypot(dx, dy) > 10;
}

/** Opens the native picker in the current user-activation frame. */
export function openNativePickerInGesture(input: HTMLInputElement) {
  input.value = "";
  input.click();
}

/**
 * The delayed CameraViewfinder click is only for walks that have no capture
 * context. Plan capture registers a synchronous picker, so this must stay false
 * or the phone opens a second file dialog.
 */
export function shouldOpenDeferredCameraPicker(input: {
  mounted: boolean;
  autoOpenCamera: boolean;
  hasCaptureContext: boolean;
}) {
  return input.mounted && input.autoOpenCamera && !input.hasCaptureContext;
}

/** After a plan-pin save, Save & Next returns to the plan. Other saves request the next capture. */
export function walkModeAfterPlanSave(input: { fromPlanPin?: boolean; armedReturn: boolean }): "plan" | "camera" {
  if (input.fromPlanPin || input.armedReturn) return "plan";
  return "camera";
}
