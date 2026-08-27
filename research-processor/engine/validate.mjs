/** V0.1 internal gates — no LiDAR, never pass on PSNR alone. */

function finiteBox(min, max) {
  const vals = [...min, ...max];
  return vals.every((n) => Number.isFinite(n));
}

export function validateReconstruction({
  gaussianCount = 0,
  bounds = null,
  trajectorySpan = null,
  hasPly = false,
} = {}) {
  const flags = [];
  let verdict = "PASS";

  if (!hasPly) {
    flags.push({ id: "missing_ply", level: "FAIL", message: "No point_cloud.ply written." });
    return { verdict: "FAIL", flags, metric: false };
  }
  if (!Number.isFinite(gaussianCount) || gaussianCount < 500) {
    flags.push({
      id: "low_count",
      level: "FAIL",
      message: `Gaussian count ${gaussianCount} is empty or too low.`,
    });
  }

  if (!bounds || !finiteBox(bounds.min, bounds.max)) {
    flags.push({ id: "nan_bounds", level: "FAIL", message: "Bounding box contains non-finite values." });
  } else {
    const size = bounds.max.map((v, i) => v - bounds.min[i]);
    const diag = Math.hypot(...size);
    const maxAxis = Math.max(...size);
    const minAxis = Math.min(...size);
    if (diag > 1e6) {
      flags.push({ id: "exploding", level: "FAIL", message: `Bounding box exploded (diag=${diag.toFixed(2)}).` });
    }
    if (diag < 0.15) {
      flags.push({ id: "tiny", level: "FAIL", message: "Bounding box is near-zero — likely collapse." });
    }
    if (maxAxis > 0 && minAxis / maxAxis > 0.85 && size[1] > 0.5 * maxAxis) {
      flags.push({
        id: "isotropic_ball",
        level: "WARNING",
        message: "Extents are nearly isotropic — inspect Top view for a sphere collapse.",
      });
    }
    bounds = { ...bounds, size, diagonal: diag };
  }

  if (trajectorySpan != null && Number.isFinite(trajectorySpan) && trajectorySpan < 0.2) {
    flags.push({
      id: "traj_blob",
      level: "FAIL",
      message: "Camera trajectory span is near zero — cameras collapsed into a blob.",
    });
  }

  if (flags.some((f) => f.level === "FAIL")) verdict = "FAIL";
  else if (flags.some((f) => f.level === "WARNING")) verdict = "WARNING";

  return { verdict, flags, metric: false, bounds };
}
