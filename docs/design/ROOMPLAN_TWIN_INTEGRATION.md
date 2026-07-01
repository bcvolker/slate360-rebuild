# Apple RoomPlan × Twin 360 Integration
## Co-existence Architecture for Measurement + Visual Twin Capture

**Goal:** Unified capture workflow producing both:  
- **Visual Twin:** Gaussian splat (LiDAR + ARKit video)  
- **Measurement Layer:** RoomPlan parametric geometry (walls, doors, windows, areas)  

---

## 1. RoomPlan + Splat Capture: Co-existence Analysis

### Can They Run Simultaneously?

**Short answer: No.** RoomCaptureSession owns its own ARSession. Two ARSessions cannot run simultaneously on one device.

**Options:**

| Approach | Description | Trade-offs | Verdict |
|----------|-------------|------------|---------|
| **A: Sequential passes** | RoomPlan first → save structure → splat second | Two capture sessions, user walks twice, perfect alignment if same trajectory | **RECOMMENDED** |
| **B: RoomPlan as master** | Use RoomPlan's ARSession, tap frames for splat | RoomPlan controls session config (limited LiDAR depth, different frame rate), may conflict with splat needs | ⚠️ Risky |
| **C: Splat as master** | Our ARSession, extract planes manually | No RoomPlan benefits (parametric walls, auto door detection) | ❌ Loses value |

### Recommended: Sequential Passes with Unified Trajectory

```
CAPTURE WORKFLOW:

PHASE 1: RoomPlan Scan (2–3 minutes per room)
├── RoomCaptureSession active
├── User walks perimeter, pauses at doorways
├── CapturedRoom saved to disk (USDZ + JSON metadata)
├── World alignment anchor saved (gravity-aligned transform)
└── Thermal state: moderate (RoomPlan lighter than full video)

↓ (transition, 5–10 seconds)

PHASE 2: Splat Capture (same rooms + exterior)
├── ARWorldTrackingConfiguration with LiDAR + video
├── User walks roughly same trajectory
├── ARKit poses align to RoomPlan's world via shared anchor
├── Video + depth + poses captured for cloud
└── Thermal state: high (90–120s segments)

CLOUD PROCESSING:
├── Splat → Gaussian model (visual twin)
├── RoomPlan JSON → 2D floor plan + measurements
├── Merge: align both to gravity, RoomPlan interior + point cloud exterior
└── Deliverable: tabbed viewer (3D splat / 2D plan with measurements)
```

### Swift Implementation: Sequential Capture

```swift
// Twin360/Sources/Capture/UnifiedCaptureController.swift

import RoomPlan
import ARKit
import Combine

enum CapturePhase {
    case roomPlanScanning      // Phase 1
    case roomPlanCompleted     // Transition
    case splatCapturing        // Phase 2
    case splatCompleted        // Done
}

@MainActor
class UnifiedCaptureController: NSObject, ObservableObject {
    
    // MARK: - Published State
    @Published var phase: CapturePhase = .roomPlanScanning
    @Published var roomPlanSession: RoomCaptureSession?
    @Published var arSession: ARSession?  // For splat phase
    
    @Published var capturedRoom: CapturedRoom?
    @Published var splatClips: [SplatClip] = []
    
    // World alignment
    private var worldAnchor: ARAnchor?  // Persisted between phases
    
    // MARK: - Phase 1: RoomPlan
    
    func startRoomPlanCapture() {
        let session = RoomCaptureSession()
        session.delegate = self
        self.roomPlanSession = session
        
        // Configuration: interior scanning
        let config = RoomCaptureSession.Configuration()
        config.isOccupancyMappingEnabled = true  // For furniture/obstacles
        
        session.run(configuration: config)
        phase = .roomPlanScanning
    }
    
    func pauseRoomPlanForTransition() {
        guard let session = roomPlanSession else { return }
        
        // Capture world anchor before pausing
        if let currentFrame = session.arSession?.currentFrame {
            worldAnchor = ARAnchor(name: "roomPlanWorld", transform: currentFrame.camera.transform)
            // Save anchor transform for splat phase alignment
            saveWorldAlignment(worldAnchor!.transform)
        }
        
        session.pause()
        phase = .roomPlanCompleted
    }
    
    // MARK: - Phase 2: Splat Capture
    
    func startSplatCapture() {
        // Tear down RoomPlan
        roomPlanSession?.stop()
        roomPlanSession = nil
        
        // Initialize our ARSession for splat
        let session = ARSession()
        session.delegate = self
        self.arSession = session
        
        // Configuration optimized for splat
        let config = ARWorldTrackingConfiguration()
        config.sceneReconstruction = .meshWithClassification
        config.environmentTexturing = .automatic
        
        if ARWorldTrackingConfiguration.supportsFrameSemantics(.sceneDepth) {
            config.frameSemantics = [.sceneDepth, .smoothedSceneDepth]
        }
        
        // Restore world alignment if available
        if let worldAnchor = worldAnchor {
            session.add(anchor: worldAnchor)
        }
        
        session.run(config, options: [.resetTracking, .removeExistingAnchors])
        
        // Start our splat capture HUD
        phase = .splatCapturing
    }
}

// MARK: - RoomPlan Delegate

extension UnifiedCaptureController: RoomCaptureSessionDelegate {
    
    func captureSession(_ session: RoomCaptureSession, didUpdate room: CapturedRoom) {
        // Real-time preview updates
        self.capturedRoom = room
    }
    
    func captureSession(_ session: RoomCaptureSession, didStartWith configuration: RoomCaptureSession.Configuration) {
        print("RoomPlan session started")
    }
    
    func captureSession(_ session: RoomCaptureSession, didEndWith data: RoomCaptureSession.CaptureData) {
        // Final export
        exportRoomPlanData(data)
        phase = .roomPlanCompleted
    }
}

// MARK: - ARSession Delegate (Splat phase)

extension UnifiedCaptureController: ARSessionDelegate {
    
    func session(_ session: ARSession, didUpdate frame: ARFrame) {
        // Pass to splat capture controller
        splatCaptureController?.processFrame(frame)
    }
}
```

