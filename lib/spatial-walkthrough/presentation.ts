/** Per-clip presentation. Never CSS-rotate the ERP sphere to fake a level capture. */

export type Stabilization = "none" | "flowstate" | "other";
export type PresentationSource = "master" | "walkthrough";

export type ClipPresentation = {
  horizonLocked: boolean;
  stabilization: Stabilization;
  levelOffsetPitchDeg: number;
  headingOffsetYawDeg: number;
  sourceDerivative: PresentationSource;
  reexportRequired: boolean;
};

export const HOUSEWALK_PRESENTATION: ClipPresentation = {
  horizonLocked: false,
  stabilization: "none",
  levelOffsetPitchDeg: 0,
  headingOffsetYawDeg: 0,
  sourceDerivative: "walkthrough",
  reexportRequired: true,
};

export const REEXPORT_FROM_STUDIO_REQUIRED = "REEXPORT_FROM_STUDIO_REQUIRED" as const;

export const HORIZON_REEXPORT_WORKFLOW = [
  "RAW INSV (immutable MASTER)",
  "Insta360 Studio export with FlowState + Horizon Lock",
  "CLIENT walkthrough proxy",
  "operator/privacy bake (no inpaint)",
  "web encode for /w/{token}",
] as const;
