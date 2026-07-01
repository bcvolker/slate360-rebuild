# Slate360 — Floor Plans, Measurements & Splat Editing
## 2D Plans from LiDAR/ARKit + Interactive Measurements + Desktop Splat Tools

**Current State:** iPhone LiDAR/ARKit + Insta360 → Gaussian splat (.spz) → three.js/Spark viewer  
**Goal:** Add 2D floor plans with measurements, partial capture handling, and desktop splat editing  
**Constraints:** Prefer on-device/OSS, avoid paid cloud APIs (Google Gemini allowed)

---

## 1. 2D Floor Plan Generation: Three Approaches Compared

### Approach A: Apple RoomPlan (Parametric)

**How it works:** On-device ARKit API outputs walls, doors, windows, openings as parametric geometry with dimensions.

```swift
// RoomPlan capture integration
import RoomPlan

class RoomCaptureController: UIViewController, RoomCaptureSessionDelegate {
    var captureSession: RoomCaptureSession?
    
    func startCapture() {
        captureSession = RoomCaptureSession()
        captureSession?.delegate = self
        captureSession?.run(configuration: RoomCaptureSession.Configuration())
    }
    
    func captureSession(_ session: RoomCaptureSession, didUpdate room: CapturedRoom) {
        // Real-time parametric updates
        // walls: [CapturedRoom.Object] with dimensions, types
        // doors/windows: [CapturedRoom.Object] with positions
    }
    
    func exportUSDZ() -> URL {
        // Export parametric model as USDZ
        return captureSession!.export(to: .usdZ)
    }
}
```

**Pros:**
- On-device, free, Apple-supported
- Accurate wall detection (±2-5cm typical)
- Automatic door/window classification
- Fast (real-time during capture)

**Cons:**
- iOS 16+ only, iPhone 12 Pro+/iPad Pro (LiDAR required)
- Struggles with: large open spaces (>10m), curved walls, reflective surfaces
- No exterior/outdoor capture
- Limited to single contiguous scan (merging multiple scans is manual)

**Accuracy:**
- Wall position: ±2-5cm
- Room area: ±3-8%
- Window/door placement: ±5-10cm

---

### Approach B: Point Cloud Plane Extraction (RANSAC)

**How it works:** Extract planes from LiDAR point cloud, cluster into walls/floors/ceilings, intersect to find corners.