### Thermal & Performance Considerations

| Phase | Duration | Thermal | Battery |
|-------|----------|---------|---------|
| RoomPlan scan | 2–3 min/room | Moderate (geometry only) | ~3%/min |
| Transition | 5–10 sec | Cooldown | — |
| Splat capture | 5–10 min total | High (video + depth) | ~8%/min |
| **Total** | **10–15 min** | **Manageable** | **~15–20%** |

**Recommendation:** Enforce 30-second cooldown between phases, monitor `ProcessInfo.thermalState`.

---

## 2. RoomPlan Data Export + JSON Transformation

### CapturedRoom Export

```swift
// Export RoomPlan data to our JSON schema + USDZ

struct RoomPlanExport {
    let capturedRoom: CapturedRoom
    let worldTransform: simd_float4x4  // Gravity-aligned world origin
    let timestamp: Date
    let deviceInfo: DeviceInfo
}

func exportRoomPlanData(_ export: RoomPlanExport) async throws -> RoomPlanDocument {
    
    // 1. Export USDZ (parametric model)
    let usdzData = try await exportCapturedRoomToUSDZ(export.capturedRoom)
    
    // 2. Extract to our JSON schema
    let jsonStructure = extractJSONStructure(from: export.capturedRoom, worldTransform: export.worldTransform)
    
    // 3. Save both
    return RoomPlanDocument(
        usdzURL: saveUSDZ(usdzData),
        jsonURL: saveJSON(jsonStructure),
        metadata: exportMetadata(export)
    )
}

func extractJSONStructure(from room: CapturedRoom, worldTransform: simd_float4x4) -> RoomStructureJSON {
    
    let walls = room.walls.map { wall in
        WallJSON(
            id: wall.identifier.uuidString,
            // Transform to world coordinates
            p1: transformPoint(wall.p1, worldTransform),
            p2: transformPoint(wall.p2, worldTransform),
            height: Double(wall.height),
            thickness: Double(wall.thickness),
            confidence: wall.confidence.rawValue,
            
            // Associated surfaces
            surfaceIds: wall.surfaces.map { $0.identifier.uuidString },
            
            // Openings in this wall (doors + windows)
            openings: wall.openings.map { opening in
                OpeningJSON(
                    id: opening.identifier.uuidString,
                    type: opening is CapturedDoor ? "door" : "window",
                    position: transformPoint(opening.position, worldTransform),
                    dimensions: Dimensions(
                        width: Double(opening.dimensions.x),
                        height: Double(opening.dimensions.y),
                        depth: Double(opening.dimensions.z)
                    ),
                    confidence: opening.confidence.rawValue,
                    // Door-specific
                    isOpen: (opening as? CapturedDoor)?.isOpen ?? false,
                    swingDirection: (opening as? CapturedDoor)?.swingDirection
                )
            },
            
            // Computed properties
            length: distance(wall.p1, wall.p2),
            area: Double(wall.height) * distance(wall.p1, wall.p2)
        )
    }
    
    let floors = room.floors.map { floor in
        FloorJSON(
            id: floor.identifier.uuidString,
            // Transform to world coordinates
            boundary: floor.boundary.map { transformPoint($0, worldTransform) },
            area: calculatePolygonArea(floor.boundary.map { transformPoint($0, worldTransform) }),
            height: Double(floor.transform.columns.3.y),  // Y position in world
            confidence: floor.confidence.rawValue,
            surfaceId: floor.surface?.identifier.uuidString
        )
    }
    
    let rooms = room.rooms.map { roomObj in
        RoomJSON(
            id: roomObj.identifier.uuidString,
            name: roomObj.name ?? "Room \(roomObj.identifier.uuidString.prefix(4))",
            boundary: roomObj.boundary.map { transformPoint($0, worldTransform) },
            floorArea: calculatePolygonArea(roomObj.boundary.map { transformPoint($0, worldTransform) }),
            ceilingHeight: Double(roomObj.ceiling?.height ?? 2.4),
            volume: calculateRoomVolume(roomObj, worldTransform),
            wallIds: roomObj.walls.map { $0.identifier.uuidString },
            floorId: roomObj.floor?.identifier.uuidString,
            confidence: roomObj.confidence.rawValue
        )
    }
    
    let objects = room.objects.map { obj in
        ObjectJSON(
            id: obj.identifier.uuidString,
            category: obj.category,
            position: transformPoint(obj.position, worldTransform),
            dimensions: Dimensions(
                width: Double(obj.dimensions.x),
                height: Double(obj.dimensions.y),
                depth: Double(obj.dimensions.z)
            ),
            transform: transformToArray(obj.transform, worldTransform)
        )
    }
    
    return RoomStructureJSON(
        version: "1.0.0",
        exportTimestamp: ISO8601DateFormatter().string(from: Date()),
        coordinateSystem: {
            type: "gravity-aligned",
            upAxis: "y",
            unit: "meters",
            worldTransform: matrixToArray(worldTransform)
        },
        walls: walls,
        floors: floors,
        rooms: rooms,
        objects: objects,
        openings: walls.flatMap { $0.openings },
        summary: calculateSummary(walls, floors, rooms)
    )
}

// JSON Schema (matches our database)
struct RoomStructureJSON: Codable {
    let version: String
    let exportTimestamp: String
    let coordinateSystem: CoordinateSystem
    let walls: [WallJSON]
    let floors: [FloorJSON]
    let rooms: [RoomJSON]
    let objects: [ObjectJSON]
    let openings: [OpeningJSON]
    let summary: Summary
}

struct WallJSON: Codable {
    let id: String
    let p1: [Double]  // [x, y, z] in world coordinates
    let p2: [Double]
    let height: Double
    let thickness: Double
    let confidence: String
    let surfaceIds: [String]
    let openings: [OpeningJSON]
    let length: Double
    let area: Double  // Gross area (before subtracting openings)
    let netArea: Double?  // Computed: area - sum(opening areas)
}

struct OpeningJSON: Codable {
    let id: String
    let type: String  // "door" | "window"
    let position: [Double]  // Center point in world
    let dimensions: Dimensions
    let confidence: String
    let isOpen: Bool?  // Doors only
    let swingDirection: String?  // Doors only: "left", "right", "unknown"
    let parentWallId: String?
}

struct FloorJSON: Codable {
    let id: String
    let boundary: [[Double]]  // Polygon vertices
    let area: Double  // m²
    let height: Double  // Y elevation
    let confidence: String
    let surfaceId: String?
}

struct RoomJSON: Codable {
    let id: String
    let name: String
    let boundary: [[Double]]  // Polygon vertices
    let floorArea: Double  // m²
    let ceilingHeight: Double  // m
    let volume: Double?  // m³ (computed)
    let wallIds: [String]
    let floorId: String?
    let confidence: String
}

struct Summary: Codable {
    let totalWallLength: Double  // m
    let totalWallArea: Double    // m² (gross)
    let totalWallAreaNet: Double // m² (minus openings)
    let totalFloorArea: Double   // m²
    let totalVolume: Double?     // m³
    let roomCount: Int
    let doorCount: Int
    let windowCount: Int
    let boundingBox: BoundingBox
}
```

