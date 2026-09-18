"""Portable directory hashing tests (docs/ops/ROOM213_MASK_PROVENANCE_2026-09-17.md).

`sha256_dir` must depend only on relative filenames and file contents, never on the
absolute path a directory happens to live at. No GPU. No network.
"""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from hashes import sha256_dir  # noqa: E402


def _make_tree(base: Path, files: dict[str, bytes]) -> Path:
    for name, content in files.items():
        p = base / name
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_bytes(content)
    return base


def test_identical_tree_under_two_absolute_roots_hashes_equal(tmp_path: Path):
    files = {"a.png": b"one", "b.png": b"two", "c.png": b"three"}
    root_a = _make_tree(tmp_path / "somewhere" / "deep" / "root_a", files)
    root_b = _make_tree(tmp_path / "elsewhere_entirely" / "root_b", files)
    assert str(root_a) != str(root_b)
    ha = sha256_dir(root_a, ("*.png",))
    hb = sha256_dir(root_b, ("*.png",))
    assert ha == hb, "identical relative content must hash identically regardless of absolute root"


def test_changed_bytes_change_the_hash(tmp_path: Path):
    root = _make_tree(tmp_path / "root", {"a.png": b"one", "b.png": b"two"})
    before = sha256_dir(root, ("*.png",))
    (root / "a.png").write_bytes(b"ONE-CHANGED")
    after = sha256_dir(root, ("*.png",))
    assert before != after


def test_renamed_relative_file_changes_the_hash(tmp_path: Path):
    root_a = _make_tree(tmp_path / "root_a", {"a.png": b"same-content"})
    root_b = _make_tree(tmp_path / "root_b", {"renamed.png": b"same-content"})
    ha = sha256_dir(root_a, ("*.png",))
    hb = sha256_dir(root_b, ("*.png",))
    assert ha != hb, "same bytes under a different relative filename must not collide"


def test_file_ordering_does_not_affect_result(tmp_path: Path):
    files = {"z.png": b"1", "a.png": b"2", "m.png": b"3", "b.png": b"4"}
    root_a = _make_tree(tmp_path / "order_a", files)
    # Same files, written to disk in a different order (directory iteration order is
    # not something Python controls, so this also exercises glob()'s own unspecified
    # order in addition to our explicit insertion order below).
    root_b = tmp_path / "order_b"
    root_b.mkdir()
    for name in ("m.png", "b.png", "z.png", "a.png"):
        (root_b / name).write_bytes(files[name])
    assert sha256_dir(root_a, ("*.png",)) == sha256_dir(root_b, ("*.png",))


def test_extra_or_missing_file_changes_the_hash(tmp_path: Path):
    root_a = _make_tree(tmp_path / "root_a", {"a.png": b"1", "b.png": b"2"})
    root_b = _make_tree(tmp_path / "root_b", {"a.png": b"1"})
    assert sha256_dir(root_a, ("*.png",)) != sha256_dir(root_b, ("*.png",))


def test_nested_subdirectories_are_relative_too(tmp_path: Path):
    files = {"sub/a.png": b"1", "sub/deeper/b.png": b"2"}
    root_a = _make_tree(tmp_path / "nested" / "root_a", files)
    root_b = _make_tree(tmp_path / "totally" / "different" / "root_b", files)
    assert sha256_dir(root_a, ("**/*.png",)) == sha256_dir(root_b, ("**/*.png",))
