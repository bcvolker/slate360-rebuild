# Multi-Clip LiDAR Registration Architecture
## Fusing 2–5 Short Clips into One Coherent Gaussian Splat

**Date:** July 1, 2026  
**Context:** iOS ARKit LiDAR, multiple clips per room, drift between clips, need shared coordinate frame before splatfacto  
**Server-side:** Modal GPU, Nerfstudio/splatfacto, gravity correction already computed  

---

## Executive Summary: Recommended Approach

| Approach | Accuracy | Speed | Complexity | Verdict |
|----------|----------|-------|------------|---------|
| **Global COLMAP** (Option A) | ⭐⭐⭐ Excellent | ⭐ Slow (10-30 min) | ⭐⭐ Medium | **Primary** — Polycam's proven approach |
| **Open3D ICP** (Option B) | ⭐⭐ Good | ⭐⭐⭐ Fast (30-60s) | ⭐ Low | **Fallback** — for fast preview |
| **Hybrid: ICP → COLMAP** | ⭐⭐⭐ Excellent | ⭐⭐ Medium | ⭐⭐⭐ High | **Ideal** — ICP aligns, COLMAP refines |

**Recommendation:** Implement **hybrid pipeline**  
- **At capture:** ICP-based overlap detection (fast, on-device or quick server check)  
- **At registration:** ICP for initial coarse alignment, global COLMAP for fine refinement  
- **User coaching:** Real-time overlap feedback during capture

---

## Part A: Registration Options Deep Dive

### Option A: Global COLMAP Bundle Adjustment (Primary)

**Concept:** Treat all frames from all clips as one big reconstruction problem. COLMAP finds optimal camera poses + point cloud jointly.