---

## 3. Merging RoomPlan Interior + Point Cloud Exterior

### Alignment Strategy

```
COORDINATE SYSTEM:
├── Origin: RoomPlan's starting position (first wall detected)
├── Up axis: ARKit gravity (Y+)
├── Scale: Meters (ARKit default)
└── Rotation: RoomPlan's orientation (arbitrary, but consistent)

SPLAT CAPTURE:
├── Must start from same physical position (or nearby)
├── Uses same world alignment anchor
├── Gravity-aligned (Y+ up) — matches RoomPlan
└── Cloud processing aligns to RoomPlan origin if anchor restored

MERGE (cloud processing):
├── Splat point cloud: exterior + interior visual
├── RoomPlan geometry: interior parametric walls
├── Exterior footprint: RANSAC plane extraction from splat point cloud (floor level)
├── Combined deliverable:
│   ├── Interior: RoomPlan walls, measurements, areas
│   ├── Exterior: Point cloud derived footprint (lower accuracy)
│   └── Unified: 2D plan with interior measured + exterior estimated
```

### Python: Merge Processing

```python
# workers/modal/roomplan_merge.py
import numpy as np
import open3d as o3d
from dataclasses import dataclass
from typing import List, Optional

@dataclass
class MergedStructure:
    interior_walls: List[Wall]
    exterior_footprint: Optional[Polygon]  # Derived from splat
    rooms: List[Room]
    measurements: MeasurementSummary
    accuracy_tiers: AccuracyTiers

class RoomPlanSplatMerger:
    
    def __init__(self, roomplan_json: dict, splat_ply_path: str):
        self.roomplan = roomplan_json
        self.splat_pcd = o3d.io.read_point_cloud(splat_ply_path)
        
    def merge(self) -> MergedStructure:
        """
        Merge RoomPlan interior (accurate) with splat exterior (visual).
        """
        # 1. Extract floor-level points from splat for exterior
        exterior_footprint = self._extract_exterior_footprint()
        
        # 2. Load RoomPlan interior
        interior_walls = self._load_roomplan_walls()
        rooms = self._load_roomplan_rooms()
        
        # 3. Verify alignment (should be close if same world anchor)
        alignment_error = self._check_alignment(interior_walls, exterior_footprint)
        
        # 4. Merge footprints
        merged_footprint = self._merge_footprints(
            interior=self._get_interior_outline(interior_walls),
            exterior=exterior_footprint,
            priority='interior'  # RoomPlan wins where they overlap
        )
        
        # 5. Calculate measurements
        measurements = self._calculate_measurements(interior_walls, rooms)
        
        # 6. Assign accuracy tiers
        accuracy_tiers = AccuracyTiers(
            interior_walls='measured',      # RoomPlan: ±2-5cm
            interior_areas='measured',       # RoomPlan: ±3-8%
            exterior_footprint='estimated',  # Splat-derived: ±10-20cm
            exterior_areas='inferred',       # Point cloud: ±15-25%
            combined_plan='merged'           # Interior measured, exterior estimated
        )
        
        return MergedStructure(
            interior_walls=interior_walls,
            exterior_footprint=merged_footprint,
            rooms=rooms,
            measurements=measurements,
            accuracy_tiers=accuracy_tiers
        )
    
    def _extract_exterior_footprint(self) -> Optional[Polygon]:
        """
        Extract ground-level exterior footprint from splat point cloud.
        """
        # Filter to floor level (Y ≈ 0 ± 10cm)
        points = np.asarray(self.splat_pcd.points)
        floor_mask = (points[:, 1] > -0.1) & (points[:, 1] < 0.1)
        floor_points = points[floor_mask][:, [0, 2]]  # X, Z only (ground plane)
        
        if len(floor_points) < 100:
            return None
        
        # Cluster to remove interior points
        # Use density: exterior has lower point density (walked perimeter)
        from sklearn.cluster import DBSCAN
        clustering = DBSCAN(eps=0.5, min_samples=10).fit(floor_points)
        
        # Find perimeter cluster (largest, lowest density)
        labels = clustering.labels_
        unique_labels = set(labels) - {-1}
        
        best_cluster = None
        best_score = 0
        
        for label in unique_labels:
            cluster_points = floor_points[labels == label]
            if len(cluster_points) < 50:
                continue
            
            # Score: large perimeter + low density = exterior
            hull = ConvexHull(cluster_points)
            perimeter = hull.area
            density = len(cluster_points) / perimeter
            score = perimeter / (density + 1)  # High perimeter, low density
            
            if score > best_score:
                best_score = score
                best_cluster = cluster_points
        
        if best_cluster is None:
            return None
        
        # Convex hull of exterior cluster
        hull = ConvexHull(best_cluster)
        return Polygon(best_cluster[hull.vertices])
    
    def _check_alignment(self, interior_walls: List[Wall], exterior: Optional[Polygon]) -> float:
        """
        Check how well RoomPlan and splat align.
        Returns RMSE in meters.
        """
        if exterior is None:
            return float('inf')
        
        # Sample points from RoomPlan walls at floor level
        interior_points = []
        for wall in interior_walls:
            # Sample along wall at floor level
            for t in np.linspace(0, 1, 10):
                point = wall.p1 * t + wall.p2 * (1 - t)
                interior_points.append([point.x, point.z])
        
        # Find nearest exterior points
        from scipy.spatial import cKDTree
        tree = cKDTree(np.asarray(exterior.exterior.coords))
        distances, _ = tree.query(interior_points)
        
        return np.sqrt(np.mean(distances ** 2))

    def _calculate_measurements(self, walls: List[Wall], rooms: List[Room]) -> MeasurementSummary:
        """
        Calculate all measurements from RoomPlan data.
        """
        total_wall_length = sum(w.length for w in walls)
        total_wall_area_gross = sum(w.area for w in walls)
        
        # Net area (minus openings)
        total_opening_area = sum(
            o.area for w in walls for o in w.openings
        )
        total_wall_area_net = total_wall_area_gross - total_opening_area
        
        total_floor_area = sum(r.floor_area for r in rooms)
        total_volume = sum(r.volume for r in rooms if r.volume)
        
        return MeasurementSummary(
            total_wall_length=total_wall_length,
            total_wall_area_gross=total_wall_area_gross,
            total_wall_area_net=total_wall_area_net,
            total_floor_area=total_floor_area,
            total_volume=total_volume,
            room_measurements=[
                RoomMeasurements(
                    room_id=r.id,
                    name=r.name,
                    floor_area=r.floor_area,
                    wall_area=sum(w.area for w in walls if w.id in r.wall_ids),
                    perimeter=self._calculate_perimeter(r.boundary),
                    ceiling_height=r.ceiling_height
                )
                for r in rooms
            ],
            opening_counts={
                'door': sum(1 for w in walls for o in w.openings if o.type == 'door'),
                'window': sum(1 for w in walls for o in w.openings if o.type == 'window')
            }
        )
```