```python
# tools/pointcloud_to_floorplan.py
import open3d as o3d
import numpy as np
from sklearn.cluster import DBSCAN
from scipy.spatial import ConvexHull

def extract_floorplan_from_pointcloud(ply_path, voxel_size=0.05):
    """
    Extract 2D floor plan from LiDAR point cloud.
    
    Pipeline:
    1. Downsample + outlier removal
    2. RANSAC plane detection (walls, floor, ceiling)
    3. Cluster parallel planes (same wall, different rooms)
    4. Project to 2D, find intersections
    5. Vectorize to SVG/DXF
    """
    # Load point cloud
    pcd = o3d.io.read_point_cloud(ply_path)
    
    # 1. Preprocess
    pcd_down = pcd.voxel_down_sample(voxel_size)
    pcd_clean, _ = pcd_down.remove_statistical_outlier(50, 2.0)
    
    # 2. Detect floor plane (lowest large horizontal plane)
    floor_plane, floor_inliers = detect_floor_plane(pcd_clean)
    
    # 3. Detect wall planes (vertical, above floor)
    wall_planes = detect_wall_planes(pcd_clean, floor_plane, floor_inliers)
    
    # 4. Project wall planes to floor level, find intersections
    wall_lines = project_walls_to_2d(wall_planes, floor_plane)
    
    # 5. Vectorize
    floorplan = vectorize_floorplan(wall_lines)
    
    return floorplan

def detect_floor_plane(pcd):
    """RANSAC for largest horizontal plane below 2m."""
    points = np.asarray(pcd.points)
    normals = np.asarray(pcd.normals) if pcd.has_normals() else estimate_normals(pcd)
    
    # Filter: horizontal normals (up = -Y in ARKit)
    horizontal_mask = np.abs(normals[:, 1]) > 0.9
    horizontal_points = points[horizontal_mask]
    
    # RANSAC plane fitting
    plane_model, inliers = pcd.segment_plane(
        distance_threshold=0.05,
        ransac_n=3,
        num_iterations=1000
    )
    
    return plane_model, inliers

def detect_wall_planes(pcd, floor_plane, floor_inliers):
    """Detect vertical wall planes using RANSAC + clustering."""
    points = np.asarray(pcd.points)
    normals = np.asarray(pcd.normals)
    
    # Filter: vertical normals, above floor, below ceiling
    vertical_mask = np.abs(normals[:, 1]) < 0.3  # Near-vertical
    height_mask = (points[:, 1] > -1.5) & (points[:, 1] < 2.5)  # Wall height range
    
    wall_points = pcd.select_by_index(
        np.where(vertical_mask & height_mask & ~floor_inliers)[0]
    )
    
    # Multi-plane RANSAC
    wall_planes = []
    remaining = wall_points
    
    for _ in range(20):  # Max 20 walls
        if len(remaining.points) < 100:
            break
            
        plane_model, inliers = remaining.segment_plane(
            distance_threshold=0.05,
            ransac_n=3,
            num_iterations=500
        )
        
        # Check if vertical (normal horizontal)
        normal = plane_model[:3]
        if np.abs(normal[1]) < 0.3:  # Wall is vertical
            wall_planes.append({
                'plane': plane_model,
                'inliers': inliers,
                'center': np.mean(np.asarray(remaining.points)[inliers], axis=0)
            })
        
        # Remove inliers, continue
        remaining = remaining.select_by_index(inliers, invert=True)
    
    return wall_planes

def project_walls_to_2d(wall_planes, floor_plane):
    """Project wall planes to floor height, create 2D lines."""
    lines = []
    floor_y = -floor_plane[3] / floor_plane[1]  # Y-intercept
    
    for wall in wall_planes:
        plane = wall['plane']
        normal = plane[:3]
        
        # Wall line is intersection of wall plane with floor plane
        # Simplified: project center point to floor, draw line perpendicular to wall normal
        center = wall['center']
        center_2d = np.array([center[0], center[2]])  # X, Z (floor plane)
        
        # Direction is perpendicular to wall normal (horizontal component)
        normal_2d = np.array([normal[0], normal[2]])
        normal_2d = normal_2d / np.linalg.norm(normal_2d)
        direction_2d = np.array([-normal_2d[1], normal_2d[0]])  # Perpendicular
        
        lines.append({
            'center': center_2d,
            'direction': direction_2d,
            'normal': normal_2d,
            'length': estimate_wall_length(wall)  # From point distribution
        })
    
    return lines
```

**Pros:**
- Works with any LiDAR data (not locked to RoomPlan API)
- Handles exterior + interior
- Can process after capture (batch)
- Merges multiple scans naturally

**Cons:**
- Lower accuracy than RoomPlan (±5-15cm)
- Manual door/window detection (ML or heuristic needed)
- Curved walls difficult
- Requires significant post-processing

**Accuracy:**
- Wall position: ±5-15cm (depends on point density)
- Room area: ±5-12%
- Door/window: Manual annotation or ML required

---

### Approach C: Derive from Gaussian Splat

**How it works:** Extract geometry from trained splat (depth rendering + point cloud extraction), then apply Approach B.

```python
# tools/splat_to_floorplan.py
import gsplat
import torch
import numpy as np

def extract_pointcloud_from_splat(spz_path, num_views=100):
    """
    Render depth from multiple views, backproject to point cloud.
    Higher density than raw LiDAR, but includes floater artifacts.
    """
    # Load splat
    splat_data = load_spz(spz_path)
    
    # Generate circular camera trajectory around scene
    cameras = generate_orbit_cameras(num_views, radius=5.0, height=1.6)
    
    pointclouds = []
    
    for cam in cameras:
        # Render depth
        depth = render_depth(splat_data, cam)
        
        # Backproject to 3D
        points = backproject_depth(depth, cam)
        pointclouds.append(points)
    
    # Merge
    full_pcd = np.concatenate(pointclouds, axis=0)
    
    # Remove outliers (floaters often isolated)
    pcd_o3d = o3d.geometry.PointCloud()
    pcd_o3d.points = o3d.utility.Vector3dVector(full_pcd)
    pcd_clean, _ = pcd_o3d.remove_statistical_outlier(50, 1.0)
    
    # Now apply Approach B (RANSAC plane extraction)
    floorplan = extract_floorplan_from_pointcloud(pcd_clean)
    
    return floorplan
```

