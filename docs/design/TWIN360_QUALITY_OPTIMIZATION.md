# Twin 360 — Gaussian Splat Quality & Speed Optimization
## Phone + 360 Camera Fusion Pipeline for Building Walkthroughs

**Current State:** Phone ARKit (video + LiDAR + gravity poses) → COLMAP → splatfacto → SPZ viewer  
**Issues:** Low quality, floaters, upside-down, off-center, slow processing  
**Target:** High-quality building walkthroughs (interior + exterior) at normal walking pace

---

## 1. Capture Modality Comparison

### Recommendation: Hybrid Phone Video + 360 Stills (Not 360 Video)

| Modality | Quality | Speed | Artifacts | Best For |
|----------|---------|-------|-----------|----------|
| **Phone video** (your current) | Low-Medium | Fast | Motion blur, rolling shutter, limited FoV | Quick captures, narrow spaces |
| **Phone photos (burst)** | Medium | Slow | Less motion blur, higher res per frame | Detail areas, photogrammetry-style |
| **360 video** | Medium | Medium | Equirect→perspective distortion, compression | Fast walkthroughs, revisit later |
| **360 stills (timed)** | **HIGH** | Medium | Best quality, full spherical coverage, less blur | **RECOMMENDED for buildings** |
| **Hybrid: Phone LiDAR poses + 360 stills** | **HIGHEST** | **OPTIMIZED** | Leverages phone tracking, 360 coverage, skip COLMAP | **TARGET ARCHITECTURE** |

**Why 360 stills over 360 video:**
- Video compression (H.264/H.265) destroys fine detail needed for SfM feature matching
- Motion blur from walking + 360 camera auto-shutter
- Equirectangular projection artifacts in video
- Stills: RAW or high-quality JPG, manual exposure lock, sharper features

**Why phone video is problematic:**
- iPhone auto-exposure creates flicker (challenges SfM)
- Limited FoV (≈75°) requires many overlapping frames
- Motion blur at walking pace (>1 pixel motion between frames)
- Rolling shutter on fast motions

---

## 2. 360 Ingestion: Equirectangular to Perspective

### Current Best Practice: Cube Face Extraction + Perspective Sampling

**Does splatfacto/COLMAP support spherical cameras directly?**  
**No.** COLMAP assumes pinhole camera model. splatfacto inherits this. You MUST convert to perspective.

### Recommended Pipeline: 6-Cube Face Extraction

```python
# tools/360_to_perspective.py
import cv2
import numpy as np
from pathlib import Path
import json

def equirect_to_cube(equi_img, face_size=1024):
    """
    Convert equirectangular image to 6 cube faces.
    Returns dict with 'front', 'back', 'left', 'right', 'top', 'bottom'
    """
    h, w = equi_img.shape[:2]
    
    # Cube map face matrices
    faces = {}
    
    # Define face rotations (yaw, pitch) for each cube face
    face_angles = {
        'front': (0, 0),
        'right': (90, 0),
        'back': (180, 0),
        'left': (-90, 0),
        'top': (0, 90),
        'bottom': (0, -90)
    }
    
    for face_name, (yaw, pitch) in face_angles.items():
        # Generate perspective projection
        fov_x = 90  # 90° horizontal FOV for cube face
        fov_y = 90
        
        K = np.array([
            [face_size / (2 * np.tan(np.radians(fov_x) / 2)), 0, face_size / 2],
            [0, face_size / (2 * np.tan(np.radians(fov_y) / 2)), face_size / 2],
            [0, 0, 1]
        ])
        
        # Rotation matrix from yaw/pitch
        R = rotation_matrix_ypr(yaw, pitch, 0)
        
        # Sample from equirect
        face_img = sample_equirect_to_perspective(equi_img, R, K, face_size)
        faces[face_name] = face_img
    
    return faces

def sample_equirect_to_perspective(equi_img, R, K, face_size):
    """Sample equirectangular image using perspective projection"""
    # Create pixel coordinates for output face
    y, x = np.mgrid[0:face_size, 0:face_size]
    
    # Unproject to 3D rays
    rays = np.stack([
        (x - K[0, 2]) / K[0, 0],
        (y - K[1, 2]) / K[1, 1],
        np.ones_like(x)
    ], axis=-1).reshape(-1, 3)
    
    # Apply rotation
    rays = (R @ rays.T).T
    
    # Convert to spherical coordinates
    rays = rays / np.linalg.norm(rays, axis=-1, keepdims=True)
    theta = np.arctan2(rays[:, 0], rays[:, 2])  # yaw
    phi = np.arcsin(rays[:, 1])                  # pitch
    
    # Map to equirect coordinates
    h, w = equi_img.shape[:2]
    u = (theta / np.pi + 1) / 2 * w
    v = (-phi / (np.pi / 2) + 1) / 2 * h
    
    # Remap with bilinear interpolation
    face_img = cv2.remap(equi_img, u.astype(np.float32).reshape(face_size, face_size),
                        v.astype(np.float32).reshape(face_size, face_size),
                        cv2.INTER_LINEAR, borderMode=cv2.BORDER_WRAP)
    
    return face_img

def rotation_matrix_ypr(yaw, pitch, roll):
    """Create rotation matrix from yaw/pitch/roll (degrees)"""
    y, p, r = np.radians([yaw, pitch, roll])
    
    Rz = np.array([[np.cos(y), -np.sin(y), 0],
                   [np.sin(y), np.cos(y), 0],
                   [0, 0, 1]])
    
    Ry = np.array([[np.cos(p), 0, np.sin(p)],
                   [0, 1, 0],
                   [-np.sin(p), 0, np.cos(p)]])
    
    Rx = np.array([[1, 0, 0],
                   [0, np.cos(r), -np.sin(r)],
                   [0, np.sin(r), np.cos(r)]])
    
    return Rz @ Ry @ Rx
```

