import struct
import tempfile
from pathlib import Path

from depth_evidence import MAGIC, inspect_depth_evidence


def test_inspect_depth_evidence_round_trip():
    with tempfile.TemporaryDirectory() as directory:
        path = Path(directory) / "sample.s360depth"
        width, height = 2, 1
        depth = struct.pack("<2H", 1200, 2400)
        confidence = bytes([2, 1])
        rgb = b"jpeg"
        header = struct.pack("<dHHIII", 1722500000.0, width, height, len(depth), len(confidence), len(rgb))
        path.write_bytes(MAGIC + header + depth + confidence + rgb)

        report = inspect_depth_evidence(path)

        assert report["frameCount"] == 1
        assert report["dimensions"] == [{"width": 2, "height": 1}]
        assert report["depthBytes"] == 4
        assert report["confidenceBytes"] == 2
        assert report["rgbBytes"] == 4


if __name__ == "__main__":
    test_inspect_depth_evidence_round_trip()
    print("depth evidence test passed")