**Pros:**
- Uses final trained model (fills gaps, completes surfaces)
- High density from multi-view rendering
- Natural integration with splat workflow

**Cons:**
- Floaters create false walls (need cleanup)
- Slower (requires splat training first)
- Accuracy limited by splat quality
- No better than Approach B for wall detection

**Accuracy:** Same as Approach B, but potentially more complete coverage.

---

## Recommendation: Hybrid Approach

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         FLOOR PLAN PIPELINE                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  CAPTURE (iPhone)                                                           │
│  ├── RoomPlan scan (per room, 30-60s) ─────────┐                           │
│  └── Continuous LiDAR + 360 stills ────────────┼──┐                         │
│                                                 │  │                         │
│  ON-DEVICE (Swift)                            │  │                         │
│  ├── RoomPlan → parametric USDZ ──────────────┘  │                         │
│  └── LiDAR → point cloud PLY ────────────────────┘                         │
│                                                    │                         │
│  CLOUD PROCESSING (Python/Open3D)                                          │
│  ├── IF RoomPlan available:                                                  │
│  │   ├── Parse USDZ → walls/doors/windows (accurate)                       │
│  │   ├── Convert to 2D SVG with dimensions                                 │
│  │   └── Flag: "RoomPlan verified" (higher accuracy confidence)            │
│  │                                                                           │
│  ├── IF no RoomPlan OR exterior:                                           │
│  │   ├── Point cloud → RANSAC plane extraction (Approach B)                 │
│  │   ├── Heuristic door/window detection (height-based)                    │
│  │   └── Flag: "LiDAR estimated" (lower confidence)                         │
│  │                                                                           │
│  ├── MERGE (if both available):                                              │
│  │   ├── RoomPlan interior (accurate) +                                     │
│  │   ├── Point cloud exterior footprint                                     │
│  │   └── Align via ICP (Iterative Closest Point)                            │
│  │                                                                           │
│  └── OUTPUT: GeoJSON floor plan + metadata                                  │
│              "accuracy_tier": "roomplan" | "lidar" | "merged"              │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

**Implementation:**
- **On-device:** RoomPlan when available (iOS 16+, LiDAR device)
- **Fallback:** Point cloud RANSAC for non-LiDAR or exterior
- **Merge:** ICP alignment of RoomPlan interior + point cloud exterior

---

## 2. Interactive Measurement UI

### Web Canvas Architecture