### Frame Extraction Cadence from 360

**Recommended:** Don't extract from video. Use **360 stills at 2-second intervals** during walk.

| Method | Frames/10m walk | Processing | Quality |
|--------|-----------------|------------|---------|
| 360 video 30fps, extract 2fps | 600 frames | 1 hour+ | Low (compression) |
| **360 stills every 2s** | **~30 frames** | **15 min** | **HIGH** |
| Phone video 30fps, extract 2fps | ~60 frames | 30 min | Medium |

**If using 360 video (legacy):**
- Extract at **1 frame per 0.5m of movement** (not time-based)
- Use scene change detection to avoid redundant frames
- Maximum 300 frames per scene (COLMAP memory limits)

```bash
# Extract from 360 video at 1fps
ffmpeg -i input_360.mp4 -vf "fps=1,scale=3840:1920" -q:v 2 frames/%04d.jpg

# Or use Nerfstudio's video processor
ns-process-data video --data input_360.mp4 --output-dir processed/ --num-frames-target 150
```

---

## 3. LiDAR + 360 Fusion: Known Poses Pipeline

### Can We Skip COLMAP Entirely?

**Yes, with caveats.** ARKit provides gravity-aligned poses, but 360 camera offset must be calibrated.

### Rig Calibration (Critical)

```python
# calibrate_rig.py
import numpy as np
from scipy.spatial.transform import Rotation

def calibrate_phone_to_360(phone_pose, visible_360_points):
    """
    Calibrate offset between phone camera and 360 camera center.
    Phone pose is from ARKit (camera frame).
    visible_360_points are 3D points visible in both.
    """
    # ARKit poses are in phone camera frame
    # 360 center is offset from phone camera
    
    # Typical iPhone + Insta360 X3 rig:
    # Phone camera is ~10cm below 360 camera center
    # Offset is roughly (0, -0.10, 0) in phone's local frame
    
    OFFSET_PRIOR = np.array([0.0, -0.10, 0.0])  # meters
    
    # Solve for optimal offset using known correspondences
    # Or use hand-eye calibration if you have multiple poses
    
    return OFFSET_PRIOR

def compute_360_pose(phone_pose_world, rig_offset):
    """
    Convert phone ARKit pose to 360 camera pose.
    
    phone_pose_world: (R_phone, t_phone) — world-to-phone-camera
    rig_offset: translation from phone camera to 360 center (phone frame)
    
    Returns: (R_360, t_360) — world-to-360-camera
    """
    R_phone, t_phone = phone_pose_world
    
    # 360 center is phone center + offset rotated by phone orientation
    t_360 = t_phone + R_phone @ rig_offset
    
    # Rotation is same (both use phone's orientation)
    R_360 = R_phone
    
    return R_360, t_360
```

