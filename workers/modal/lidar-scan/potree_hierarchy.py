"""PotreeConverter 2.x binary output parsing for the Track L bridge.

Real 2.1.1 output is metadata.json + hierarchy.bin + octree.bin. hierarchy.bin
is chunks of 22-byte little-endian records:

    uint8 type (0=NORMAL, 1=LEAF, 2=PROXY) | uint8 childMask | uint32 numPoints
    | int64 byteOffset | int64 byteSize

The first chunk starts at offset 0 with size metadata.hierarchy.firstChunkSize.
Within a chunk, record 0 describes the chunk's root node (for sub-chunks this
is the proxy node itself, carrying its REAL type and octree location); each
non-proxy record's childMask appends child records later in the same chunk in
processing order; a PROXY record (other than record 0) carries the byte range
of its own sub-chunk inside hierarchy.bin.

Child octant bit->axis mapping is bit0=z, bit1=y, bit2=x (potree
OctreeLoader.createChildAABB) — NOT bit0=x.
"""

from __future__ import annotations

import json
import struct
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import numpy as np

RECORD = struct.Struct("<BBIqq")
NODE_NORMAL, NODE_LEAF, NODE_PROXY = 0, 1, 2


@dataclass
class PotreeNode:
    name: str
    num_points: int
    byte_offset: int
    byte_size: int
    leaf: bool


@dataclass
class AttributeLayout:
    stride: int
    position_offset: int
    color_offset: int
    color_element_size: int  # 1 (uint8) or 2 (uint16)
    color_elements: int


def read_metadata(raw_output: Path) -> dict[str, Any]:
    path = raw_output / "metadata.json"
    if not path.is_file():
        raise RuntimeError(
            "PotreeConverter produced no metadata.json — expected 2.x output "
            f"in {raw_output}"
        )
    metadata = json.loads(path.read_text(encoding="utf-8"))
    encoding = str(metadata.get("encoding") or "DEFAULT").upper()
    if encoding == "BROTLI":
        raise RuntimeError(
            "BROTLI-encoded octree is not supported by this bridge — run "
            "PotreeConverter without --encoding BROTLI (the default is uncompressed)"
        )
    return metadata


def attribute_layout(metadata: dict[str, Any]) -> AttributeLayout:
    attrs = metadata.get("attributes")
    if not isinstance(attrs, list) or not attrs:
        raise RuntimeError("metadata.json has no attributes[] list (unsupported converter output)")
    stride = 0
    position_offset: int | None = None
    color_offset: int | None = None
    color_element_size = 2
    color_elements = 4
    for item in attrs:
        if not isinstance(item, dict):
            raise RuntimeError("metadata attributes[] entry is not an object")
        name = str(item.get("name") or "").lower()
        size = int(item.get("size") or 0)
        num_elements = int(item.get("numElements") or 0)
        element_size = size // num_elements if num_elements else 0
        if name in {"position", "position_cartesian"}:
            if element_size != 4:
                raise RuntimeError(f"position attribute is not int32 (elementSize={element_size})")
            position_offset = stride
        elif name in {"rgba", "rgb", "color_packed"}:
            color_offset = stride
            color_element_size = element_size
            color_elements = num_elements
        stride += size
    if position_offset is None:
        raise RuntimeError("metadata attributes[] has no position attribute")
    if stride <= 0:
        raise RuntimeError("metadata attributes[] stride computed as 0")
    return AttributeLayout(
        stride=stride,
        position_offset=position_offset,
        color_offset=-1 if color_offset is None else color_offset,
        color_element_size=color_element_size,
        color_elements=color_elements,
    )