```tsx
// components/floorplan/FloorPlanCanvas.tsx
'use client';

import { useRef, useState, useCallback } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls, Grid } from '@react-three/drei';
import * as THREE from 'three';

// 2D orthographic canvas for floor plan editing
export function FloorPlanEditor({ floorplanData }: { floorplanData: FloorPlanGeoJSON }) {
  const [mode, setMode] = useState<'select' | 'measure-polygon' | 'measure-line'>('select');
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [activeMeasurement, setActiveMeasurement] = useState<Partial<Measurement> | null>(null);
  
  // Scale: pixels per meter (adaptive zoom)
  const [scale, setScale] = useState(50); // 50px = 1 meter
  
  return (
    <div className="w-full h-full relative">
      {/* Toolbar */}
      <FloorPlanToolbar mode={mode} onModeChange={setMode} scale={scale} />
      
      {/* Main canvas */}
      <Canvas
        orthographic
        camera={{ zoom: scale, position: [0, 10, 0], up: [0, 0, -1] }}
        style={{ background: '#0B0F15' }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} />
        
        {/* Floor plan geometry */}
        <FloorPlanGeometry data={floorplanData} />
        
        {/* Measurements layer */}
        <MeasurementsLayer
          measurements={measurements}
          activeMeasurement={activeMeasurement}
          onUpdate={setActiveMeasurement}
        />
        
        {/* Interaction handler */}
        <MeasurementInteraction
          mode={mode}
          onComplete={(m) => {
            setMeasurements([...measurements, m as Measurement]);
            setActiveMeasurement(null);
          }}
          onUpdate={setActiveMeasurement}
        />
        
        {/* Controls: pan/zoom only (no rotate in 2D) */}
        <OrbitControls
          enableRotate={false}
          enablePan={true}
          zoomSpeed={0.5}
          minZoom={10}
          maxZoom={200}
          onZoom={(e) => setScale(e.target.zoom)}
        />
      </Canvas>
      
      {/* Measurement panel */}
      <MeasurementSidebar measurements={measurements} onDelete={(id) => {
        setMeasurements(measurements.filter(m => m.id !== id));
      }} />
    </div>
  );
}

// Polygon area measurement
function PolygonMeasurementTool({ onComplete }: { onComplete: (m: Measurement) => void }) {
  const [points, setPoints] = useState<THREE.Vector2[]>([]);
  const { camera, scene } = useThree();
  
  const handleClick = useCallback((e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    
    // Raycast to floor plane (y=0)
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera({ x: e.point.x, y: e.point.y }, camera);
    
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersection = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, intersection);
    
    if (intersection) {
      const point2d = new THREE.Vector2(intersection.x, intersection.z);
      
      // Close polygon on double-click or near-first-point
      if (points.length > 2 && point2d.distanceTo(points[0]) < 0.3) {
        // Complete polygon
        const area = calculatePolygonArea(points);
        const perimeter = calculatePerimeter(points);
        
        onComplete({
          id: crypto.randomUUID(),
          type: 'area',
          points: [...points],
          value: area,
          unit: 'm²',
          label: `Area: ${area.toFixed(2)} m²`,
        });
        setPoints([]);
      } else {
        setPoints([...points, point2d]);
      }
    }
  }, [points, camera, onComplete]);
  
  return (
    <group onClick={handleClick}>
      {/* Render current polygon */}
      {points.length > 1 && (
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={points.length}
              array={new Float32Array(points.flatMap(p => [p.x, 0, p.y]))}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#00E699" linewidth={2} />
        </line>
      )}
      
      {/* Render points */}
      {points.map((p, i) => (
        <mesh key={i} position={[p.x, 0.01, p.y]}>
          <circleGeometry args={[0.05, 16]} />
          <meshBasicMaterial color="#00E699" />
        </mesh>
      ))}
      
      {/* Area preview */}
      {points.length > 2 && (
        <Text
          position={[centroid(points).x, 0.1, centroid(points).y]}
          fontSize={0.2}
          color="white"
        >
          {calculatePolygonArea(points).toFixed(1)} m²
        </Text>
      )}
    </group>
  );
}

// Wall segment measurement (height × length, subtract openings)
function WallMeasurementTool({ floorplan, onComplete }: WallMeasurementProps) {
  const [selectedWall, setSelectedWall] = useState<WallSegment | null>(null);
  const [openings, setOpenings] = useState<Opening[]>([]); // doors, windows
  
  const calculateNetWallArea = () => {
    if (!selectedWall) return 0;
    
    const grossArea = selectedWall.length * selectedWall.height;
    const openingArea = openings.reduce((sum, o) => sum + (o.width * o.height), 0);
    
    return grossArea - openingArea;
  };
  
  // UI for selecting wall, marking openings, calculating
  return (
    <WallMeasurementUI
      wall={selectedWall}
      openings={openings}
      onAddOpening={(o) => setOpenings([...openings, o])}
      onRemoveOpening={(id) => setOpenings(openings.filter(o => o.id !== id))}
      netArea={calculateNetWallArea()}
      onSave={() => onComplete({
        id: crypto.randomUUID(),
        type: 'wall',
        wallId: selectedWall.id,
        grossArea: selectedWall.length * selectedWall.height,
        openingArea: openings.reduce((s, o) => s + o.width * o.height, 0),
        netArea: calculateNetWallArea(),
        openings,
      })}
    />
  );
}
```

### Real-World Scale from RoomPlan/LiDAR

```typescript
// lib/floorplan/scale.ts
interface FloorPlanMetadata {
  scaleFactor: number; // meters per unit
  accuracyTier: 'roomplan' | 'lidar' | 'merged';
  captureDevice: string;
  calibrationDate: string;
}

// RoomPlan provides real-world dimensions directly
function extractScaleFromRoomPlan(usdzData: USDZParseResult): FloorPlanMetadata {
  // RoomPlan units are in meters
  return {
    scaleFactor: 1.0, // 1 unit = 1 meter
    accuracyTier: 'roomplan',
    captureDevice: 'iPhone LiDAR (RoomPlan)',
    calibrationDate: new Date().toISOString(),
  };
}

// LiDAR point cloud needs scale calibration
function extractScaleFromPointCloud(plyMetadata: PLYHeader): FloorPlanMetadata {
  // ARKit LiDAR is in meters by default
  return {
    scaleFactor: 1.0,
    accuracyTier: 'lidar',
    captureDevice: 'iPhone LiDAR (ARKit)',
    calibrationDate: new Date().toISOString(),
  };
}

// Store scale in GeoJSON properties
function embedScaleInGeoJSON(geojson: GeoJSON, metadata: FloorPlanMetadata): GeoJSON {
  return {
    ...geojson,
    properties: {
      ...geojson.properties,
      _slate360_scale: metadata,
    },
  };
}

// Canvas reads scale and applies to measurements
function useRealWorldScale(geojson: GeoJSON): number {
  const metadata = geojson.properties?._slate360_scale;
  
  if (!metadata) {
    console.warn('No scale metadata, assuming 1 unit = 1 meter');
    return 1.0;
  }
  
  return metadata.scaleFactor;
}
```