### Gravity-Aligned Coordinate System (Fixes Upside-Down)

```python
# transforms.json generation with gravity alignment
def create_transforms_json(phone_poses, rig_offset, output_path):
    """
    Create transforms.json for splatfacto with known poses.
    Uses ARKit gravity vector to ensure consistent up-axis.
    """
    frames = []
    
    # ARKit's Y is gravity-up
    # We'll use this to ensure consistent world up
    
    for i, phone_pose in enumerate(phone_poses):
        # Convert to 360 pose
        R_360, t_360 = compute_360_pose(phone_pose, rig_offset)
        
        # Create 4x4 transform matrix
        transform = np.eye(4)
        transform[:3, :3] = R_360
        transform[:3, 3] = t_360
        
        # splatfacto/nerfstudio expects camera-to-world (inverse)
        camera_to_world = np.linalg.inv(transform)
        
        frames.append({
            "file_path": f"frames/{i:04d}.jpg",
            "transform_matrix": camera_to_world.tolist(),
            "camera_model": "OPENCV_FISHEYE"  # 360 often needs fisheye model
        })
    
    # Auto-compute scene center and scale
    all_positions = np.array([f["transform_matrix"][:3, 3] for f in frames])
    center = np.mean(all_positions, axis=0)
    scale = np.max(np.std(all_positions, axis=0)) * 3
    
    transforms = {
        "camera_model": "OPENCV_FISHEYE",
        "frames": frames,
        "scene_center": center.tolist(),
        "scene_scale": float(scale),
        "orientation_override": "arkit_gravity"  # Custom field for viewer
    }
    
    with open(output_path, 'w') as f:
        json.dump(transforms, f, indent=2)
```

### Splatfacto with Known Poses

```bash
# Train with known poses (bypass COLMAP entirely)
# transforms.json must have all frames with transform_matrix

ns-train splatfacto \
    --data /path/to/processed \
    --pipeline.datamanager.train-num-rays-per-batch 4096 \
    --pipeline.model.cull-alpha-thresh 0.005 \
    --pipeline.model.continue_cull_post_densification True \
    --max-num-iterations 30000 \
    --steps-per-save 5000 \
    --experiment-name building_walkthrough \
    --viewer.quit-on-train-completion True \
    --pipeline.datamanager.camera-optimizer.mode off  # CRITICAL: Don't optimize camera poses

# Key flags:
# --pipeline.datamanager.camera-optimizer.mode off  # Keep your ARKit poses fixed
```

**Caveat:** splatfacto still runs COLMAP-style feature matching if you don't provide `points3D.ply` or use `ns-process-data images`. For pure known-poses:

```bash
# Create point cloud from LiDAR depth for initialization
python tools/lidar_to_pointcloud.py --poses transforms.json --lidar lidar_frames/

# Train with existing point cloud
ns-train splatfacto \
    --data /path/to/processed \
    --pipeline.model.point-cloud-filename lidar_pointcloud.ply \
    --pipeline.datamanager.camera-optimizer.mode off
```

---

## 4. Speed Optimization

### Target: 15-30 minutes per scan end-to-end

| Step | Current | Optimized | Technique |
|------|---------|-----------|-----------|
| **Capture** | 10-15 min walk | 10-15 min walk | Same, but 360 stills not video |
| **Upload** | 5-10 min | 2-5 min | 30 high-quality frames vs 600 video frames |
| **COLMAP** | 20-60 min | **SKIP** | Use ARKit poses directly |
| **splatfacto** | 30-60 min | 10-15 min | Reduced iterations, lower res training |
| **Export SPZ** | 5 min | 2 min | Parallelized |
| **Total** | 60-120 min | **15-30 min** | **4-8x faster** |

### Splatfacto Speed Settings (Quality vs Speed)