---

## 4. UI Architecture

### Phone Capture Flow

```
┌─────────────────────────────────────────┐
│  RoomPlan SCAN PHASE                    │
├─────────────────────────────────────────┤
│                                         │
│   [Guided room capture]                 │
│                                         │
│   • Walk room perimeter                 │
│   • Pause at each doorway               │
│   • Capture doors/windows               │
│                                         │
│   [Live wall preview overlay]           │
│   [Progress: 3 of 4 walls]            │
│                                         │
│   [Pause at doorway → Mark door]        │
│                                         │
│   ┌─────────────────────────────────┐   │
│   │  [FINISH ROOM]  [ADD ROOM]    │   │
│   └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘

↓ (completed rooms saved)

┌─────────────────────────────────────────┐
│  [FINISH SCAN]                          │
│  4 rooms, 12 walls, 8 openings captured │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  CONTINUE TO SPLAT CAPTURE    │   │
│  └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘

↓ (thermal cooldown prompt if needed)

┌─────────────────────────────────────────┐
│  Splat TWIN PHASE                       │
├─────────────────────────────────────────┤
│                                         │
│   [Rebuilt HUD from prior spec]         │
│   • Record video + LiDAR                │
│   • Walk roughly same path              │
│   • Thermal governor active             │
│                                         │
│   [Previous RoomPlan rooms shown as     │
│    faint ghost overlay on AR view]       │
│    — helps user re-trace same path      │
│                                         │
│   ┌─────────────────────────────────┐   │
│   │  ● REC  1:34  [STOP] [DONE]   │   │
│   └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

### Desktop Plan Editor

```tsx
// components/twin/RoomPlanEditor.tsx