---

## 3. Partial Capture: Inference & Gap Handling

### UX Strategy: Mark Gaps, Don't Fake Completion

```tsx
// components/floorplan/PartialCaptureIndicator.tsx

interface PartialFloorPlanProps {
  capturedRooms: Room[];
  inferredRooms: InferredRoom[]; // ML or heuristic
  gaps: Gap[]; // Unwalked areas
  confidenceThreshold: number;
}

export function PartialFloorPlan({ capturedRooms, inferredRooms, gaps }: PartialFloorPlanProps) {
  return (
    <>
      {/* Captured rooms: solid lines, full color */}
      {capturedRooms.map(room => (
        <RoomGeometry
          key={room.id}
          room={room}
          style="verified"
          strokeColor="#00E699"
          fillOpacity={0.2}
        />
      ))}
      
      {/* Inferred rooms: dashed lines, muted color, tooltip */}
      {inferredRooms.map(room => (
        <RoomGeometry
          key={room.id}
          room={room}
          style="inferred"
          strokeColor="#94A3B8"
          strokeDash={[0.1, 0.05]}
          fillOpacity={0.1}
          tooltip={`Inferred (${(room.confidence * 100).toFixed(0)}% confidence)`}
        />
      ))}
      
      {/* Gaps: hatched pattern, "walk here" indicator */}
      {gaps.map(gap => (
        <GapIndicator
          key={gap.id}
          gap={gap}
          pattern="diagonal-hatch"
          color="#F59E0B" // amber warning
          label="Not captured — walk this area for full coverage"
        />
      ))}
    </>
  );
}
```

### OSS/ML for Room Inference

**Option 1: Heuristic (No ML)**
- Detect large empty spaces surrounded by walls
- Infer rectangular rooms from wall intersections
- Mark as "inferred" with low confidence

**Option 2: FloorPlanNet-style ML (Self-hosted)**
```python
# tools/infer_rooms.py
# Using Deep Floor Plan Recognition (DFPR) or similar

import torch
import numpy as np

def infer_rooms_from_partial(floorplan_image: np.ndarray, model_path: str) -> List[InferredRoom]:
    """
    Infer unwalked room boundaries from partial floor plan image.
    Uses CNN to predict room boundaries from wall geometry.
    """
    # Load model (e.g., FloorPlanNet, Deep Floor Plan Recognition)
    model = torch.jit.load(model_path)
    model.eval()
    
    # Preprocess: convert wall geometry to image
    input_tensor = preprocess_floorplan(floorplan_image)
    
    # Inference
    with torch.no_grad():
        room_logits, boundary_logits = model(input_tensor)
    
    # Post-process: extract room polygons
    rooms = postprocess_room_prediction(room_logits, boundary_logits)
    
    return [
        InferredRoom(
            id=str(i),
            polygon=room.polygon,
            confidence=float(room.confidence),
            type='inferred'
        )
        for i, room in enumerate(rooms)
        if room.confidence > 0.5
    ]

# Models:
# - Deep Floor Plan Recognition (DFPR): github.com/bennyguo/deep-floor-plan-recognition
# - FloorPlanNet: github.com/art-programmer/FloorPlanNet (older, TF1)
# - House-GAN: github.com/ennauata/housegan (room generation)
```

