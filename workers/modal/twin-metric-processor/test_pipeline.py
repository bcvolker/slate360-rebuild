from pathlib import Path
from unittest.mock import patch

from pipeline import run_metric_processor
from test_helpers import write_matched_capture


def test_pipeline_records_preview_as_non_master_and_skips_gaussian(tmp_path: Path):
    depth, poses = write_matched_capture(tmp_path, n=2)
    preview = tmp_path / "preview_point_cloud.ply"
    preview.write_bytes(b"preview")

    fake_tsdf = {
        "voxelMm": 15,
        "geometryGlb": str(tmp_path / "out" / "geometry.glb"),
        "engineeringPly": str(tmp_path / "out" / "eng.ply"),
        "rawMasterPly": str(tmp_path / "out" / "raw.ply"),
        "mesh": None,
        "pairsIntegrated": 2,
        "componentCount": 1,
        "largestFraction": 1.0,
    }

    with patch("pipeline.integrate_tsdf", return_value=fake_tsdf):
        result = run_metric_processor(
            depth, poses, tmp_path / "out", preview_ply=preview, skip_gaussian=True
        )
    assert result["ok"] is True
    assert result["ingest"]["preview"]["usedAsMaster"] is False
    assert result["gaussian"]["skipped"] is True
    assert result["gaussian"]["pose_opt"] is False
    assert (tmp_path / "out" / "processing_manifest.json").is_file()
    assert (tmp_path / "out" / "qa.json").is_file()
    assert (tmp_path / "out" / "floor_slice.png").is_file()
    assert (tmp_path / "out" / "thumbnail.png").is_file()
    assert (tmp_path / "out" / "processing_master.ply").is_file()