interface RoomPlanEditorProps {
  roomPlanData: RoomStructureJSON;
  splatUrl: string;
  onSave: (edited: RoomStructureJSON) => void;
}

export function RoomPlanEditor({ roomPlanData, splatUrl, onSave }: RoomPlanEditorProps) {
  const [activeTab, setActiveTab] = useState<'3d' | '2d' | 'measurements'>('2d');
  const [selectedTool, setSelectedTool] = useState<'select' | 'move-wall' | 'add-door' | 'measure'>('select');
  const [editingWalls, setEditingWalls] = useState(roomPlanData.walls);
  
  return (
    <div className="flex h-full bg-graphite-canvas">
      {/* Left: 2D Plan Canvas (primary) */}
      <div className="flex-1 relative">
        <PlanCanvas
          walls={editingWalls}
          rooms={roomPlanData.rooms}
          tool={selectedTool}
          onWallMove={(id, newP1, newP2) => {
            setEditingWalls(walls => 
              walls.map(w => w.id === id ? { ...w, p1: newP1, p2: newP2 } : w)
            );
          }}
          onAddOpening={(wallId, position, type) => {
            // Add door/window to wall
          }}
        />
        
        {/* Floating accuracy legend */}
        <AccuracyLegend
          tiers={{
            measured: { color: '#00E699', label: 'Measured (±2cm)' },
            estimated: { color: '#3D8EFF', label: 'Estimated (±10cm)' },
            inferred: { color: '#94A3B8', label: 'Inferred (±20cm)' }
          }}
        />
      </div>
      
      {/* Right: Properties & Measurements */}
      <div className="w-80 border-l border-white/[0.06] bg-graphite-canvas/50">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="2d">2D Plan</TabsTrigger>
            <TabsTrigger value="3d">3D View</TabsTrigger>
            <TabsTrigger value="measurements">Measurements</TabsTrigger>
          </TabsList>
          
          <TabsContent value="2d">
            <PlanPropertiesPanel
              walls={editingWalls}
              selectedWall={selectedWall}
              onWallPropertyChange={...}
            />
          </TabsContent>
          
          <TabsContent value="3d">
            <SplatViewer url={splatUrl} />
          </TabsContent>
          
          <TabsContent value="measurements">
            <MeasurementsPanel
              summary={calculateMeasurements(editingWalls, roomPlanData.rooms)}
              rooms={roomPlanData.rooms}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
```

### Deliverable Viewer (Public Share)

```
┌─────────────────────────────────────────┐
│  [Project Name] · Twin 360              │
├─────────────────────────────────────────┤
│                                         │
│  [TAB: 3D VIEW] [TAB: 2D PLAN] [TAB: MEASUREMENTS] │
│                                         │
│  ┌─────────────────────────────────────┐│
│  │                                     ││
│  │   ACTIVE TAB CONTENT                ││
│  │                                     ││
│  │   3D: Splat viewer                  ││
│  │   2D: Interactive floor plan        ││
│  │   Measurements: Tables + export   ││
│  │                                     ││
│  └─────────────────────────────────────┘│
│                                         │
│  Accuracy:                              │
│  ● Interior walls: Measured (±2cm)     │
│  ○ Exterior footprint: Estimated (±15cm)│
│                                         │
│  [DOWNLOAD PDF] [REQUEST MEASUREMENTS] │
│                                         │
└─────────────────────────────────────────┘
```

---

## 5. OSS Stack Recommendations

| Component | Recommendation | Rationale |
|-----------|---------------|-----------|
| **2D Plan Rendering** | **Konva.js** (React wrapper) | Canvas-based, fast, precise geometry, good for wall editing |
| **Alternative 2D** | **Fabric.js** | Mature, feature-rich, heavier |
| **CAD/Vector Operations** | **Paper.js** or **Shapely** (Python) | Boolean ops, offset curves, intersection |
| **3D Splat Viewer** | **SuperSplat** (PlayCanvas) or **gaussian-splatting-3d** | Already in plan |
| **IFC Export** | **IfcOpenShell** | Industry standard BIM exchange |
| **ML Wall Detection** | **RoomFormer** or **HEAT** | If point-cloud wall detection needed |
| **Vectorization** | **OpenCV contours** + **Shapely** | Footprint extraction from point cloud |

---

*Integration plan locked: June 30, 2026*