```python
# workers/modal/registration/global_colmap_registration.py

from modal import App, gpu, method
import subprocess
import numpy as np
from pathlib import Path

app = App("slate360-lidar-registration")

class GlobalCOLMAPRegistration:
    """
    Multi-clip registration via global COLMAP bundle adjustment.
    Treats all clips as one reconstruction with shared 3D points.
    """
    
    @method()
    @gpu()
    def register_clips(
        self,
        clip_manifests: list[dict],  # [{id, video_path, poses_path, pointcloud_path}, ...]
        gravity_correction: list[float],  # Quaternion [w, x, y, z] from server
        overlap_threshold: float = 0.3,  # 30% visual overlap required
    ) -> dict:
        """
        Returns:
            - success: bool
            - global_poses: dict[clip_id, np.ndarray] — 4x4 transform per clip
            - merged_pointcloud: np.ndarray — Nx3 world-space points
            - confidence: float — registration quality score
        """
        
        # Step 1: Prepare COLMAP database with all clips
        db_path = self._prepare_colmap_database(clip_manifests)
        
        # Step 2: Extract features from all videos (SIFT or SuperPoint)
        self._extract_features(db_path, clip_manifests)
        
        # Step 3: Match features across ALL clips (not just within-clip)
        self._match_features(db_path, clip_manifests)
        
        # Step 4: Geometric verification with gravity prior
        self._geometric_verification(db_path, gravity_correction)
        
        # Step 5: Global bundle adjustment
        sparse_model = self._bundle_adjustment(db_path)
        
        # Step 6: Compute clip-to-world transforms
        global_poses = self._compute_clip_transforms(sparse_model, clip_manifests)
        
        # Step 7: Merge point clouds (transform each clip's LiDAR to world)
        merged_pc = self._merge_pointclouds(
            clip_manifests, 
            global_poses,
            gravity_correction
        )
        
        # Step 8: Quality check
        confidence = self._compute_registration_quality(
            sparse_model, 
            overlap_threshold
        )
        
        return {
            'success': confidence > 0.5,
            'global_poses': global_poses,
            'merged_pointcloud': merged_pc,
            'confidence': confidence,
            'colmap_model_path': sparse_model
        }
    
    def _prepare_colmap_database(self, clips: list[dict]) -> Path:
        """Create COLMAP database schema with all frames from all clips."""
        # COLMAP SQLite schema
        # cameras, images, keypoints, descriptors, matches, two_view_geometries
        
        # Key: frames need unique image_ids across clips
        # e.g., clip_0_frame_0001, clip_0_frame_0002, clip_1_frame_0001...
        
        db = COLMAPDatabase(self.working_dir / "database.db")
        
        for clip in clips:
            # Register camera (intrinsics from ARKit)
            camera_id = db.add_camera(
                model="PINHOLE",
                width=1920,
                height=1440,
                params=clip['camera_intrinsics']  # fx, fy, cx, cy
            )
            
            # Register each frame as an "image" in COLMAP
            for frame_idx, pose in enumerate(clip['arkit_poses']):
                image_id = f"{clip['id']}_frame_{frame_idx:04d}"
                
                # Use ARKit pose as prior (COLMAP can refine or use as soft constraint)
                db.add_image(
                    image_id=image_id,
                    camera_id=camera_id,
                    prior_pose=pose  # ARKit pose as prior
                )
        
        return db.path
    
    def _match_features(self, db_path: Path, clips: list[dict]):
        """
        Cross-clip matching is critical — matches between clips establish registration.
        """
        # Exhaustive matching (slow but thorough for 2-5 clips)
        # or vocab tree matching for speed
        
        subprocess.run([
            "colmap", "exhaustive_matcher",
            "--database_path", str(db_path),
            "--SiftMatching.guided_matching", "true",
            "--SiftMatching.max_ratio", "0.8",
            # Cross-clip matching: match frames from different clips
            "--SiftMatching.cross_check", "true"
        ], check=True)
    
    def _geometric_verification(self, db_path: Path, gravity: list[float]):
        """
        Use gravity direction to validate/improve two-view geometries.
        Reject matches that violate gravity alignment (up should be up).
        """
        subprocess.run([
            "colmap", "matches_importer",  # or custom geometric verification
            "--database_path", str(db_path),
            "--match_list_path", self._create_match_list_with_gravity_prior(gravity)
        ], check=True)
    
    def _bundle_adjustment(self, db_path: Path) -> Path:
        """Global BA optimizing all camera poses + 3D points jointly."""
        
        # Mapper with ARKit pose priors (soft constraints)
        subprocess.run([
            "colmap", "mapper",
            "--database_path", str(db_path),
            "--image_path", str(self.images_dir),
            "--output_path", str(self.sparse_dir),
            # Key: use prior poses (ARKit) with appropriate weight
            "--Mapper.ba_refine_focal_length", "0",  # Fixed intrinsics (ARKit good)
            "--Mapper.ba_refine_principal_point", "0",
            "--Mapper.ba_refine_extra_params", "0",
            # Prior pose weight — how much to trust ARKit vs matches
            "--Mapper.init_pose_prior_weight", "0.1"  # 0.1 = mostly trust matches, slight ARKit bias
        ], check=True)
        
        return self.sparse_dir
    
    def _compute_clip_transforms(self, colmap_model: Path, clips: list[dict]) -> dict:
        """
        Each clip has many frames. Compute clip-to-world as mean of frame transforms.
        """
        transforms = {}
        
        for clip in clips:
            # Get COLMAP poses for all frames in this clip
            colmap_poses = []
            arkit_poses = []
            
            for frame_idx in range(clip['frame_count']):
                image_id = f"{clip['id']}_frame_{frame_idx:04d}"
                
                # COLMAP optimized pose
                colmap_pose = read_colmap_pose(colmap_model, image_id)
                # Original ARKit pose
                arkit_pose = clip['arkit_poses'][frame_idx]
                
                # Compute transform: colmap_pose = T @ arkit_pose
                T = colmap_pose @ np.linalg.inv(arkit_pose)
                colmap_poses.append(colmap_pose)
                arkit_poses.append(T)
            
            # Median transform for robustness
            transforms[clip['id']] = geometric_median(arkit_poses)
        
        return transforms
    
    def _merge_pointclouds(
        self, 
        clips: list[dict], 
        global_poses: dict,
        gravity_correction: list[float]
    ) -> np.ndarray:
        """Transform each clip's LiDAR point cloud to world frame."""
        
        all_points = []
        
        q_gravity = np.array(gravity_correction)  # [w, x, y, z]
        R_gravity = quaternion_to_rotation_matrix(q_gravity)
        
        for clip in clips:
            # Load clip's local point cloud (from LiDAR)
            local_pc = load_draco_pointcloud(clip['pointcloud_path'])
            
            # Transform to world: world = T_clip_to_world @ gravity_corrected @ local
            T = global_poses[clip['id']]
            
            # Apply gravity correction then clip transform
            gravity_aligned = (R_gravity @ local_pc.T).T
            world_pc = (T[:3, :3] @ gravity_aligned.T).T + T[:3, 3]
            
            all_points.append(world_pc)
        
        return np.vstack(all_points)
```