**Option 3: Google Gemini (Allowed Exception)**
```python
# tools/infer_rooms_gemini.py
import google.generativeai as genai
from PIL import Image

def infer_rooms_with_gemini(floorplan_image: Image, walked_areas: List[Polygon]) -> List[InferredRoom]:
    """
    Use Gemini to infer room layouts from partial floor plan.
    More flexible than CNN for irregular geometries.
    """
    model = genai.GenerativeModel('gemini-1.5-flash')
    
    prompt = f"""
    Analyze this partial floor plan image. 
    The green areas were walked and captured. The gray areas are walls.
    
    Identify:
    1. What rooms likely exist in unwalked areas
    2. Boundaries of each inferred room (as polygon coordinates)
    3. Confidence level for each inference (0-1)
    
    Return JSON with rooms array containing id, polygon, confidence, rationale.
    """
    
    response = model.generate_content([prompt, floorplan_image])
    
    # Parse JSON response
    inferred = json.loads(response.text)
    
    return [
        InferredRoom(
            id=r['id'],
            polygon=Polygon(r['polygon']),
            confidence=r['confidence'],
            type='inferred-gemini',
            rationale=r.get('rationale')
        )
        for r in inferred['rooms']
    ]
```

**Recommendation:**
- **P0:** Heuristic inference (no ML, fast, explicit uncertainty)
- **P1:** Self-hosted DFPR model (better accuracy, no API cost)
- **P2:** Gemini for complex/irregular buildings (fallback)

---

## 4. Desktop Splat Editing

### Tool A: Floater Removal / Bounding Box Crop

**Tool: PlayCanvas SuperSplat (Self-hosted/embedded)**

```tsx
// components/splat-editor/SuperSplatEmbed.tsx
'use client';

import { useEffect, useRef } from 'react';

export function SuperSplatEditor({ spzUrl, onSave }: SuperSplatProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  
  useEffect(() => {
    // SuperSplat can be self-hosted or embedded via iframe
    // https://github.com/playcanvas/super-splat
    
    const handleMessage = (e: MessageEvent) => {
      if (e.data.type === 'SUPERSPLAT_EXPORT') {
        onSave(e.data.spzBlob);
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onSave]);
  
  return (
    <iframe
      ref={iframeRef}
      src={`/super-splat/?file=${encodeURIComponent(spzUrl)}&mode=edit`}
      className="w-full h-full border-0"
      allow="fullscreen"
    />
  );
}
```

**Self-hosted SuperSplat features:**
- Floater removal (spatial selection + delete)
- Bounding box crop
- Color filtering
- Export to SPZ/PLY

### Tool B: Clipping Plane Section Cuts

**Custom three.js Implementation:**

```tsx
// components/splat-editor/ClippingSplatViewer.tsx
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { GaussianSplattingMesh } from './GaussianSplattingMesh';
import * as THREE from 'three';

function ClippingSplatScene({ spzUrl, clipPlanes }: ClippingProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const { scene } = useThree();
  
  // Create clipping planes
  useEffect(() => {
    const planes = clipPlanes.map(clip => 
      new THREE.Plane(
        new THREE.Vector3(clip.normal.x, clip.normal.y, clip.normal.z),
        clip.constant
      )
    );
    
    // Apply to renderer
    scene.clippingPlanes = planes;
    
    return () => {
      scene.clippingPlanes = [];
    };
  }, [clipPlanes, scene]);
  
  return (
    <GaussianSplattingMesh
      ref={meshRef}
      url={spzUrl}
      // Custom shader material that respects clipping planes
      material={createClippingAwareMaterial()}
    />
  );
}

// UI for manipulating clipping planes
function ClippingControls({ onUpdate }: { onUpdate: (planes: ClipPlane[]) => void }) {
  const [activeAxis, setActiveAxis] = useState<'x' | 'y' | 'z'>('y'); // y = horizontal cut
  const [cutPosition, setCutPosition] = useState(0);
  const [doubleSided, setDoubleSided] = useState(false);
  
  // Update clipping planes
  useEffect(() => {
    const normal = { x: 0, y: 1, z: 0 }; // Horizontal cut
    const constant = -cutPosition; // Plane equation: dot(normal, point) + constant = 0
    
    const planes: ClipPlane[] = [
      { normal, constant }
    ];
    
    if (doubleSided) {
      // Add opposite plane for "accordion" effect
      planes.push({
        normal: { x: 0, y: -1, z: 0 },
        constant: cutPosition + 2.0 // 2m thick slice
      });
    }
    
    onUpdate(planes);
  }, [cutPosition, doubleSided, onUpdate]);
  
  return (
    <div className="glass-panel p-4 absolute top-4 left-4 z-10 w-72">
      <h3 className="label-mono mb-3">Section Cut</h3>
      
      <div className="space-y-4">
        <div>
          <label className="text-xs text-slate-400">Cut height</label>
          <input
            type="range"
            min="-5"
            max="5"
            step="0.1"
            value={cutPosition}
            onChange={(e) => setCutPosition(parseFloat(e.target.value))}
            className="w-full accent-app"
          />
          <span className="text-xs text-slate-500">{cutPosition.toFixed(1)} m</span>
        </div>
        
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={doubleSided}
            onChange={(e) => setDoubleSided(e.target.checked)}
            className="rounded border-slate-600"
          />
          <span className="text-sm">Double-sided slice</span>
        </label>
        
        <div className="flex gap-2">
          <button
            onClick={() => setCutPosition(0)}
            className="flex-1 py-2 text-xs bg-white/5 hover:bg-white/10 rounded"
          >
            Reset
          </button>
          <button
            onClick={() => setCutPosition(1.2)}
            className="flex-1 py-2 text-xs bg-white/5 hover:bg-white/10 rounded"
          >
            Desk height
          </button>
        </div>
      </div>
    </div>
  );
}
```

