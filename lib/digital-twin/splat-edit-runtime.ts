import * as THREE from "three";
import {
  SplatEdit,
  SplatEditSdf,
  SplatEditSdfType,
  SplatEditRgbaBlendMode,
  type SplatMesh,
} from "@sparkjsdev/spark";
import type { TwinEditList, TwinEditListOp, TwinEditSdfType, TwinEditBlendMode } from "./edit-list-types";

const SDF_TYPE: Record<TwinEditSdfType, SplatEditSdfType> = {
  plane: SplatEditSdfType.PLANE,
  sphere: SplatEditSdfType.SPHERE,
  box: SplatEditSdfType.BOX,
  cylinder: SplatEditSdfType.CYLINDER,
  ellipsoid: SplatEditSdfType.ELLIPSOID,
};

const BLEND_MODE: Record<TwinEditBlendMode, SplatEditRgbaBlendMode> = {
  multiply: SplatEditRgbaBlendMode.MULTIPLY,
  set_rgb: SplatEditRgbaBlendMode.SET_RGB,
  add_rgba: SplatEditRgbaBlendMode.ADD_RGBA,
};

function clearMeshEdits(mesh: SplatMesh) {
  const stale = mesh.children.filter((child) => child instanceof SplatEdit);
  for (const child of stale) {
    mesh.remove(child);
  }
}

function buildSdf(op: TwinEditListOp): SplatEditSdf {
  const color = op.color ?? [1, 1, 1];
  const sdf = new SplatEditSdf({
    type: SDF_TYPE[op.sdfType] ?? SplatEditSdfType.SPHERE,
    radius: op.radius ?? 0.5,
    opacity: op.opacity ?? (op.tool === "erase" ? 0 : 1),
    color: new THREE.Color(color[0], color[1], color[2]),
    invert: op.invert ?? false,
  });
  if (op.displace) {
    sdf.displace.set(op.displace[0], op.displace[1], op.displace[2]);
  }
  return sdf;
}

function buildEdit(op: TwinEditListOp): SplatEdit {
  const edit = new SplatEdit({
    rgbaBlendMode: BLEND_MODE[op.rgbaBlendMode ?? "multiply"],
    sdfSmooth: op.sdfSmooth ?? 0.1,
    softEdge: op.softEdge ?? 0.05,
    invert: op.invert ?? false,
  });
  const sdf = buildSdf(op);
  edit.addSdf(sdf);
  edit.position.set(op.position[0], op.position[1], op.position[2]);
  if (op.rotation) {
    edit.rotation.set(op.rotation[0], op.rotation[1], op.rotation[2]);
  }
  const scale = op.scale ?? op.size;
  if (scale) {
    edit.scale.set(scale[0], scale[1], scale[2]);
  }
  return edit;
}

/** Imperatively attach SplatEdit objects to a loaded SplatMesh (not R3F children). */
export function applyEditListToMesh(mesh: SplatMesh, ops: TwinEditList) {
  clearMeshEdits(mesh);
  for (const op of ops) {
    if (op.enabled === false) continue;
    mesh.add(buildEdit(op));
  }
}

/**
 * Create a horizontal-plane SplatEdit for the sweep animation.
 * The caller owns the edit: add it to the mesh, animate .position.y,
 * then remove it when done.
 */
export function createSweepEdit(): SplatEdit {
  const edit = new SplatEdit({
    rgbaBlendMode: SplatEditRgbaBlendMode.MULTIPLY,
    sdfSmooth: 0.05,
    softEdge: 0.02,
    invert: false,
  });
  const sdf = new SplatEditSdf({
    type: SplatEditSdfType.PLANE,
    radius: 0.5,
    opacity: 0,
    color: new THREE.Color(1, 1, 1),
    invert: false,
  });
  edit.addSdf(sdf);
  return edit;
}