**Pros:**
- Optimal accuracy — joint optimization finds best global solution
- Handles drift between clips naturally
- Leverages both visual features + LiDAR depth
- Proven at scale (Polycam, many photogrammetry apps)

**Cons:**
- Slow: 10-30 minutes on GPU for 2-5 clips
- Requires sufficient visual overlap between clips (30%+)
- Fails if no visual matches (featureless walls)

---

### Option B: Open3D ICP with ARKit Pose Priors (Fast Fallback)

**Concept:** Direct point cloud alignment using ICP (Iterative Closest Point), seeded with ARKit poses.

```python
# workers/modal/registration/fast_icp_registration.py

import open3d as o3d
import numpy as np
from scipy.spatial import KDTree

def register_clips_icp(
    clip_manifests: list[dict],
    gravity_correction: list[float],
    overlap_threshold: float = 0.3
) -> dict:
    """
    Fast ICP-based registration for preview or when COLMAP fails.
    """
    
    # Step 1: Load all point clouds
    pointclouds = []
    for clip in clip_manifests:
        pc = o3d.io.read_point_cloud(clip['pointcloud_path'])
        
        # Apply gravity correction
        R_gravity = quaternion_to_rotation_matrix(gravity_correction)
        pc.rotate(R_gravity, center=(0, 0, 0))
        
        # Transform by ARKit pose (coarse initial alignment)
        initial_pose = clip['arkit_poses'][0]  # First frame pose as clip origin
        pc.transform(initial_pose)
        
        pointclouds.append({
            'id': clip['id'],
            'pc': pc,
            'initial_pose': initial_pose
        })
    
    # Step 2: Pairwise ICP registration
    transforms = {clip_manifests[0]['id']: np.eye(4)}  # First clip is world origin
    
    for i in range(1, len(pointclouds)):
        target = pointclouds[0]['pc']  # Register to first clip (could be cumulative)
        source = pointclouds[i]['pc']
        
        # Estimate overlap first
        overlap = estimate_overlap(source, target, radius=0.1)  # 10cm search radius
        
        if overlap < overlap_threshold:
            return {
                'success': False,
                'error': f'Insufficient overlap between clip 0 and clip {i}: {overlap:.2%}'
            }
        
        # ICP with point-to-plane error (better for LiDAR)
        result = o3d.pipelines.registration.registration_icp(
            source, target,
            max_correspondence_distance=0.05,  # 5cm
            estimation_method=o3d.pipelines.registration.TransformationEstimationPointToPlane(),
            criteria=o3d.pipelines.registration.ICPConvergenceCriteria(
                max_iteration=100,
                relative_fitness=1e-6,
                relative_rmse=1e-6
            )
        )
        
        if result.fitness < overlap_threshold:
            # Try multi-scale ICP
            result = multiscale_icp(source, target, scales=[0.1, 0.05, 0.02])
        
        transforms[pointclouds[i]['id']] = result.transformation @ pointclouds[i]['initial_pose']
    
    # Step 3: Merge
    merged = o3d.geometry.PointCloud()
    for i, pc_data in enumerate(pointclouds):
        pc = pc_data['pc']
        if i > 0:
            pc.transform(transforms[pc_data['id']])
        merged += pc
    
    # Downsample merged
    merged = merged.voxel_down_sample(voxel_size=0.01)  # 1cm voxels
    
    return {
        'success': True,
        'global_poses': transforms,
        'merged_pointcloud': np.asarray(merged.points),
        'confidence': result.fitness if 'result' in dir() else 0.5,
        'method': 'icp'
    }

def estimate_overlap(source: o3d.geometry.PointCloud, target: o3d.geometry.PointCloud, radius: float) -> float:
    """Estimate what fraction of source points have neighbors in target."""
    target_tree = KDTree(np.asarray(target.points))
    source_points = np.asarray(source.points)
    
    distances, _ = target_tree.query(source_points, k=1, distance_upper_bound=radius)
    has_neighbor = distances < radius
    
    return np.mean(has_neighbor)

def multiscale_icp(source, target, scales: list[float]) -> o3d.pipelines.registration.RegistrationResult:
    """ICP at multiple scales for robustness."""
    current_transform = np.eye(4)
    
    for scale in scales:
        # Downsample
        source_down = source.voxel_down_sample(scale)
        target_down = target.voxel_down_sample(scale)
        
        # Estimate normals for point-to-plane
        source_down.estimate_normals()
        target_down.estimate_normals()
        
        # ICP
        result = o3d.pipelines.registration.registration_icp(
            source_down, target_down,
            max_correspondence_distance=scale * 2,
            init=current_transform,
            estimation_method=o3d.pipelines.registration.TransformationEstimationPointToPlane()
        )
        
        current_transform = result.transformation
    
    return result
```