### Tool C: Object Deletion + Annotations

**Custom Implementation with Spatial Selection:**

```tsx
// components/splat-editor/ObjectAnnotationTool.tsx
function SplatAnnotationTool({ spzData, onAnnotate }: AnnotationProps) {
  const [mode, setMode] = useState<'select' | 'box' | 'lasso'>('select');
  const [selection, setSelection] = useState<Selection | null>(null);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  
  // Render selection box/lasso
  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    if (mode === 'box') {
      setSelection({
        type: 'box',
        start: e.point,
        end: e.point,
      });
    }
  };
  
  // On complete, find splat points inside selection
  const completeSelection = () => {
    if (!selection) return;
    
    // Find Gaussian splats inside selection volume
    const selectedIndices = findSplatsInVolume(spzData, selection);
    
    // Show annotation dialog
    showAnnotationDialog(selectedIndices, (annotation) => {
      setAnnotations([...annotations, {
        ...annotation,
        targetIndices: selectedIndices,
        action: annotation.action // 'delete', 'recolor', 'tag'
      }]);
    });
  };
  
  return (
    <>
      <SelectionOverlay selection={selection} />
      <AnnotationList annotations={annotations} onDelete={(id) => {
        setAnnotations(annotations.filter(a => a.id !== id));
      }} />
    </>
  );
}

// Find splats inside selection volume
function findSplatsInVolume(spzData: SPZData, selection: BoxSelection): number[] {
  const indices: number[] = [];
  
  const center = new THREE.Vector3()
    .addVectors(selection.start, selection.end)
    .multiplyScalar(0.5);
  
  const size = new THREE.Vector3()
    .subVectors(selection.end, selection.start);
  
  // Check each Gaussian
  for (let i = 0; i < spzData.numPoints; i++) {
    const pos = spzData.positions[i];
    
    if (Math.abs(pos.x - center.x) < size.x / 2 &&
        Math.abs(pos.y - center.y) < size.y / 2 &&
        Math.abs(pos.z - center.z) < size.z / 2) {
      indices.push(i);
    }
  }
  
  return indices;
}
```

---

## 5. Capture Strategy Validation

### Recommended: Phone Stills + Simultaneous LiDAR + Insta360 360 Video

**Rationale:**
- **Phone stills (0.5s interval):** Primary SfM input, high quality
- **LiDAR:** Depth for textureless surfaces, gravity-aligned poses
- **360 video:** Context/spherical coverage, secondary validation

**Expected Quality Profile:**

| Metric | Expected | Notes |
|--------|----------|-------|
| **Floaters** | Low (5-10%) | LiDAR depth anchors geometry |
| **Completeness** | High (85-95%) | 360 fills gaps behind phone |
| **Textureless surfaces** | Medium | LiDAR helps, but glass still problematic |
| **Walking pace** | 1 m/s OK | 0.5s interval = 0.5m spacing, good overlap |

**Photo Interval Recommendation:**

| Speed | Interval | Overlap | Quality |
|-------|----------|---------|---------|
| 0.5 m/s (slow) | 0.5s | 90% | Excellent |
| **1.0 m/s (normal)** | **0.5s** | **80%** | **Good** ← recommended |
| 1.5 m/s (fast) | 0.3s | 70% | Acceptable |

