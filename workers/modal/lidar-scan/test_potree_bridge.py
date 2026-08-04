"""Converter-free unit tests for the PotreeConverter 2.x binary bridge.

These prove the hierarchy walker, octant-bounds mapping, and node repack
against hand-packed fixtures matching the documented 2.1.1 format, so CI can
run them without the converter binary. The full pipeline (real converter +
PDAL) is exercised by dispatching a synthetic-LAS lidar_scan job through the
deployed worker — see plan §7.10.

Run: python workers/modal/lidar-scan/test_potree_bridge.py
"""

from __future__ import annotations

import struct
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).parent))

from potree_hierarchy import (  # noqa: E402
    NODE_LEAF,
    NODE_NORMAL,
    NODE_PROXY,
    AttributeLayout,
    node_bounds,
    repack_node,
    walk_hierarchy,
)

RECORD = struct.Struct("<BBIqq")


def pack(*records: tuple[int, int, int, int, int]) -> bytes:
    return b"".join(RECORD.pack(*r) for r in records)


def test_walk_single_chunk() -> None:
    # r (NORMAL, children 0 and 2) -> r0 LEAF, r2 LEAF. Record order: r, r0, r2.
    chunk = pack(
        (NODE_NORMAL, 0b00000101, 10, 0, 160),
        (NODE_LEAF, 0, 4, 160, 64),
        (NODE_LEAF, 0, 6, 224, 96),
    )
    nodes = {n.name: n for n in walk_hierarchy(chunk, len(chunk))}
    assert set(nodes) == {"r", "r0", "r2"}, nodes
    assert nodes["r"].num_points == 10 and not nodes["r"].leaf
    assert nodes["r0"].leaf and nodes["r0"].byte_offset == 160 and nodes["r0"].byte_size == 64
    assert nodes["r2"].num_points == 6
    print("walk_single_chunk ok")


def test_walk_proxy_subchunk() -> None:
    # Root chunk: r (NORMAL, child 3) + r3 as PROXY pointing at a sub-chunk.
    # Sub-chunk record 0 is r3 itself (real record: LEAF with octree location).
    sub = pack((NODE_LEAF, 0, 7, 512, 112))
    root_chunk = pack(
        (NODE_NORMAL, 0b00001000, 12, 0, 192),
        (NODE_PROXY, 0, 0, 2 * RECORD.size, len(sub)),
    )
    blob = root_chunk + sub
    nodes = {n.name: n for n in walk_hierarchy(blob, len(root_chunk))}
    assert set(nodes) == {"r", "r3"}, nodes
    assert nodes["r3"].leaf and nodes["r3"].num_points == 7
    assert nodes["r3"].byte_offset == 512 and nodes["r3"].byte_size == 112
    print("walk_proxy_subchunk ok")


def test_node_bounds_bit_axes() -> None:
    lower = np.zeros(3)
    upper = np.array([2.0, 2.0, 2.0])
    # bit0 (child 1) = z axis
    lo, up = node_bounds(lower, upper, "r1")
    assert lo.tolist() == [0, 0, 1] and up.tolist() == [1, 1, 2], (lo, up)
    # bit2 (child 4) = x axis
    lo, up = node_bounds(lower, upper, "r4")
    assert lo.tolist() == [1, 0, 0] and up.tolist() == [2, 1, 1], (lo, up)
    print("node_bounds_bit_axes ok")


def test_repack_roundtrip_uint16_color() -> None:
    # Input layout mimics 2.1.1 LAS pf2: position int32x3 @0, rgba uint16x4 @12.
    layout = AttributeLayout(
        stride=20, position_offset=0, color_offset=12, color_element_size=2, color_elements=4
    )
    in_scale = np.array([0.001, 0.001, 0.002])  # deliberately non-uniform
    in_offset = np.array([10.0, 20.0, 30.0])
    world = np.array([[10.5, 20.25, 30.1], [11.999, 21.5, 31.75]])
    raw_int = np.round((world - in_offset) / in_scale).astype("<i4")
    rgb16 = np.array([[65535, 32768, 0, 65535], [255 << 8, 128 << 8, 64 << 8, 0]], dtype="<u2")
    payload = b""
    for i in range(2):
        payload += raw_int[i].tobytes() + rgb16[i].tobytes()

    out_scale = float(np.max(in_scale))
    out_offset = in_offset
    packed = repack_node(payload, 2, layout, in_scale, in_offset, out_scale, out_offset)
    assert len(packed) == 2 * 16

    out = np.frombuffer(packed, dtype=np.uint8).reshape(2, 16)
    decoded = out[:, 0:12].copy().view("<i4").astype(np.float64) * out_scale + out_offset
    assert np.allclose(decoded, world, atol=out_scale + 1e-9), (decoded, world)
    rgb = out[:, 12:15]
    assert rgb[0].tolist() == [255, 128, 0], rgb[0]
    assert rgb[1].tolist() == [255, 128, 64], rgb[1]
    print("repack_roundtrip_uint16_color ok")


def test_walk_rejects_corrupt() -> None:
    for blob, size in ((b"\x00" * 21, 21), (pack((NODE_NORMAL, 0b11111111, 1, 0, 22)), 22)):
        try:
            walk_hierarchy(blob, size)
        except RuntimeError:
            continue
        raise AssertionError("corrupt chunk was accepted")
    print("walk_rejects_corrupt ok")


if __name__ == "__main__":
    test_walk_single_chunk()
    test_walk_proxy_subchunk()
    test_node_bounds_bit_axes()
    test_repack_roundtrip_uint16_color()
    test_walk_rejects_corrupt()
    print("potree bridge tests: all passed")