**Pros:**
- Very fast: 30-60 seconds
- Direct point cloud alignment (no visual features needed)
- Works in featureless environments (just needs geometry)

**Cons:**
- Requires good initial pose (ARKit provides this)
- Can get stuck in local minima
- Less accurate than COLMAP (no visual refinement)
- Needs sufficient geometric overlap

---

### Recommended: Hybrid Pipeline

```python
# workers/modal/registration/hybrid_registration.py

async def register_multi_clip_capture(capture_session: dict) -> dict:
    """
    Hybrid registration: ICP for speed, COLMAP for accuracy.
    """
    clips = capture_session['clips']
    gravity = capture_session['gravity_correction']
    
    # Step 1: Fast ICP for initial alignment + overlap validation
    icp_result = await run_icp.remote.aio(clips, gravity)
    
    if not icp_result['success']:
        return {
            'success': False,
            'stage': 'icp_validation',
            'error': icp_result['error'],
            'recommendation': 'Recapture with more overlap'
        }
    
    # Step 2: Use ICP transforms as priors for COLMAP
    # This seeds COLMAP with good initial poses, speeding up convergence
    colmap_result = await run_colmap_with_priors.remote.aio(
        clips, 
        gravity,
        prior_poses=icp_result['global_poses']  # ICP gives COLMAP a head start
    )
    
    if colmap_result['success'] and colmap_result['confidence'] > 0.7:
        return {
            'success': True,
            'method': 'colmap_refined',
            'global_poses': colmap_result['global_poses'],
            'merged_pointcloud': colmap_result['merged_pointcloud'],
            'confidence': colmap_result['confidence']
        }
    
    # Step 3: Fallback to ICP if COLMAP fails
    # (e.g., insufficient texture for visual matching)
    if icp_result['confidence'] > 0.5:
        return {
            'success': True,
            'method': 'icp_only',
            'global_poses': icp_result['global_poses'],
            'merged_pointcloud': icp_result['merged_pointcloud'],
            'confidence': icp_result['confidence'],
            'warning': 'Visual refinement skipped due to insufficient features'
        }
    
    return {
        'success': False,
        'stage': 'both_methods_failed',
        'error': 'Could not register clips. Please recapture with more overlap.'
    }
```

---

## Part B: Overlap Detection at Capture Time

### The Problem

User captures 2 clips. Do they overlap enough? If not, registration fails after 5+ minutes of upload/processing.

### Solution: Real-Time Overlap Estimation

#### Option 1: On-Device (Fastest Feedback)

