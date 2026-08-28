/**
 * Research-only policy: Gaussian save is independent of ATE.
 * ATE runs only when a genuine, non-degenerate ground-truth trajectory exists.
 * Never fabricate GT poses. Monocular scale is not metric.
 */

const IDENTITY_TOL = 1e-8;
const GT_SPAN_EPS = 1e-6;

export function isIdentityPose(pose, tol = IDENTITY_TOL) {
  if (!pose || pose.length !== 4) return false;
  for (let r = 0; r < 4; r++) {
    for (let c = 0; c < 4; c++) {
      const expected = r === c ? 1 : 0;
      if (Math.abs(Number(pose[r][c]) - expected) > tol) return false;
    }
  }
  return true;
}

export function translationSpan(poses) {
  if (!poses?.length) return 0;
  const xs = poses.map((p) => Number(p[0][3]));
  const ys = poses.map((p) => Number(p[1][3]));
  const zs = poses.map((p) => Number(p[2][3]));
  return Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys), Math.max(...zs) - Math.min(...zs));
}

/** Genuine GT: at least two poses, not all identity, non-degenerate translation span. */
export function hasGenuineGroundTruth(posesGt) {
  if (!Array.isArray(posesGt) || posesGt.length < 2) return false;
  if (posesGt.every((p) => isIdentityPose(p))) return false;
  return translationSpan(posesGt) >= GT_SPAN_EPS;
}

export function ateWhenNoGroundTruth() {
  return {
    ate: null,
    reason: "no_ground_truth",
    estimatedTrajectory: true,
    groundTruthTrajectory: false,
  };
}

/**
 * Mapping output is primary. Evaluation is optional post-processing.
 * saveGaussians is always invoked after mapping, even when ATE is skipped.
 */
export function finalizeNoGtReconstruction({
  posesGt = [],
  saveGaussians,
  computeAte,
  saveEstimatedTrajectory,
} = {}) {
  if (typeof saveEstimatedTrajectory === "function") saveEstimatedTrajectory();
  const genuine = hasGenuineGroundTruth(posesGt);
  let ate = null;
  let ateMeta = genuine ? null : ateWhenNoGroundTruth();
  if (genuine) {
    ate = computeAte();
  }
  if (typeof saveGaussians !== "function") throw new Error("saveGaussians is required");
  const plyPath = saveGaussians();
  return {
    plyPath,
    ate: genuine ? ate : null,
    ateMeta,
    savedPly: Boolean(plyPath),
  };
}