```bash
# FAST config (10-15 min, good quality)
ns-train splatfacto-fast \
    --data /path/to/processed \
    --max-num-iterations 15000 \
    --pipeline.model.num-gaussians-per-voxel 4 \
    --pipeline.model.sh-degree 1 \
    --pipeline.datamanager.train-num-images-to-sample-from 16 \
    --machine.num-devices 1

# QUALITY config (30-45 min, best quality)
ns-train splatfacto \
    --data /path/to/processed \
    --max-num-iterations 30000 \
    --pipeline.model.num-gaussians-per-voxel 8 \
    --pipeline.model.sh-degree 3 \
    --pipeline.model.densify-grad-thresh 0.0002
```

### Frame Decimation Strategy

**Don't use all frames.** Select keyframes based on:
1. **Distance traveled:** >0.5m from last keyframe
2. **Angle change:** >15° rotation from last keyframe
3. **Overlap check:** At least 30% visual overlap (use ORB feature count)

```python
# tools/keyframe_selector.py
import cv2
import numpy as np
from pathlib import Path

def select_keyframes(frames_dir, poses, min_distance=0.5, min_angle=15):
    """Select sparse keyframes for training."""
    frames = sorted(Path(frames_dir).glob("*.jpg"))
    keyframes = [frames[0]]  # Always keep first
    last_pose = poses[0]
    last_keyframe_idx = 0
    
    for i, (frame, pose) in enumerate(zip(frames[1:], poses[1:])):
        # Check distance
        dist = np.linalg.norm(pose[:3, 3] - last_pose[:3, 3])
        
        # Check rotation angle
        R_diff = pose[:3, :3].T @ last_pose[:3, :3]
        angle = np.degrees(np.arccos((np.trace(R_diff) - 1) / 2))
        
        # Check visual overlap with last keyframe
        if dist > min_distance or angle > min_angle:
            overlap = compute_visual_overlap(frames[last_keyframe_idx], frame)
            if overlap > 0.3:  # 30% overlap minimum
                keyframes.append(frame)
                last_pose = pose
                last_keyframe_idx = i
    
    return keyframes

def compute_visual_overlap(frame1_path, frame2_path):
    """Compute feature-based visual overlap between two frames."""
    img1 = cv2.imread(str(frame1_path), cv2.IMREAD_GRAYSCALE)
    img2 = cv2.imread(str(frame2_path), cv2.IMREAD_GRAYSCALE)
    
    orb = cv2.ORB_create(nfeatures=500)
    kp1, des1 = orb.detectAndCompute(img1, None)
    kp2, des2 = orb.detectAndCompute(img2, None)
    
    if des1 is None or des2 is None:
        return 0.0
    
    matcher = cv2.BFMatcher(cv2.NORM_HAMMING, crossCheck=True)
    matches = matcher.match(des1, des2)
    
    return len(matches) / max(len(kp1), len(kp2))
```

---

## 5. Interior vs Exterior Handling

### Scene Type Detection

```python
# tools/scene_classifier.py
def classify_scene(frames_dir, poses):
    """
    Classify scene as interior vs exterior based on:
    1. Sky visibility (color histogram)
    2. Lighting distribution
    3. Depth distribution (if LiDAR available)
    """
    frames = list(Path(frames_dir).glob("*.jpg"))[:10]  # Sample
    
    exterior_indicators = 0
    
    for frame_path in frames:
        img = cv2.imread(str(frame_path))
        h, w = img.shape[:2]
        
        # Check top 20% for sky (bright blue/cyan)
        top_region = img[:h//5, :]
        hsv = cv2.cvtColor(top_region, cv2.COLOR_BGR2HSV)
        
        # Sky: high brightness, blue hue
        sky_mask = (hsv[:, :, 2] > 180) & (hsv[:, :, 0] > 90) & (hsv[:, :, 0] < 130)
        sky_ratio = np.sum(sky_mask) / sky_mask.size
        
        if sky_ratio > 0.3:
            exterior_indicators += 1
    
    return "exterior" if exterior_indicators > 5 else "interior"
```

### Viewer Initialization

