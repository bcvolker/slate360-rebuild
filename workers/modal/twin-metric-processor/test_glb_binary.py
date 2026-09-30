from pathlib import Path

import numpy as np
import open3d as o3d

from glb_binary import inspect_glb, write_glb, write_open3d_mesh_glb


def _box_mesh():
    mesh = o3d.geometry.TriangleMesh.create_box(1.0, 0.5, 0.8)
    mesh.compute_vertex_normals()
    mesh.vertex_colors = o3d.utility.Vector3dVector(
        np.full((len(mesh.vertices), 3), 0.6, dtype=np.float64)
    )
    return mesh


def test_write_glb_is_binary_with_bin_chunk(tmp_path: Path):
    mesh = _box_mesh()
    dest = tmp_path / "geometry.glb"
    info = write_open3d_mesh_glb(dest, mesh)
    assert info["ok"] is True
    raw = dest.read_bytes()
    assert raw[:4] == b"glTF"
    inspected = inspect_glb(dest)
    assert inspected["ok"] is True
    types = [c["type"] for c in inspected["chunks"]]
    assert "JSON" in types
    assert any(t.startswith("BIN") for t in types)
    assert inspected["bufferUri"] in (None, "")
    # JSON chunk must not swallow the whole file (the Open3D data-URI failure).
    json_chunk = next(c for c in inspected["chunks"] if c["type"] == "JSON")
    assert json_chunk["length"] < dest.stat().st_size * 0.5


def test_rejects_data_uri_container(tmp_path: Path):
    fake = tmp_path / "bad.glb"
    json_blob = b'{"buffers":[{"uri":"data:application/octet-stream;base64,AAAA","byteLength":4}]}'
    json_blob += b" " * ((-len(json_blob)) % 4)
    import struct
    chunk = struct.pack("<I4s", len(json_blob), b"JSON") + json_blob
    header = struct.pack("<4sII", b"glTF", 2, 12 + len(chunk))
    fake.write_bytes(header + chunk)
    info = inspect_glb(fake)
    assert info["ok"] is False
    assert info["reason"] in ("data_uri_buffer", "no_bin_chunk")


def test_write_glb_numpy(tmp_path: Path):
    verts = np.array([[0, 0, 0], [1, 0, 0], [0, 1, 0]], np.float32)
    faces = np.array([[0, 1, 2]], np.uint32)
    nrm = np.array([[0, 0, 1], [0, 0, 1], [0, 0, 1]], np.float32)
    col = np.array([[0.5, 0.4, 0.3], [0.5, 0.4, 0.3], [0.5, 0.4, 0.3]], np.float32)
    dest = tmp_path / "tri.glb"
    info = write_glb(dest, verts, faces, normals=nrm, colors=col)
    assert info["ok"] is True
    assert dest.stat().st_size > 200
