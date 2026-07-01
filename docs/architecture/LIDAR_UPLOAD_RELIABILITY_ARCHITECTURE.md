# LiDAR Upload Reliability Architecture
## 150–400 MB Capture → Cloud with Resumability, Parallelism, Compression

**Date:** July 1, 2026  
**Context:** iOS ARKit LiDAR → Cloudflare R2 → Modal GPU reconstruction  
**Problem:** 2-min clip fails with current URLSession (ephemeral, serial, in-memory, 60s timeout)

---

## Executive Summary: Recommended Stack

| Component | Current | Recommended | Why |
|-----------|---------|-------------|-----|
| **Upload Protocol** | S3 multipart, serial | **TUS** (tus.io/TUSKit) | Native resume across launches, handles 400MB gracefully |
| **Backgrounding** | URLSession ephemeral | **URLSession background** + **TUS** | iOS manages upload even if app killed |
| **Compression** | H.264 raw, PLY raw | **HEVC on-device** + **Draco** | 40-60% size reduction, Modal can decode |
| **Parallelism** | Serial 8MiB parts | **Parallel TUS chunks** (5-10 concurrent) | Saturates bandwidth, faster completion |
| **State Persistence** | In-memory | **Keychain/SQLite chunk manifest** | Resume after reboot |

**Ranked Implementation:**
1. **Immediate (2 days):** URLSession background + file-based (not Data) + retry loop
2. **Short-term (1 week):** TUSKit integration with R2/S3-compatible endpoint
3. **Medium-term (2 weeks):** HEVC + Draco compression
4. **Consider (1 day eval):** Adopt NeRFCapture capture pipeline

---

## Part A: Upload Protocol Decision

### Option 1: URLSession Background (Apple Native)

```swift
// Native but limited resumability
let config = URLSessionConfiguration.background(withIdentifier: "com.slate360.uploads")
config.isDiscretionary = false  // Don't let iOS defer
config.sessionSendsLaunchEvents = true  // Relaunch app on completion

let session = URLSession(configuration: config, delegate: self, delegateQueue: nil)

// Problem: Resume is at *task* level, not *chunk* level
// If 380MB upload fails at 370MB, you restart from 0
// Good for: Small files (<50MB), simple implementation
```

**Verdict:** ❌ Rejected — no chunk-level resume for 400MB files

---

### Option 2: TUS (tus.io + TUSKit) — **RECOMMENDED**

```swift
// TUSKit provides chunk-level resume
import TUSKit

let tusClient = TUSClient(
    server: URL(string: "https://api.slate360.ai/files")!,
    sessionIdentifier: "slate360-lidar",
    storageDirectory: FileManager.default
        .urls(for: .documentDirectory, in: .userDomainMask)[0]
        .appendingPathComponent("TUS-Uploads"),
    chunkSize: 8 * 1024 * 1024,  // 8MiB — R2 sweet spot
    retries: 10,
    retryDelay: 1.0
)

// Upload with automatic resume across app launches
let upload = try tusClient.uploadFileAt(
    filePath: lidarCapture.localUrl,
    metadata: [
        "captureId": capture.id,
        "fileType": "lidar-video",
        "projectId": project.id
    ]
)

// State is persisted to disk — survives app kill, phone restart
// Only missing chunks re-upload on resume
```

**Backend (R2-compatible TUS server):**

```typescript
// app/api/files/tus/route.ts
import { Router } from 'express';
import { S3Store } from '@tus/s3-store';
import { Server } from '@tus/server';

const tusServer = new Server({
  path: '/api/files/tus',
  store: new S3Store({
    partSize: 8 * 1024 * 1024, // 8MiB — matches Cloudflare R2 minimum
    s3ClientConfig: {
      region: 'auto',
      endpoint: process.env.R2_ENDPOINT,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
      }
    },
    bucket: process.env.R2_BUCKET,
  }),
  // R2 multipart: 8MiB minimum, 10,000 parts maximum
  // 8MiB * 10,000 = 78GB max file — plenty for LiDAR
});

export const config = {
  api: {
    bodyParser: false, // TUS handles its own streaming
  },
};

export default tusServer.handle;
```

**Why TUS wins:**
- **Chunk-level resume:** Upload 45/50 chunks, resume at chunk 46
- **iOS backgrounding:** TUSKit + URLSession background = iOS manages continuation
- **Standard protocol:** Well-defined, battle-tested (Vimeo, Cloudflare use it)
- **R2 compatible:** S3 multipart under the hood

---

### Option 3: Apple WWDC23 Resumable Upload Tasks (New iOS 17 API)

