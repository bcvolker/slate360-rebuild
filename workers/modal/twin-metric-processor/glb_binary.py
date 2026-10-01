"""Write GLB 2.0 with a real BIN chunk. Never embed a base64 data-URI buffer."""

from __future__ import annotations

import json
import struct
from pathlib import Path
from typing import Any

import numpy as np

GLB_MAGIC = b"glTF"
JSON_CHUNK = b"JSON"
BIN_CHUNK = b"BIN\x00"


def _pad(data: bytes, align: int = 4, fill: bytes = b" ") -> bytes:
    n = (-len(data)) % align
    return data if n == 0 else data + fill * n


def inspect_glb(path: str | Path) -> dict[str, Any]:
    raw = Path(path).read_bytes()
    if len(raw) < 20 or raw[:4] != GLB_MAGIC:
        return {"ok": False, "reason": "not_glb", "bytes": len(raw)}
    version, length = struct.unpack_from("<II", raw, 4)
    if version != 2:
        return {"ok": False, "reason": f"version_{version}", "bytes": len(raw)}
    offset = 12
    chunks: list[dict[str, Any]] = []
    json_doc: dict[str, Any] | None = None
    while offset + 8 <= len(raw) and offset < length:
        clen, ctype = struct.unpack_from("<I4s", raw, offset)
        offset += 8
        payload = raw[offset : offset + clen]
        offset += clen
        kind = ctype.decode("ascii", "replace")
        chunks.append({"type": kind, "length": clen})
        if ctype == JSON_CHUNK:
            json_doc = json.loads(payload.decode("utf-8"))
    if not json_doc:
        return {"ok": False, "reason": "no_json_chunk", "chunks": chunks, "bytes": len(raw)}
    buffers = json_doc.get("buffers") or []
    if not buffers:
        return {"ok": False, "reason": "no_buffers", "chunks": chunks, "bytes": len(raw)}
    uri = buffers[0].get("uri")
    if isinstance(uri, str) and uri.startswith("data:"):
        return {"ok": False, "reason": "data_uri_buffer", "chunks": chunks, "bytes": len(raw)}
    kinds = [c["type"] for c in chunks]
    if "BIN\x00" not in kinds and "BIN" not in kinds:
        return {"ok": False, "reason": "no_bin_chunk", "chunks": chunks, "jsonKeys": list(json_doc), "bytes": len(raw)}
    return {
        "ok": True,
        "bytes": len(raw),
        "version": version,
        "chunks": chunks,
        "bufferUri": uri,
        "bufferByteLength": buffers[0].get("byteLength"),
    }


def write_glb(path: str | Path, vertices: np.ndarray, faces: np.ndarray, *,
              normals: np.ndarray | None = None, colors: np.ndarray | None = None) -> dict[str, Any]:
    verts = np.ascontiguousarray(vertices, dtype=np.float32)
    tris = np.ascontiguousarray(faces, dtype=np.uint32)
    if verts.ndim != 2 or verts.shape[1] != 3:
        raise ValueError("vertices must be Nx3")
    if tris.ndim != 2 or tris.shape[1] != 3:
        raise ValueError("faces must be Mx3")
    n = int(verts.shape[0])
    parts: list[bytes] = []
    views: list[dict[str, Any]] = []
    accessors: list[dict[str, Any]] = []

    def add_view(blob: bytes, target: int) -> int:
        blob = _pad(blob, 4, b"\x00")
        idx = len(views)
        views.append({"buffer": 0, "byteOffset": sum(len(p) for p in parts), "byteLength": len(blob), "target": target})
        parts.append(blob)
        return idx

    pos = verts.tobytes()
    amin = verts.min(0).tolist()
    amax = verts.max(0).tolist()
    accessors.append({
        "bufferView": add_view(pos, 34962),
        "componentType": 5126, "count": n, "type": "VEC3",
        "min": amin, "max": amax,
    })
    attrs: dict[str, int] = {"POSITION": 0}

    if normals is None or len(normals) != n:
        normals = np.zeros((n, 3), np.float32)
        normals[:, 1] = 1.0
    nrm = np.ascontiguousarray(normals, dtype=np.float32)
    accessors.append({
        "bufferView": add_view(nrm.tobytes(), 34962),
        "componentType": 5126, "count": n, "type": "VEC3",
    })
    attrs["NORMAL"] = 1

    if colors is not None and len(colors) == n:
        col = np.ascontiguousarray(colors, dtype=np.float32)
        if col.shape[1] > 3:
            col = col[:, :3]
        accessors.append({
            "bufferView": add_view(col.tobytes(), 34962),
            "componentType": 5126, "count": n, "type": "VEC3",
        })
        attrs["COLOR_0"] = 2

    idx_view = add_view(tris.tobytes(), 34963)
    accessors.append({
        "bufferView": idx_view, "componentType": 5125, "count": int(tris.size), "type": "SCALAR",
    })
    bin_blob = b"".join(parts)
    doc = {
        "asset": {"version": "2.0", "generator": "slate360-glb-binary"},
        "scene": 0,
        "scenes": [{"nodes": [0]}],
        "nodes": [{"mesh": 0}],
        "meshes": [{"primitives": [{"attributes": attrs, "indices": len(accessors) - 1, "mode": 4}]}],
        "accessors": accessors,
        "bufferViews": views,
        "buffers": [{"byteLength": len(bin_blob)}],
    }
    json_blob = _pad(json.dumps(doc, separators=(",", ":")).encode("utf-8"), 4, b" ")
    json_chunk = struct.pack("<I4s", len(json_blob), JSON_CHUNK) + json_blob
    bin_chunk = struct.pack("<I4s", len(bin_blob), BIN_CHUNK) + bin_blob
    body = json_chunk + bin_chunk
    header = struct.pack("<4sII", GLB_MAGIC, 2, 12 + len(body))
    dest = Path(path)
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(header + body)
    info = inspect_glb(dest)
    if not info.get("ok"):
        raise RuntimeError(f"wrote invalid GLB: {info}")
    return info


def write_open3d_mesh_glb(path: str | Path, mesh: Any) -> dict[str, Any]:
    verts = np.asarray(mesh.vertices)
    faces = np.asarray(mesh.triangles)
    if not mesh.has_vertex_normals() or len(mesh.vertex_normals) != len(mesh.vertices):
        mesh.compute_vertex_normals()
    normals = np.asarray(mesh.vertex_normals)
    colors = np.asarray(mesh.vertex_colors) if mesh.has_vertex_colors() else None
    return write_glb(path, verts, faces, normals=normals, colors=colors)