```swift
// TwinCaptureCoordinator.swift

class OverlapDetector {
    // Keep last N frames from previous clip in memory
    private var anchorFeatures: [FeatureDescriptor] = []
    private let overlapThreshold = 0.3
    
    func startNewClip(previousClip: CapturedClip) {
        // Extract features from last 30 frames of previous clip
        anchorFeatures = extractORBFeatures(previousClip.lastFrames(30))
    }
    
    func checkOverlap(currentFrame: CVPixelBuffer, pose: simd_float4x4) -> OverlapFeedback {
        let currentFeatures = extractORBFeatures(currentFrame)
        
        // Match features
        let matches = matchFeatures(currentFeatures, anchorFeatures)
        let inlierRatio = geometricVerification(matches, pose)
        
        if inlierRatio > overlapThreshold {
            return .sufficientOverlap(percentage: inlierRatio)
        } else if inlierRatio > 0.1 {
            return .insufficientOverlap(
                percentage: inlierRatio,
                guidance: "Move back toward previous capture area"
            )
        } else {
            return .noOverlap(
                guidance: "Walk back to where you finished the last clip"
            )
        }
    }
}

// In capture UI
struct OverlapFeedbackOverlay: View {
    let feedback: OverlapFeedback
    
    var body: some View {
        VStack {
            Spacer()
            
            HStack(spacing: 12) {
                Image(systemName: feedback.icon)
                    .font(.system(size: 24))
                    .foregroundColor(feedback.color)
                
                VStack(alignment: .leading, spacing: 4) {
                    Text(feedback.title)
                        .font(.system(size: 16, weight: .semibold))
                    
                    if let guidance = feedback.guidance {
                        Text(guidance)
                            .font(.system(size: 14))
                            .foregroundColor(.secondary)
                    }
                }
                
                Spacer()
                
                if let percentage = feedback.percentage {
                    Text("\(Int(percentage * 100))%")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundColor(feedback.color)
                }
            }
            .padding()
            .background(.ultraThinMaterial)
            .cornerRadius(12)
            .padding(.horizontal, 20)
            .padding(.bottom, 100)  // Above shutter button
        }
    }
}
```

**Visual indicators:**
- 🔴 < 10% overlap: "Walk back to previous area"
- 🟡 10-30%: "Move closer to where you captured before"
- 🟢 > 30%: "Good overlap — continue capturing"

---

#### Option 2: Server-Side Quick Check (More Accurate)

```python
# workers/modal/registration/quick_overlap_check.py

@app.function(cpu=1, memory=1024, timeout=60)
def quick_overlap_check(clip_a_frames: list[np.ndarray], clip_b_frames: list[np.ndarray]) -> dict:
    """
    30-second server check for overlap using lightweight feature matching.
    """
    import cv2
    
    # Extract SIFT features (faster than COLMAP for quick check)
    sift = cv2.SIFT_create(nfeatures=500)  # Limit for speed
    
    features_a = [sift.detectAndCompute(f, None) for f in clip_a_frames[-10:]]
    features_b = [sift.detectAndCompute(f, None) for f in clip_b_frames[:10]]
    
    # Match
    bf = cv2.BFMatcher()
    total_matches = 0
    good_matches = 0
    
    for (kp_a, desc_a) in features_a:
        for (kp_b, desc_b) in features_b:
            if desc_a is None or desc_b is None:
                continue
            matches = bf.knnMatch(desc_a, desc_b, k=2)
            
            # Lowe's ratio test
            for m, n in matches:
                if m.distance < 0.75 * n.distance:
                    good_matches += 1
                total_matches += 1
    
    overlap_score = good_matches / max(total_matches, 100)
    
    return {
        'overlap_estimate': overlap_score,
        'sufficient': overlap_score > 0.3,
        'confidence': 'medium'  # Full COLMAP needed for certainty
    }
```

**Flow:**
1. User finishes clip A → upload starts
2. User starts clip B → app sends first 10 frames to server
3. Server compares to last 10 frames of clip A
4. App shows result in ~5 seconds: "Overlap looks good" / "Move closer"

---

### User Coaching UI (Combined)

