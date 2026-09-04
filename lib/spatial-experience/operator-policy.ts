/** Commercial operator privacy. Never restore the 140° HouseWalk FoR clamp. */

export type OperatorPolicy = {
  captureSop: true;
  nadirRadiusMax: number;
  rearYawWidthMax: number;
  neverAboveHorizon: true;
};

export const COMMERCIAL_OPERATOR_POLICY: OperatorPolicy = {
  captureSop: true,
  nadirRadiusMax: 0.18,
  rearYawWidthMax: 28,
  neverAboveHorizon: true,
};

export function rejectBroadClamp(widthDeg: number, pitchMaxDeg: number): boolean {
  if (widthDeg > COMMERCIAL_OPERATOR_POLICY.rearYawWidthMax) return true;
  if (pitchMaxDeg > 0) return true;
  return false;
}

export function commercialRestrictView(operatorEnabled: boolean, widthDeg: number, pitchMaxDeg: number): boolean {
  if (!operatorEnabled) return false;
  if (rejectBroadClamp(widthDeg, pitchMaxDeg)) return false;
  return true;
}