def walk_hierarchy(hierarchy_bin: bytes, first_chunk_size: int) -> list[PotreeNode]:
    """Faithful port of potree OctreeLoader.parseHierarchy over all chunks."""
    if first_chunk_size <= 0 or first_chunk_size % RECORD.size:
        raise RuntimeError(f"Invalid firstChunkSize {first_chunk_size}")
    if len(hierarchy_bin) < first_chunk_size:
        raise RuntimeError("hierarchy.bin shorter than firstChunkSize")

    nodes: dict[str, PotreeNode] = {}
    pending: list[tuple[str, int, int]] = [("r", 0, first_chunk_size)]

    while pending:
        chunk_root, offset, size = pending.pop()
        if size <= 0 or size % RECORD.size:
            raise RuntimeError(f"Corrupt hierarchy chunk for {chunk_root}: size {size}")
        if offset + size > len(hierarchy_bin):
            raise RuntimeError(f"Hierarchy chunk for {chunk_root} exceeds file bounds")
        count = size // RECORD.size
        local: list[str | None] = [None] * count
        local[0] = chunk_root
        next_slot = 1
        for i in range(count):
            name = local[i]
            if name is None:
                raise RuntimeError(f"Hierarchy chunk for {chunk_root}: record {i} has no owner")
            node_type, child_mask, num_points, byte_offset, byte_size = RECORD.unpack_from(
                hierarchy_bin, offset + i * RECORD.size
            )
            if node_type == NODE_PROXY and i > 0:
                # Sub-chunk pointer; the node's real record is that chunk's record 0.
                pending.append((name, byte_offset, byte_size))
                continue
            if name in nodes:
                raise RuntimeError(f"Duplicate hierarchy node {name}")
            nodes[name] = PotreeNode(
                name=name,
                num_points=int(num_points),
                byte_offset=int(byte_offset),
                byte_size=int(byte_size),
                leaf=node_type == NODE_LEAF,
            )
            for child in range(8):
                if child_mask & (1 << child):
                    if next_slot >= count:
                        raise RuntimeError(
                            f"Hierarchy chunk for {chunk_root}: childMask overflows chunk"
                        )
                    local[next_slot] = name + str(child)
                    next_slot += 1
    if "r" not in nodes:
        raise RuntimeError("Hierarchy walk produced no root node")
    return sorted(nodes.values(), key=lambda n: n.name)


def node_bounds(
    root_lower: np.ndarray, root_upper: np.ndarray, name: str
) -> tuple[np.ndarray, np.ndarray]:
    """Octant bounds using potree's bit0=z / bit1=y / bit2=x mapping."""
    lower = root_lower.astype(np.float64, copy=True)
    upper = root_upper.astype(np.float64, copy=True)
    for digit in name[1:]:
        child = int(digit)
        midpoint = (lower + upper) / 2.0
        for axis, bit in ((0, 0b100), (1, 0b010), (2, 0b001)):
            if child & bit:
                lower[axis] = midpoint[axis]
            else:
                upper[axis] = midpoint[axis]
    return lower, upper


def repack_node(
    payload: bytes,
    count: int,
    layout: AttributeLayout,
    in_scale: np.ndarray,
    in_offset: np.ndarray,
    out_scale: float,
    out_offset: np.ndarray,
) -> bytes:
    """Repack a raw uncompressed octree.bin node into the viewer contract:
    stride 16, int32 XYZ at 0 (out_scale/out_offset encoding), uint8 RGB at 12,
    one pad byte."""
    if count <= 0:
        return b""
    expected = count * layout.stride
    if len(payload) < expected:
        raise RuntimeError(
            f"Node payload too small: {len(payload)} bytes for {count} points "
            f"(stride {layout.stride})"
        )
    raw = np.frombuffer(payload, dtype=np.uint8, count=expected).reshape(count, layout.stride)

    pos_raw = (
        raw[:, layout.position_offset : layout.position_offset + 12]
        .copy()
        .view("<i4")
        .reshape(count, 3)
        .astype(np.float64)
    )
    world = pos_raw * in_scale.reshape(1, 3) + in_offset.reshape(1, 3)
    out_int = np.round((world - out_offset.reshape(1, 3)) / out_scale).astype("<i4")

    if layout.color_offset >= 0:
        span = layout.color_element_size * min(3, layout.color_elements)
        color_bytes = raw[:, layout.color_offset : layout.color_offset + span].copy()
        if layout.color_element_size == 2:
            rgb16 = color_bytes.view("<u2").reshape(count, -1)[:, :3].astype(np.uint16)
            # LAS 16-bit color: high byte is the 8-bit value.
            rgb = (rgb16 >> 8).astype(np.uint8)
        else:
            rgb = color_bytes.reshape(count, -1)[:, :3].astype(np.uint8)
    else:
        rgb = np.full((count, 3), 255, dtype=np.uint8)

    out = np.zeros((count, 16), dtype=np.uint8)
    out[:, 0:12] = out_int.view(np.uint8).reshape(count, 12)
    out[:, 12:15] = rgb
    return out.tobytes()
