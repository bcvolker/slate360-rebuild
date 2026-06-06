/** Serialized SplatEdit ops — source .spz is never mutated. */

export type TwinEditTool = "crop" | "slice" | "erase" | "transform";

export type TwinEditSdfType =
  | "plane"
  | "sphere"
  | "box"
  | "cylinder"
  | "ellipsoid";

export type TwinEditBlendMode = "multiply" | "set_rgb" | "add_rgba";

export type TwinEditListOp = {
  id: string;
  tool: TwinEditTool;
  label?: string;
  enabled?: boolean;
  sdfType: TwinEditSdfType;
  position: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
  radius?: number;
  size?: [number, number, number];
  invert?: boolean;
  opacity?: number;
  color?: [number, number, number];
  displace?: [number, number, number];
  rgbaBlendMode?: TwinEditBlendMode;
  sdfSmooth?: number;
  softEdge?: number;
};

export type TwinEditList = TwinEditListOp[];

export function parseEditList(raw: unknown): TwinEditList {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (op): op is TwinEditListOp =>
      typeof op === "object" &&
      op !== null &&
      typeof (op as TwinEditListOp).id === "string" &&
      typeof (op as TwinEditListOp).tool === "string" &&
      Array.isArray((op as TwinEditListOp).position) &&
      (op as TwinEditListOp).position.length === 3,
  );
}

export function defaultOpForTool(
  tool: TwinEditTool,
  position: [number, number, number],
): TwinEditListOp {
  const id = crypto.randomUUID();
  const base = { id, tool, position, enabled: true } as const;

  if (tool === "erase") {
    return {
      ...base,
      label: "Erase",
      sdfType: "sphere",
      radius: 0.35,
      opacity: 0,
      rgbaBlendMode: "multiply",
      sdfSmooth: 0,
      softEdge: 0.02,
    };
  }
  if (tool === "slice") {
    return {
      ...base,
      label: "Slice",
      sdfType: "plane",
      opacity: 0,
      invert: false,
      rgbaBlendMode: "multiply",
      sdfSmooth: 0.05,
      softEdge: 0.02,
    };
  }
  if (tool === "crop") {
    return {
      ...base,
      label: "Crop",
      sdfType: "box",
      size: [1.2, 1.2, 1.2],
      scale: [1.2, 1.2, 1.2],
      invert: true,
      opacity: 0,
      rgbaBlendMode: "multiply",
      sdfSmooth: 0.08,
      softEdge: 0.03,
    };
  }
  return {
    ...base,
    label: "Transform",
    sdfType: "sphere",
    radius: 0.5,
    displace: [0, 0.1, 0],
    rgbaBlendMode: "add_rgba",
    sdfSmooth: 0.15,
    softEdge: 0.05,
  };
}
