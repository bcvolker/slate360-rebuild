import "server-only";

/**
 * Kill switch for Modal GPU dispatch. Set `TWIN_GPU_HOLD=1` on Vercel (and
 * Trigger, if a research worker is live) to refuse new twin jobs without
 * deleting the worker. Unset it only after a written USD estimate is approved.
 *
 * Does not cancel a job that is already running on Modal.
 */
export class TwinGpuHoldError extends Error {
  constructor() {
    super(
      "GPU processing is on hold (TWIN_GPU_HOLD=1). No Modal job will be started until the hold is lifted after a cost estimate is approved.",
    );
    this.name = "TwinGpuHoldError";
  }
}

export function isTwinGpuHoldActive(): boolean {
  return process.env.TWIN_GPU_HOLD === "1";
}

export function assertTwinGpuHoldClear(): void {
  if (isTwinGpuHoldActive()) throw new TwinGpuHoldError();
}
