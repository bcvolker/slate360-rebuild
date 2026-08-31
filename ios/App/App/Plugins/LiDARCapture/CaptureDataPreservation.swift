import Foundation
import simd

enum CaptureReconstructionQuality: String {
    case normal
    case high

    static func parse(_ value: String?) -> CaptureReconstructionQuality {
        value == "high" ? .high : .normal
    }

    /// Metres the device must move before a new packed depth keyframe.
    var translationMeters: Float {
        switch self {
        case .normal: return 0.08
        case .high: return 0.04
        }
    }

    /// Radians the view direction must turn (~8° normal, ~4° high).
    var rotationRadians: Float {
        switch self {
        case .normal: return 0.14
        case .high: return 0.07
        }
    }
}

enum CapturePreviewCloud {
    static let filename = "preview_point_cloud.ply"
    static let role = "preview"
    static let voxelSizeMeters: Float = 0.02
    static let defaultMaxPoints = 500_000

    /// Display-budget insert. Never evicts existing voxels (no hash-order prefix trim).
    static func canInsertNewVoxel(currentCount: Int, maxPoints: Int) -> Bool {
        currentCount < maxPoints
    }
}

enum CaptureSourceRoles {
    static let trajectoryMaster = "trajectory_master"
    static let depthKeyframeMaster = "depth_keyframe_master"
    static let rgbVideoMaster = "rgb_video_master"
    static let pointCloudPreview = "point_cloud_preview"
    static let manifestFilename = "capture_manifest.json"
}

final class CaptureTelemetry {
    private let lock = NSLock()
    private(set) var arFramesReceived = 0
    private(set) var videoFramesWritten = 0
    private(set) var videoFramesDropped = 0
    private(set) var depthBacklogDrops = 0
    private(set) var voxelUpdatesSkipped = 0
    private(set) var trackingLimitedFrames = 0
    var trajectoryPosesWritten = 0
    var trajectoryWriteFailures = 0
    var depthKeyframesWritten = 0
    var previewPoints = 0
    var depthWidth = 0
    var depthHeight = 0

    func reset() {
        lock.lock()
        arFramesReceived = 0
        videoFramesWritten = 0
        videoFramesDropped = 0
        depthBacklogDrops = 0
        voxelUpdatesSkipped = 0
        trackingLimitedFrames = 0
        lock.unlock()
        trajectoryPosesWritten = 0
        trajectoryWriteFailures = 0
        depthKeyframesWritten = 0
        previewPoints = 0
        depthWidth = 0
        depthHeight = 0
    }

    func addArFrame(trackingLimited: Bool) {
        lock.lock()
        arFramesReceived += 1
        if trackingLimited { trackingLimitedFrames += 1 }
        lock.unlock()
    }

    func addVideoWritten() {
        lock.lock(); videoFramesWritten += 1; lock.unlock()
    }

    func addVideoDropped() {
        lock.lock(); videoFramesDropped += 1; lock.unlock()
    }

    func addDepthBacklogDrop() {
        lock.lock(); depthBacklogDrops += 1; lock.unlock()
    }

    func addVoxelSkips(_ count: Int) {
        guard count > 0 else { return }
        lock.lock(); voxelUpdatesSkipped += count; lock.unlock()
    }

    func snapshot() -> [String: Any] {
        lock.lock()
        let copy: [String: Any] = [
            "arFramesReceived": arFramesReceived,
            "trajectoryPosesWritten": trajectoryPosesWritten,
            "videoFramesWritten": videoFramesWritten,
            "videoFramesDropped": videoFramesDropped,
            "depthKeyframesWritten": depthKeyframesWritten,
            "depthBacklogDrops": depthBacklogDrops,
            "voxelUpdatesSkipped": voxelUpdatesSkipped,
            "previewPoints": previewPoints,
            "trackingLimitedFrames": trackingLimitedFrames,
            "trajectoryWriteFailures": trajectoryWriteFailures,
        ]
        lock.unlock()
        return copy
    }