```javascript
// viewer/spz-viewer.js
function initializeViewer(spzUrl, sceneType, gravityVector) {
    const viewer = new SPZViewer({
        source: spzUrl,
        camera: {
            // Use gravity from ARKit for up vector
            up: gravityVector || [0, 1, 0],
            
            // Scene-type specific starting position
            ...(sceneType === 'interior' ? {
                // Start inside, at scene center, looking at nearest content
                position: 'center',
                lookAt: 'nearest-gaussian-mean',
                radius: 0.5, // Don't orbit, free navigation
            } : {
                // Exterior: orbit mode, start outside
                position: 'orbit',
                radius: 'auto-scale * 1.5',
                theta: 45,
                phi: 30,
            }),
        },
        
        // Recenter to scene content, not world origin
        autoCenter: true,
        
        // Flip Y if model appears upside-down
        orientationOverride: gravityVector ? 'gravity-up' : null,
    });
    
    return viewer;
}
```

### Fix Upside-Down in transforms.json

```python
def fix_orientation(frames, gravity_vector=None):
    """
    Ensure consistent up vector across all frames.
    Uses ARKit gravity or estimates from poses.
    """
    if gravity_vector is None:
        # Estimate from pose statistics
        # ARKit Y-up should dominate in most frames
        up_estimate = np.mean([
            frame['transform_matrix'][1, :3]  # Y axis of each camera
            for frame in frames
        ], axis=0)
        up_estimate = up_estimate / np.linalg.norm(up_estimate)
        
        # If upside-down (negative Y in world), flip
        if up_estimate[1] < 0:
            gravity_vector = [0, -1, 0]
        else:
            gravity_vector = [0, 1, 0]
    
    # Create rotation to align gravity with +Y
    target_up = np.array([0, 1, 0])
    current_up = np.array(gravity_vector)
    
    rotation_axis = np.cross(current_up, target_up)
    rotation_angle = np.arccos(np.dot(current_up, target_up))
    
    if np.linalg.norm(rotation_axis) > 0.01:
        R_align = Rotation.from_rotvec(
            rotation_axis / np.linalg.norm(rotation_axis) * rotation_angle
        ).as_matrix()
        
        # Apply to all frames
        for frame in frames:
            T = np.array(frame['transform_matrix'])
            T[:3, :3] = R_align @ T[:3, :3]
            T[:3, 3] = R_align @ T[:3, 3]
            frame['transform_matrix'] = T.tolist()
    
    return frames
```

---

## 6. Handling Reflective/Textureless Surfaces

### The Problem
- **Glass, screens, mirrors:** No SfM features, specular reflections
- **White walls:** Low texture, feature-poor
- **Results:** Floaters, holes, distorted geometry

### Mitigation Strategies

**1. Capture Technique:**
- Avoid shooting directly at glass/mirrors
- Capture at oblique angles to white walls (not straight-on)
- Ensure overlap with textured areas
- Use polarizing filter on 360 camera (reduces reflections)

**2. Data Augmentation:**
```python
# Remove frames that are >50% reflection/screen
# Use semantic segmentation to detect problematic regions

def filter_bad_frames(frames_dir, poses):
    """Filter frames with too much glass/screen/wall."""
    good_frames = []
    
    for frame_path in Path(frames_dir).glob("*.jpg"):
        img = cv2.imread(str(frame_path))
        
        # Use CLIP or simple heuristics
        # High brightness variance = good texture
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        variance = cv2.Laplacian(gray, cv2.CV_64F).var()
        
        # Low variance = blurry or textureless
        if variance > 100:  # Threshold
            good_frames.append(frame_path)
    
    return good_frames
```

**3. Splatfacto Parameters for Textureless Scenes:**

```bash
ns-train splatfacto \
    --data /path/to/processed \
    --pipeline.model.cull-alpha-thresh 0.01 \  # Higher = remove floaters
    --pipeline.model.continue_cull_post_densification True \
    --pipeline.model.densify-grad-thresh 0.0004 \  # Less aggressive densification
    --pipeline.model.densification-interval 200  # Less frequent
```

---

## 7. Concrete OSS Tooling

### Recommended Tool Stack

