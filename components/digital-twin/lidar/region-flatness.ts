import type { Vector3 } from "three";
import type { LidarPointData } from "./useLidarTiles";

export type RegionSummary = {
  pointCount: number;
  slopeDegrees: number;
  rmsDeviationM: number;
  minDeviationM: number;
  maxDeviationM: number;
};

export function regionFlatness(
  points: LidarPointData,
  start: Vector3,
  end: Vector3,
): RegionSummary | null {
  const minX = Math.min(start.x, end.x);
  const maxX = Math.max(start.x, end.x);
  const minY = Math.min(start.y, end.y);
  const maxY = Math.max(start.y, end.y);
  const selected: [number, number, number][] = [];
  for (let index = 0; index < points.deviations.length; index += 1) {
    const x = points.positions[index * 3];
    const y = points.positions[index * 3 + 1];
    if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
      selected.push([x, y, points.positions[index * 3 + 2]]);
    }
  }
  if (selected.length < 3) return null;

  const matrix = [
    [0, 0, 0, 0],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ];
  for (const [x, y, z] of selected) {
    matrix[0][0] += x * x;
    matrix[0][1] += x * y;
    matrix[0][2] += x;
    matrix[0][3] += x * z;
    matrix[1][0] += x * y;
    matrix[1][1] += y * y;
    matrix[1][2] += y;
    matrix[1][3] += y * z;
    matrix[2][0] += x;
    matrix[2][1] += y;
    matrix[2][2] += 1;
    matrix[2][3] += z;
  }
  for (let column = 0; column < 3; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < 3; row += 1) {
      if (Math.abs(matrix[row][column]) > Math.abs(matrix[pivot][column])) pivot = row;
    }
    if (Math.abs(matrix[pivot][column]) < 1e-9) return null;
    [matrix[column], matrix[pivot]] = [matrix[pivot], matrix[column]];
    const divisor = matrix[column][column];
    for (let cell = column; cell < 4; cell += 1) matrix[column][cell] /= divisor;
    for (let row = 0; row < 3; row += 1) {
      if (row === column) continue;
      const factor = matrix[row][column];
      for (let cell = column; cell < 4; cell += 1) {
        matrix[row][cell] -= factor * matrix[column][cell];
      }
    }
  }

  const [a, b, c] = matrix.map((row) => row[3]);
  const deviations = selected.map(([x, y, z]) => z - (a * x + b * y + c));
  return {
    pointCount: selected.length,
    slopeDegrees: (Math.atan(Math.hypot(a, b)) * 180) / Math.PI,
    rmsDeviationM: Math.sqrt(
      deviations.reduce((sum, value) => sum + value * value, 0) / deviations.length,
    ),
    minDeviationM: Math.min(...deviations),
    maxDeviationM: Math.max(...deviations),
  };
}