    func qaSummary(durationSec: Double) -> String {
        let snap = snapshot()
        let mins = Int(durationSec) / 60
        let secs = Int(durationSec.rounded()) % 60
        return [
            "QA \(mins)m\(String(format: "%02d", secs))s",
            "\(snap["trajectoryPosesWritten"] ?? 0) traj",
            "\(snap["depthKeyframesWritten"] ?? 0) depth kf",
            "\(snap["videoFramesWritten"] ?? 0) video (\(snap["videoFramesDropped"] ?? 0) dropped)",
            "preview \(snap["previewPoints"] ?? 0)",
            "\(snap["depthBacklogDrops"] ?? 0) backlog drops",
            "\(snap["voxelUpdatesSkipped"] ?? 0) voxels skipped",
            "\(snap["trackingLimitedFrames"] ?? 0) tracking-limited",
        ].joined(separator: " · ")
    }
}

enum CaptureSourceManifestBuilder {
    static let trajectoryTargetHz = 60
    static let videoTargetHz = 30
    static let keyframeMinInterval: TimeInterval = 0.1
    static let keyframeMaxInterval: TimeInterval = 2.0

    static func flatten(_ transform: simd_float4x4) -> [Float] {
        let cols = [transform.columns.0, transform.columns.1, transform.columns.2, transform.columns.3]
        return cols.flatMap { [$0.x, $0.y, $0.z, $0.w] }
    }

    static func build(
        quality: CaptureReconstructionQuality,
        durationSec: Double,
        videoFilenames: [String],
        telemetry: CaptureTelemetry
    ) -> [String: Any] {
        let snap = telemetry.snapshot()
        let videoName: Any = videoFilenames.count == 1 ? (videoFilenames.first ?? "") : videoFilenames
        let qa = telemetry.qaSummary(durationSec: durationSec)
        return [
            "version": 1,
            "reconstruction_quality": quality.rawValue,
            "duration_sec": durationSec,
            "qa_summary": qa,
            "telemetry": snap,
            "roles": [
                CaptureSourceRoles.trajectoryMaster: [
                    "role": CaptureSourceRoles.trajectoryMaster,
                    "filename": CaptureTrajectoryWriter.filename,
                    "count": snap["trajectoryPosesWritten"] ?? 0,
                    "frame_rate_hz": trajectoryTargetHz,
                    "dropped": snap["trajectoryWriteFailures"] ?? 0,
                    "duration_sec": durationSec,
                    "is_sensor_master": true,
                ],
                CaptureSourceRoles.depthKeyframeMaster: [
                    "role": CaptureSourceRoles.depthKeyframeMaster,
                    "filename": "lidar_depth.s360depth",
                    "count": snap["depthKeyframesWritten"] ?? 0,
                    "keyframe_translation_m": Double(quality.translationMeters),
                    "keyframe_rotation_rad": Double(quality.rotationRadians),
                    "keyframe_min_interval_sec": keyframeMinInterval,
                    "keyframe_max_interval_sec": keyframeMaxInterval,
                    "depth_width": telemetry.depthWidth,
                    "depth_height": telemetry.depthHeight,
                    "duration_sec": durationSec,
                    "is_sensor_master": true,
                ],
                CaptureSourceRoles.rgbVideoMaster: [
                    "role": CaptureSourceRoles.rgbVideoMaster,
                    "filename": videoName,
                    "count": snap["videoFramesWritten"] ?? 0,
                    "frame_rate_hz": videoTargetHz,
                    "dropped": snap["videoFramesDropped"] ?? 0,
                    "duration_sec": durationSec,
                    "is_sensor_master": true,
                ],
                CaptureSourceRoles.pointCloudPreview: [
                    "role": CaptureSourceRoles.pointCloudPreview,
                    "filename": CapturePreviewCloud.filename,
                    "count": snap["previewPoints"] ?? 0,
                    "maxPoints": CapturePreviewCloud.defaultMaxPoints,
                    "voxel_size_m": Double(CapturePreviewCloud.voxelSizeMeters),
                    "is_sensor_master": false,
                ],
            ],
        ]
    }
}

enum ARCameraTrackingLabel: String {
    case normal
    case limited
    case notAvailable
}