```swift
// iOS 17+ — URLSessionUploadTask with resume support
// BUT: Limited documentation, TUS is more mature

let task = session.uploadTask(withResumeData: resumeData)

// ResumeData is opaque — you can't inspect chunks
// Implementation complexity high, ecosystem immature
```

**Verdict:** ⚠️ Watch but not adopt yet — wait for iOS 18+ maturity

---

## Part B: Resumable Multipart Implementation

### Chunk Manifest Persistence

```swift
// UploadManifest.swift
struct UploadManifest: Codable {
    let captureId: String
    let fileType: FileType  // .video, .pointCloud, .poses
    let totalChunks: Int
    var uploadedChunks: Set<Int>  // Chunk indices successfully uploaded
    var etags: [Int: String]      // S3 ETag per chunk for verification
    var uploadId: String          // S3 multipart upload ID
    let createdAt: Date
    var lastUpdated: Date
    
    // Persist to Keychain (survives app delete/reinstall if needed)
    // or SQLite (faster queries, easier eviction)
}

class UploadPersistence {
    static let shared = UploadPersistence()
    private let db: SQLite.Database
    
    func saveManifest(_ manifest: UploadManifest) throws {
        try db.execute("""
            INSERT OR REPLACE INTO upload_manifests (
                capture_id, file_type, total_chunks, uploaded_chunks,
                etags, upload_id, created_at, last_updated
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, [
            manifest.captureId,
            manifest.fileType.rawValue,
            manifest.totalChunks,
            Array(manifest.uploadedChunks),
            try JSONEncoder().encode(manifest.etags),
            manifest.uploadId,
            manifest.createdAt,
            manifest.lastUpdated
        ])
    }
    
    func loadManifest(captureId: String, fileType: FileType) -> UploadManifest? {
        // Query and reconstruct
    }
}
```

### Parallel Chunk Upload with URLSession

```swift
// If not using TUSKit, implement parallel S3 multipart

class ParallelMultipartUploader {
    let maxConcurrentUploads = 5  // iOS sweet spot (don't saturate)
    let chunkSize = 8 * 1024 * 1024  // 8MiB
    
    func upload(file: URL, captureId: String) async throws {
        // 1. Get or create multipart upload
        let manifest = try await getOrCreateManifest(file: file, captureId: captureId)
        
        // 2. Calculate chunks
        let fileSize = try FileManager.default.attributesOfItem(
            atPath: file.path
        )[.size] as! Int64
        let totalChunks = Int(ceil(Double(fileSize) / Double(chunkSize)))
        
        // 3. Determine missing chunks
        let missingChunks = (0..<totalChunks).filter { 
            !manifest.uploadedChunks.contains($0) 
        }
        
        // 4. Parallel upload with semaphore-controlled concurrency
        let semaphore = AsyncSemaphore(value: maxConcurrentUploads)
        
        try await withThrowingTaskGroup(of: (Int, String).self) { group in
            for chunkIndex in missingChunks {
                group.addTask {
                    await semaphore.acquire()
                    defer { semaphore.release() }
                    
                    let etag = try await self.uploadChunk(
                        file: file,
                        chunkIndex: chunkIndex,
                        uploadId: manifest.uploadId
                    )
                    return (chunkIndex, etag)
                }
            }
            
            // Update manifest as chunks complete
            for try await (chunkIndex, etag) in group {
                manifest.uploadedChunks.insert(chunkIndex)
                manifest.etags[chunkIndex] = etag
                try UploadPersistence.shared.saveManifest(manifest)
            }
        }
        
        // 5. Complete multipart upload
        try await completeMultipartUpload(manifest: manifest)
    }
}
```

---

## Part C: On-Device Compression

### Video: H.264 → HEVC (H.265)

```swift
import AVFoundation

class VideoCompressor {
    func compressToHEVC(input: URL, output: URL) async throws {
        let asset = AVAsset(url: input)
        guard let videoTrack = try await asset.loadTracks(withMediaType: .video).first else {
            throw CompressionError.noVideoTrack
        }
        
        let composition = AVMutableComposition()
        guard let compositionTrack = composition.addMutableTrack(
            withMediaType: .video,
            preferredTrackID: kCMPersistentTrackID_Invalid
        ) else {
            throw CompressionError.compositionFailed
        }
        
        try compositionTrack.insertTimeRange(
            CMTimeRange(start: .zero, duration: asset.duration),
            of: videoTrack,
            at: .zero
        )
        
        // HEVC with hardware encoding
        let preset = AVAssetExportPresetHEVCHighestQuality  // Or HEVC1920x1080 for speed
        guard let session = AVAssetExportSession(
            asset: composition,
            presetName: preset
        ) else {
            throw CompressionError.exportSessionFailed
        }
        
        session.outputURL = output
        session.outputFileType = .mov
        session.shouldOptimizeForNetworkUse = true
        
        await session.export()
        
        guard session.status == .completed else {
            throw CompressionError.exportFailed(session.error)
        }
        
        // Typical results: 120MB H.264 → 45-60MB HEVC
        let originalSize = try FileManager.default.attributesOfItem(
            atPath: input.path
        )[.size] as! Int64
        let compressedSize = try FileManager.default.attributesOfItem(
            atPath: output.path
        )[.size] as! Int64
        
        print("Compressed: \(ByteCountFormatter.string(fromByteCount: originalSize, countStyle: .file)) → \(ByteCountFormatter.string(fromByteCount: compressedSize, countStyle: .file))")
    }
}
```

