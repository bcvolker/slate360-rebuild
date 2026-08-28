import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  ateWhenNoGroundTruth,
  finalizeNoGtReconstruction,
  hasGenuineGroundTruth,
} from "../engine/no-gt-eval.mjs";

const eye = [
  [1, 0, 0, 0],
  [0, 1, 0, 0],
  [0, 0, 1, 0],
  [0, 0, 0, 1],
];
const moved = [
  [1, 0, 0, 1.2],
  [0, 1, 0, 0],
  [0, 0, 1, 0.4],
  [0, 0, 0, 1],
];

describe("no-GT panorama save vs ATE", () => {
  it("saves Gaussian PLY without attempting ATE when GT is absent", () => {
    const calls = [];
    const identitySequence = [eye, eye, eye];
    assert.equal(hasGenuineGroundTruth(identitySequence), false);

    const result = finalizeNoGtReconstruction({
      posesGt: identitySequence,
      saveEstimatedTrajectory: () => calls.push("traj"),
      computeAte: () => {
        calls.push("ate");
        return 0.01;
      },
      saveGaussians: () => {
        calls.push("ply");
        return "point_cloud/final/point_cloud.ply";
      },
    });

    assert.deepEqual(calls, ["traj", "ply"]);
    assert.equal(result.ate, null);
    assert.equal(result.ateMeta.reason, "no_ground_truth");
    assert.equal(result.plyPath, "point_cloud/final/point_cloud.ply");
    assert.equal(result.savedPly, true);
    assert.equal(ateWhenNoGroundTruth().ate, null);
  });

  it("does not treat identity GT as a reconstruction failure", () => {
    const result = finalizeNoGtReconstruction({
      posesGt: [eye, eye],
      computeAte: () => {
        throw new Error("Umeyama should not run");
      },
      saveGaussians: () => "point_cloud/final/point_cloud.ply",
    });
    assert.equal(result.ateMeta.groundTruthTrajectory, false);
    assert.equal(result.ateMeta.estimatedTrajectory, true);
  });

  it("still computes ATE when genuine GT exists", () => {
    const calls = [];
    const result = finalizeNoGtReconstruction({
      posesGt: [eye, moved],
      computeAte: () => {
        calls.push("ate");
        return 0.42;
      },
      saveGaussians: () => {
        calls.push("ply");
        return "point_cloud/final/point_cloud.ply";
      },
    });
    assert.deepEqual(calls, ["ate", "ply"]);
    assert.equal(result.ate, 0.42);
    assert.equal(result.ateMeta, null);
  });
});
