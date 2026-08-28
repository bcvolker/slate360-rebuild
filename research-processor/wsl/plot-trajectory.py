"""Plot estimated camera trajectory (not metric). Research-only."""
from __future__ import annotations

import json
import sys
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np


def main() -> None:
    src = Path(sys.argv[1])
    dest = Path(sys.argv[2])
    data = json.loads(src.read_text(encoding="utf-8"))
    est = data.get("trj_est") or []
    pts = np.array([[p[0][3], p[1][3], p[2][3]] for p in est], dtype=np.float64)
    fig, axes = plt.subplots(1, 2, figsize=(10, 4.5), dpi=120)
    ax = axes[0]
    ax.plot(pts[:, 0], pts[:, 2], color="#00E699", linewidth=1.5)
    ax.scatter(pts[0, 0], pts[0, 2], c="white", s=24, zorder=3, label="start")
    ax.scatter(pts[-1, 0], pts[-1, 2], c="#00E699", s=24, zorder=3, label="end")
    ax.set_aspect("equal", adjustable="datalim")
    ax.set_title("Estimated trajectory (XZ top)")
    ax.set_xlabel("X (arbitrary units)")
    ax.set_ylabel("Z (arbitrary units)")
    ax.legend(loc="best", fontsize=8)
    ax.set_facecolor("#0B0F15")
    ax = axes[1]
    ax.plot(pts[:, 0], pts[:, 1], color="#A3AED0", linewidth=1.5)
    ax.set_aspect("equal", adjustable="datalim")
    ax.set_title("Estimated trajectory (XY side)")
    ax.set_xlabel("X (arbitrary units)")
    ax.set_ylabel("Y (arbitrary units)")
    ax.set_facecolor("#0B0F15")
    fig.patch.set_facecolor("#0B0F15")
    for a in axes:
        a.tick_params(colors="#F8FAFC")
        a.title.set_color("#FFFFFF")
        a.xaxis.label.set_color("#A3AED0")
        a.yaxis.label.set_color("#A3AED0")
        for spine in a.spines.values():
            spine.set_color("#A3AED0")
    fig.suptitle("Not metric — monocular scale", color="#A3AED0", fontsize=9)
    fig.tight_layout()
    dest.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(dest, facecolor=fig.get_facecolor())
    print(dest)


if __name__ == "__main__":
    main()