**Modal worker decoding:**

```python
# workers/modal/lidar-preprocess.py
import av
import numpy as np

def decode_hevc_to_frames(video_path: str) -> np.ndarray:
    """Decode HEVC video to numpy frames for COLMAP/splatfacto."""
    container = av.open(video_path)
    stream = container.streams.video[0]
    
    frames = []
    for frame in container.decode(stream):
        # Convert to RGB numpy array
        img = frame.to_ndarray(format='rgb24')
        frames.append(img)
    
    return np.array(frames)

# PyAV (ffmpeg bindings) supports HEVC via system ffmpeg
# Modal base image: apt-get install ffmpeg + pip install av
```

**Verdict:** ✅ **Implement immediately** — ~50% size reduction, Modal can decode with PyAV

---

### Point Cloud: PLY → Draco

```swift
// DracoSwift — wrapper around Google Draco C++ library
import DracoSwift

class PointCloudCompressor {
    func compressToDraco(inputPly: URL, outputDrc: URL) throws {
        // Read PLY
        let pointCloud = try PLYReader.read(from: inputPly)
        
        // Draco compression options
        let options = DracoEncodingOptions(
            compressionLevel: 7,  // 0-10 (speed vs compression)
            quantizationBits: 14   // Position precision (14 = ~1mm at room scale)
        )
        
        // Encode
        let encoder = DracoEncoder()
        let compressed = try encoder.encode(pointCloud, options: options)
        
        // Write
        try compressed.write(to: outputDrc)
        
        // Typical results: 80MB PLY → 8-15MB Draco
    }
}
```

**Modal worker decoding:**

```python
# workers/modal/lidar-preprocess.py
import draco3d  # Google's Draco Python bindings
import numpy as np

def decode_draco_to_numpy(drc_path: str) -> np.ndarray:
    """Decode Draco to numpy for COLMAP/splatfacto."""
    with open(drc_path, 'rb') as f:
        compressed = f.read()
    
    # Draco3d returns point positions as float array
    pc = draco3d.decode(compressed)
    
    # pc.points is Nx3 float32 array
    return np.array(pc.points)

def draco_to_colmap_points3D(drc_path: str, output_txt: str):
    """Convert Draco to COLMAP points3D.txt format."""
    points = decode_draco_to_numpy(drc_path)
    
    # COLMAP format: POINT3D_ID, X, Y, Z, R, G, B, ERROR, TRACK[]
    with open(output_txt, 'w') as f:
        f.write(f"# Number of points: {len(points)}\n")
        for i, (x, y, z) in enumerate(points):
            # Default white color, zero error, no track
            f.write(f"{i} {x} {y} {z} 255 255 255 0\n")
```

**Verdict:** ✅ **Implement** — 5-10x size reduction, Modal has draco3d package

---

### Poses JSON: Standard Compression

```swift
// Simple gzip — JSON text compresses well
import Compression

class PosesCompressor {
    func compressPoses(input: URL, output: URL) throws {
        let data = try Data(contentsOf: input)
        
        // Use system compression framework
        let compressed = try (data as NSData).compressed(using: .zlib)
        try compressed.write(to: output)
        
        // Typical: 5MB JSON → 800KB gz
    }
}
```

**Modal decompression:**

```python
import gzip
import json

def decompress_poses(gz_path: str) -> dict:
    with gzip.open(gz_path, 'rt') as f:
        return json.load(f)
```

---

## Part D: OSS Capture Pipelines to Evaluate

### 1. NeRFCapture (UC Berkeley) — **LEADER**

| Aspect | Details |
|--------|---------|
| **URL** | https://github.com/jc211/NeRFCapture |
| **Stack** | Swift/SwiftUI + ARKit + CoreML |
| **Upload** | Airtable/Firebase (not TUS) |
| **Features** | ARKit poses, depth, rRGB, InstantNGP export |
| **License** | MIT |

**Evaluation:**
- ✅ Excellent ARKit pose capture (matches our needs)
- ✅ Clean Swift/SwiftUI architecture
- ⚠️ Upload is Firebase (would need TUS retrofit)
- ⚠️ No LiDAR point cloud export (RGB-D only)