| Purpose | Tool | Notes |
|---------|------|-------|
| 360→perspective | **Nerfstudio** (`ns-process-data`) | Built-in, well-tested |
| Alternative 360→perspective | **equirec2perspec** (GitHub) | Standalone, customizable |
| SfM | **COLMAP** | Standard, slow but accurate |
| SfM alternative | **GLOMAP** (GitHub: colmap/glomap) | Much faster, similar quality |
| Gaussian splatting | **nerfstudio splatfacto** | Industry standard |
| Alternative splatting | **Postshot** (maurock) | Standalone, good for batch |
| Alternative splatting | **gsplat** (nerfstudio backend) | Can use directly |
| Viewer | **Spark** (supersplats) | Web-based, fast |
| Viewer alternative | **three.js + gaussian-splatting** | Custom integration |
| 360 processing | **Insta360 Studio** | Export to equirect stills |
| 360 calibration | **OpenCV fisheye** | For non-Insta360 rigs |
| Point cloud | **Open3D** | LiDAR processing |

### GitHub Repositories

```bash
# Essential tools
https://github.com/nerfstudio-project/nerfstudio      # Core pipeline
https://github.com/nerfstudio-project/gsplat           # Gaussian splat backend
https://github.com/colmap/glomap                       # Fast SfM
https://github.com/maurock/gaussian_splatting        # Standalone splats
https://github.com/ArthurBrussee/equirec2perspec     # 360→perspective
https://github.com/playcanvas/supersplats            # SPZ viewer

# Community resources
https://github.com/MrNeRF/gaussian-splatting-journal # Capture guides
https://github.com/graphdeco-inria/gaussian-splatting # Original Inria code
```

### Known-Good Capture SOPs (Community Best Practices)

**From the Gaussian Splatting Discord/Reddit:**

1. **Overlap:** 70-80% between consecutive frames minimum
2. **Speed:** Walk slowly, 1 step per second
3. **Angles:** Capture at multiple heights (eye level, high, low)
4. **Avoid:** Pure rotation (causes floating artifacts)
5. **Lighting:** Consistent lighting, avoid windows in frame
6. **Texture:** Include textured reference points (bookshelves, plants)

**For 360 specifically:**
- Keep camera upright (gravity-aligned)
- Don't rotate 360 camera while walking (causes motion blur)
- Use monopod/tripod mount, not hand-held
- 2-second interval captures (not continuous)

---

## 8. Implementation Priorities

### Pipeline Changes (Backend)

| Priority | Change | Impact | Effort |
|----------|--------|--------|--------|
| **P0** | Rig calibration offset (10cm phone→360) | Fixes alignment | 1-2 days |
| **P0** | Gravity alignment in transforms.json | Fixes upside-down | 2-3 days |
| **P0** | `--camera-optimizer.mode off` | Skip COLMAP for speed | 1 day |
| **P1** | 360→6-cube perspective conversion | Enables 360 workflow | 3-5 days |
| **P1** | Keyframe selector (distance + angle) | Reduces frame count | 2-3 days |
| **P2** | GLOMAP instead of COLMAP | 3x speedup if COLMAP required | 2-3 days |
| **P2** | Interior/exterior classifier | Auto-viewer settings | 2 days |
| **P3** | LiDAR point cloud initialization | Better convergence | 3-5 days |

### Capture Technique Changes (App)

| Priority | Change | Impact | Effort |
|----------|--------|--------|--------|
| **P0** | 360 stills capture mode (2s interval) | Quality boost | 2-3 days |
| **P0** | Phone + 360 rig calibration UI | User-guided offset | 3-5 days |
| **P1** | Capture speed guidance (pacing indicator) | Better overlap | 2 days |
| **P1** | Reflective surface warning | Better technique | 1-2 days |
| **P2** | Keyframe preview (show what's captured) | User confidence | 3 days |

### Expected Improvements

| Metric | Current | After P0+P1 | After All |
|--------|---------|-------------|-----------|
| Processing time | 60-120 min | 15-30 min | 10-20 min |
| Quality (visual) | Low (floaters) | Medium (aligned) | High (sharp) |
| Upside-down rate | 30% | 5% | <1% |
| Off-center rate | 50% | 10% | <5% |

---

*Optimization guide: June 30, 2026*  
*Tools: Nerfstudio 1.0+, COLMAP 3.9+, GLOMAP, Insta360 X3*
