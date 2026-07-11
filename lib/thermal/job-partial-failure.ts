import "server-only";

/**
 * R1 partial-failure semantics (Addendum H2/G1): a job that completes without
 * a result for every input capture must never read as a clean "complete".
 * Pulled out of job-callback.ts to keep that file under the file-size gate.
 */
export function computePartialFailure(
  inputIds: string[],
  resultCaptureIds: Set<string>,
  expectsPerCaptureResults: boolean,
): { failedCaptureIds: string[]; isPartial: boolean; errorLog: string | null } {
  const failedCaptureIds = expectsPerCaptureResults
    ? inputIds.filter((id) => !resultCaptureIds.has(id))
    : [];
  const isPartial = failedCaptureIds.length > 0 && resultCaptureIds.size > 0;
  const errorLog = isPartial
    ? `${resultCaptureIds.size}/${inputIds.length} processed — ${failedCaptureIds.length} failed`
    : null;
  return { failedCaptureIds, isPartial, errorLog };
}