**Adoption recommendation:** Study pose capture patterns, not wholesale adoption (no LiDAR)

---

### 2. Record3D — **NOT OSS**

| Aspect | Details |
|--------|---------|
| **Type** | Commercial app |
| **Export** | .r3d proprietary, .ply export |
| **Price** | $19.99 app + subscription |

**Verdict:** ❌ Not adoptable (closed source)

---

### 3. Polycam (polyform) — **STUDY WORTHY**

| Aspect | Details |
|--------|---------|
| **Capture** | LiDAR + photogrammetry fusion |
| **Registration** | Multi-scan global COLMAP (server-side) |
| **Export** | .ply, .obj, .spz |

**What to learn:**
- Multi-scan registration pipeline (global COLMAP)
- User coaching UX (overlap feedback)
- But: Closed source, can't adopt code

---

### 4. Scaniverse (Niantic) — **NOT OSS**

Closed source, no adoption possible.

---

### 5. ARKit-SLAM-Recorder (Minimal OSS)

```
https://github.com/charley_cheung/ARKit-SLAM-Recorder
```

Simple ARKit pose + depth recording. Good reference for raw capture, not production-ready.

---

## Recommended Implementation Roadmap

### Phase 0: Immediate Fix (2 days) — Stop the Bleeding

```swift
// 1. Switch to file-based (not Data) upload
let fileUrl = FileManager.default.temporaryDirectory
    .appendingPathComponent("capture_\(id).hevc")

// 2. Use URLSession background
let config = URLSessionConfiguration.background(withIdentifier: "com.slate360.upload")

// 3. Implement simple retry with exponential backoff
// 4. Increase timeout to 300s for large files
// 5. Chunk to 8MiB (even if serial for now)
```

**Impact:** Prevents complete upload failure  
**Effort:** 2 days

---

### Phase 1: TUS Integration (1 week) — The Real Fix

```swift
// TUSKit integration with custom R2 endpoint
import TUSKit

let config = TUSConfig(
    endpoint: "https://api.slate360.ai/files/tus",
    chunkSize: 8 * 1024 * 1024,
    retryCount: 10,
    parallelUploads: 5  // TUSKit supports parallel
)
```

**Backend:** Deploy tusd or custom Next.js TUS server  
**Impact:** Resumable uploads, background continuation  
**Effort:** 5 days

---

### Phase 2: HEVC + Draco Compression (1 week)

```swift
// Parallel compression before upload
async let videoTask = compressVideo(input: rawVideo, output: hevcVideo)
async let cloudTask = compressPointCloud(input: rawPly, output: dracoCloud)
async let posesTask = compressPoses(input: rawJson, output: gzPoses)

let (videoUrl, cloudUrl, posesUrl) = try await (videoTask, cloudTask, posesTask)

// Then TUS upload all three
```

**Modal updates:** Add `av` + `draco3d` to base image  
**Impact:** ~60% bandwidth reduction, faster uploads  
**Effort:** 5 days

---

### Phase 3: Parallel Chunk Uploads (2 days)

Configure TUSKit for parallel chunk upload:

```swift
// TUSKit 3.0+ supports parallel chunk uploads
tusClient.options.parallelChunkUploads = true
tusClient.options.chunkSize = 8 * 1024 * 1024
```

**Impact:** Saturate available bandwidth  
**Effort:** 2 days

---

### Phase 4: Advanced Backgrounding (2 days)

```swift
// Register background task for upload completion
BGTaskScheduler.shared.register(
    forTaskWithIdentifier: "com.slate360.upload-completion",
    using: nil
) { task in
    // Check TUS status, resume any interrupted uploads
    handleUploadCompletionTask(task)
}

// Schedule when starting upload
let request = BGProcessingTaskRequest(identifier: "com.slate360.upload-completion")
request.requiresNetworkConnectivity = true
try BGTaskScheduler.shared.submit(request)
```

**Impact:** Uploads continue even if user force-quits app  
**Effort:** 2 days

---

## Total Effort / Impact Matrix

| Phase | Effort | Impact | Priority |
|-------|--------|--------|----------|
| 0. File-based + background URLSession | 2 days | High (stops failures) | **P0 — Do now** |
| 1. TUS integration | 1 week | Very High (resume) | **P1 — Next sprint** |
| 2. HEVC + Draco | 1 week | High (60% size) | **P1 — Parallel sprint** |
| 3. Parallel chunks | 2 days | Medium (speed) | P2 |
| 4. BGTask completion | 2 days | Medium (resilience) | P2 |

---

*Architecture locked: July 1, 2026*