```
┌─────────────────────────────────────────────────────────────────┐
│  CAPTURING CLIP 2 of 3                                          │
│                                                                 │
│  [CAMERA PREVIEW — with ghost overlay of previous clip]        │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                                                           │ │
│  │              🔴 INSUFFICIENT OVERLAP                      │ │
│  │                                                           │ │
│  │   Walk back toward the doorway you just captured          │ │
│  │                                                           │ │
│  │   Current overlap: 12%  (need 30%+)                       │ │
│  │   └────██░░░░░░░░░░░░░░░░░░░░░░ 12%                       │ │
│  │                                                           │ │
│  │   [← Previous clip ended here]  ←─── [You are here]       │ │
│  │                                                           │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│                    [ ◉ RECORDING ]                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Ghost overlay:** Semi-transparent keyframes from previous clip's end overlaid on current view (ARKit world-aligned) to show user where to go.

---

## Part C: OSS Reference Implementations

### 1. Open3D SLAM (open3d_slam)

```
https://github.com/PRBonn/open3d_slam
```

- Real-time LiDAR SLAM
- Loop closure detection
- Multi-session mapping

**Relevance:** Study loop closure detection for overlap estimation.

---

### 2. RTAB-Map (Real-Time Appearance-Based Mapping)

```
https://github.com/introlab/rtabmap
```

- Visual + LiDAR SLAM
- Multi-session mapping with graph-based registration
- iOS app available

**Relevance:** Multi-session registration is exactly our use case. Graph-based approach for global consistency.

---

### 3. DISCO (Dense Indoor Scene COmpletion)

```
https://github.com/vecerkovakaterina/DISCO
```

- Multi-view 3D reconstruction
- Indoor-specific

**Relevance:** Indoor reconstruction patterns.

---

### 4. Nerfstudio (Our Current Stack)

```
https://github.com/nerfstudio-project/nerfstudio
```

Already used for splatfacto. Supports multi-camera data via transforms.json with multiple camera paths.

---

## Part D: Implementation Roadmap

### Phase 1: ICP Foundation (1 week)

```python
# Immediate implementation
1. Open3D ICP registration for 2-clip scenarios
2. Gravity-corrected point clouds
3. Overlap estimation
4. Fallback "insufficient overlap" error message
```

**Deliverable:** Working multi-clip registration for simple cases.

---

### Phase 2: COLMAP Integration (2 weeks)

```python
# Global registration
1. COLMAP database setup with multi-clip
2. Cross-clip feature matching
3. Global bundle adjustment
4. ICP → COLMAP handoff
```

**Deliverable:** High-accuracy registration for complex cases.

---

### Phase 3: Overlap Detection (1 week)

```swift
// iOS app updates
1. On-device ORB feature extraction
2. Overlap feedback UI
3. Ghost overlay from previous clip
4. Server-side quick check (optional fast path)
```

**Deliverable:** User knows immediately if overlap is sufficient.

---

### Phase 4: Advanced Registration (2 weeks)

```python
# Quality improvements
1. RANSAC-based outlier rejection
2. Multi-scale ICP for robustness
3. Graph-based global optimization (like RTAB-Map)
4. Uncertainty quantification per clip
```

**Deliverable:** Robust registration with quality scores.

---

## Summary: Decision Matrix

| Scenario | Method | Time | Quality |
|----------|--------|------|---------|
| 2 clips, good visual texture | ICP → COLMAP | 12 min | ⭐⭐⭐ Excellent |
| 2 clips, poor texture | ICP only | 45 sec | ⭐⭐ Good |
| 3-5 clips, standard | ICP → COLMAP | 20 min | ⭐⭐⭐ Excellent |
| 3-5 clips, emergency | ICP only | 2 min | ⭐⭐ Good |
| Preview/rough draft | ICP | 30 sec | ⭐⭐ Good enough |
| Final deliverable | COLMAP | 15-30 min | ⭐⭐⭐ Best |

**Recommendation:** Start with ICP for speed, always run COLMAP for final quality, with user option to "use fast version" for quick previews.

---

*Architecture locked: July 1, 2026*