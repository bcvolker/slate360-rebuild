"""Commercial-space ground-truth tests for floorplan.py."""
from __future__ import annotations
import math, sys
from pathlib import Path
import numpy as np
sys.path.insert(0, str(Path(__file__).parent))
from floorplan import compute_plan, to_square_feet

RNG = np.random.default_rng(7)
NOISE = 0.015

def wall(p0, p1, h, fz, density=700):
    (x0,y0),(x1,y1)=p0,p1
    L=math.hypot(x1-x0,y1-y0); n=max(60,int(L*density)); t=RNG.random(n)
    pts=np.column_stack([x0+(x1-x0)*t, y0+(y1-y0)*t, fz+RNG.random(n)*h])
    return pts+RNG.normal(0,NOISE,pts.shape)

def slab(x0,x1,y0,y1,z,n=6000):
    return np.column_stack([RNG.uniform(x0,x1,n),RNG.uniform(y0,y1,n),
                            np.full(n,z)+RNG.normal(0,NOISE,n)])

def rect_walls(x0,y0,x1,y1,h,fz,density=700):
    c=[(x0,y0),(x1,y0),(x1,y1),(x0,y1)]
    return [wall(c[i],c[(i+1)%4],h,fz,density) for i in range(4)]

def office_floor():
    """20 x 12 m floor plate: 3 tenant rooms + corridor, 4 columns, 1 cubicle partition."""
    H, FZ = 3.0, 0.0
    parts=[slab(0,20,0,12,FZ,n=20000), slab(0,20,0,12,FZ+H,n=20000)]
    parts += rect_walls(0,0,20,12,H,FZ)               # building envelope
    # interior demising walls creating 3 rooms along the north side
    parts.append(wall((0,8),(20,8),H,FZ))             # corridor wall
    parts.append(wall((6,8),(6,12),H,FZ))             # tenant divider 1
    parts.append(wall((13,8),(13,12),H,FZ))           # tenant divider 2
    # structural columns (0.5 m square) on a grid, full height
    for cx,cy in [(5,4),(10,4),(15,4),(10,10)]:
        parts += rect_walls(cx-0.25,cy-0.25,cx+0.25,cy+0.25,H,FZ,density=1600)
    # cubicle partition, only 1.5 m tall -> must be classified as partition, not structure
    parts.append(wall((3,2),(3,6),1.5,FZ))
    return np.vstack(parts)

def main():
    print("\nCommercial floor-plate extraction\n")
    plan = compute_plan(office_floor())
    ok = True
    print(f"  rooms found      : {plan.room_count}")
    for i,r in enumerate(plan.rooms[:8]):
        print(f"    room {i+1}: {r.area_m2:7.2f} m2 ({r.area_ft2:8.1f} ft2)  centroid={r.centroid}")
    print(f"  columns detected : {len(plan.columns)}  (true: 4)")
    print(f"  usable area      : {plan.usable_area_m2} m2 ({to_square_feet(plan.usable_area_m2)} ft2)")
    print(f"  ceiling height   : {plan.ceiling_height_m} m (true: 3.0)")
    print(f"  structural walls : {len(plan.structural_walls)}   partitions: {len(plan.partitions)}")
    print(f"  notes            : {plan.notes}")

    checks = {
      "multi-room (>=4 enclosed areas)": plan.room_count >= 4,
      "columns detected (>=3 of 4)": len(plan.columns) >= 3,
      "ceiling height within 5cm": plan.ceiling_height_m is not None and abs(plan.ceiling_height_m-3.0) <= 0.05,
      "partition separated from structure": len(plan.partitions) >= 1,
      "usable area positive": (plan.usable_area_m2 or 0) > 0,
    }
    print()
    for k,v in checks.items():
        print(f"  [{'PASS' if v else 'FAIL'}] {k}")
        ok = ok and v
    print()
    return 0 if ok else 1

if __name__=="__main__":
    raise SystemExit(main())