**Shutter/Exposure:**

```swift
// iPhone camera configuration for minimal blur
func configureCapture() {
    guard let device = AVCaptureDevice.default(.builtInLiDARDepthCamera, for: .video, position: .back) else { return }
    
    do {
        try device.lockForConfiguration()
        
        // Fixed duration for sharp frames
        device.activeVideoMinFrameDuration = CMTime(value: 1, timescale: 30) // 30fps
        device.activeVideoMaxFrameDuration = CMTime(value: 1, timescale: 30)
        
        // Auto-exposure with bias for indoor
        device.exposureMode = .autoExpose
        device.setExposureTargetBias(-0.5) // Slightly darker, less motion blur
        
        device.unlockForConfiguration()
    } catch {
        print("Camera config failed: \(error)")
    }
}
```

**LiDAR Benefit for Textureless Surfaces:**

```
Scene: White wall with glass window

WITHOUT LiDAR:
- SfM fails on white wall (no features)
- SfM fails on glass (reflections, no features)
- Result: Hole in reconstruction, floater artifacts

WITH LiDAR:
- Depth map captures wall geometry directly
- Depth map captures glass plane (even if transparent)
- Splat uses depth for initialization
- Result: Complete wall, accurate glass plane
```

---

## 6. Implementation Priorities

### Schema/Pipeline Changes Required

| Change | Location | Impact |
|--------|----------|--------|
| Add `roomplan_usdz` to `twin_captures` table | Database | Store RoomPlan output |
| Add `floorplan_geojson` to `twin_models` table | Database | Store generated floor plan |
| Add `measurements` JSONB to `twin_models` | Database | Store user measurements |
| Add `clip_planes` to `twin_models` | Database | Store splat edit state |
| Add `accuracy_tier` enum | Database | 'roomplan' \| 'lidar' \| 'merged' |

### On-Device (Swift) — P0

1. **RoomPlan integration** (2-3 days)
   - Add `RoomCaptureViewController` to capture flow
   - Export USDZ on completion
   - Upload alongside PLY/video

2. **LiDAR + 360 sync** (1-2 days)
   - Timestamp synchronization
   - Ensure simultaneous recording

### Cloud (Python) — P0/P1

1. **RoomPlan USDZ → GeoJSON** (2-3 days)
   - Parse USDZ (Apple's format or usd-core)
   - Convert walls/doors/windows to GeoJSON
   - OSS: `usd-core` (Pixar), `pyusd`

2. **Point cloud → floor plan** (3-5 days)
   - Open3D RANSAC pipeline
   - Heuristic door/window detection
   - Export GeoJSON

3. **SuperSplat self-host** (2-3 days)
   - Build and deploy
   - Embed in iframe
   - Message passing for save/load

### Web (React/Three.js) — P1

1. **Floor plan canvas** (3-5 days)
   - 2D orthographic viewer
   - Measurement tools (polygon, wall)
   - Scale metadata integration

2. **Clipping plane viewer** (2-3 days)
   - Custom three.js splat renderer
   - Plane manipulation UI
   - "Accordion" double-sided mode

3. **Partial capture UI** (2-3 days)
   - Visual gap indicators
   - Inference confidence display
   - "Walk here" guidance

---

## 7. OSS Repositories

### Floor Plan / Point Cloud
```
https://github.com/isl-org/Open3D                    # Point cloud processing
https://github.com/bennyguo/deep-floor-plan-recognition # DFPR (room inference)
https.com/art-programmer/FloorPlanNet                # FloorPlanNet (older)
https://github.com/PixarAnimationStudios/USD         # USD format (RoomPlan)
https://github.com/oliver-batchelor/refined_rooms     # Room segmentation
```

### Splat Editing
```
https://github.com/playcanvas/super-splat            # Floater removal, crop
https://github.com/nerfstudio-project/gsplat          # Core splat library
https://github.com/mkkellogg/GaussianSplatter3D      # Three.js splats
https://github.com/dylanebert/gsplat.js               # Lightweight splat JS
```

### 3D Viewer / Clipping
```
https://github.com/pmndrs/react-three-fiber          # React Three.js
https://github.com/pmndrs/drei                        # R3F helpers
https://threejs.org/examples/webgl_clipping.html     # Clipping planes
```

---

*Specification locked: June 30, 2026*
*Tools: Open3D, SuperSplat, DFPR, RoomPlan, gsplat*
