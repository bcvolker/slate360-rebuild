import UIKit
import SwiftUI
import ARKit
import SceneKit
import AVFoundation
import CoreLocation
import simd

// MARK: - Options / result

struct TwinCaptureOptions {
    var confidence: ARConfidenceLevel = .medium
    var maxDurationSec: Double = 240      // 4 min field default (web may raise toward an 8 min ceiling)
    var maxPoints: Int = 500_000

    static func from(confidence: String?, maxDurationSec: Double?, maxPoints: Int?) -> TwinCaptureOptions {
        var o = TwinCaptureOptions()
        switch confidence ?? "medium" {
        case "low": o.confidence = .low
        case "high": o.confidence = .high
        default: o.confidence = .medium
        }
        if let d = maxDurationSec, d > 0 { o.maxDurationSec = d }
        if let p = maxPoints, p > 0 { o.maxPoints = p }
        return o
    }
}

private struct PointData {
    var position: SIMD3<Float>
    var color: SIMD3<UInt8>
}

// MARK: - View controller
//
// Native-led Twin capture: one ARSession owns the rear camera and produces BOTH the H.264 video
// (from ARFrame.capturedImage via AVAssetWriter) AND the LiDAR depth point cloud + camera poses.
// Returns a manifest of file:// URIs; the web layer ingests them into the existing upload pipeline.
// See docs/design/LIDAR_NATIVE_CAPTURE_BUILD_PLAN.md.

final class TwinARKitCaptureViewController: UIViewController, ARSessionDelegate, CLLocationManagerDelegate {

    // Callbacks wired by the plugin.
    var onProgress: (([String: Any]) -> Void)?
    var onFinish: (([String: Any]) -> Void)?
    var onCancel: (() -> Void)?
    var onFatalError: ((String) -> Void)?

    private let options: TwinCaptureOptions

    // AR
    private let sceneView = ARSCNView()
    private let arSession = ARSession()

    // Recording state
    private enum State { case checking, ready, recording, finishing, failed }
    private var state: State = .checking
    private var isRecording = false
    private var didExport = false   // ensures the save resolves exactly once (finish vs watchdog)
    private var sessionId = UUID().uuidString

    // Time base
    private var sessionStartArkit: TimeInterval = 0
    private var sessionStartUnix: TimeInterval = 0
    private var hasStartedWriter = false
    private var frameCounter: UInt64 = 0
    private var lastKeyframeArkit: TimeInterval = 0

    // Depth accumulation (ported from LiDARCapturePlugin)
    private var voxelGrid: [SIMD3<Int32>: PointData] = [:]
    private var keyframes: [[String: Any]] = []
    private let voxelSize: Float = 0.02
    private let keyframeInterval: TimeInterval = 0.5

    // Published copies of the collection sizes. These are written ONLY on `depthQueue`
    // (right after the collections mutate) and read by the HUD/progress on other threads.
    // Reading `voxelGrid.count` / `keyframes.count` directly from the main thread while
    // `depthQueue` inserted into them was a data race on a non-thread-safe Swift Dictionary
    // and crashed with EXC_BAD_ACCESS on the main thread (verified from the device crash
    // report). Plain word-sized Ints are safe to read cross-thread (no pointer deref).
    private var pointCount = 0
    private var keyframeCount = 0

    // Video writer
    private var writer: AVAssetWriter?
    private var writerInput: AVAssetWriterInput?
    private var pixelAdaptor: AVAssetWriterInputPixelBufferAdaptor?
    private var videoURL: URL?
    private var droppedVideoFrames: Int = 0
    private var lastVideoPTS: Double = -Double.infinity

    // Conversion (reused, Metal-backed)
    private lazy var ciContext = CIContext(options: [.useSoftwareRenderer: false])

    // Queues
    private let videoQueue = DispatchQueue(label: "ai.slate360.twincap.video", qos: .userInitiated)
    private let depthQueue = DispatchQueue(label: "ai.slate360.twincap.depth", qos: .userInitiated)

    // Location (optional GPS on keyframes)
    private var locationManager: CLLocationManager?
    private var currentLocation: CLLocation?
    private var currentHeading: CLHeading?

    // SwiftUI HUD overlay (sibling above ARSCNView).
    private let hudHost = TwinCaptureHudHost()
    private var torchOn = false
    private var trackingQuality: TwinTrackingQuality = .unavailable
    private var tipWarning = false
    private var tipText = "Move slowly · capture corners · keep device steady"
    private var depthSemanticsActive = false
    private var sessionNeedsResume = false
    private var completedClipCount = 0
    private var progressTimer: Timer?
    private var displayTimer: Timer?

    // Multi-clip: ONE ARSession stays alive across clips, so every clip shares the same
    // world origin — the point cloud and poses concatenate with NO registration step
    // (the locked consensus's single biggest lever). Each clip gets its own video file
    // + wall-clock start so the worker can time-match frames per clip.
    private struct ClipRecord {
        let url: URL
        let filename: String
        let startUnix: Double
        let duration: Double
    }
    private var clipVideos: [ClipRecord] = []
    private var clipStartArkit: TimeInterval = 0
    private var clipStartUnix: Double = 0
    private var hasSessionStart = false
    private var clipClosed = false      // idempotence for finishWriting-vs-watchdog per clip
    // Overlap coaching: on clips 2+, the fraction of freshly scanned voxels that already
    // exist in the grid IS the overlap with prior coverage. Written on depthQueue,
    // read by the guardrail timer (word-sized Bool — safe cross-thread read).
    private var lowOverlapDetected = false

    init(options: TwinCaptureOptions) {
        self.options = options
        super.init(nibName: nil, bundle: nil)
        // .overFullScreen keeps the Capacitor WKWebView in the view hierarchy beneath us.
        // With .fullScreen iOS treats the web view as off-screen and can suspend/reclaim its
        // content process during the long ARKit session; on dismiss the remote-URL reload then
        // surfaces as Capacitor's "Load failed" page. overFullScreen avoids that.
        modalPresentationStyle = .overFullScreen
        isModalInPresentation = true
    }
    required init?(coder: NSCoder) { fatalError("init(coder:) not used") }

    // MARK: Lifecycle

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0x0B/255, green: 0x0F/255, blue: 0x15/255, alpha: 1)
        setupPreview()
        setupHUD()
        setupLocation()
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        startSessionIfPermitted()
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        hudHost.detach()
    }

    override var prefersStatusBarHidden: Bool { true }
    override var supportedInterfaceOrientations: UIInterfaceOrientationMask { .portrait }

    private func setupPreview() {
        sceneView.frame = view.bounds
        sceneView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        sceneView.session = arSession
        sceneView.automaticallyUpdatesLighting = true
        // SwiftUI HUD owns all touch; the ARSCNView is display-only for capture.
        sceneView.isUserInteractionEnabled = false
        view.addSubview(sceneView)
        arSession.delegate = self
    }

    private func startSessionIfPermitted() {
        AVCaptureDevice.requestAccess(for: .video) { [weak self] granted in
            DispatchQueue.main.async {
                guard let self = self else { return }
                guard granted else { self.fail("Camera permission denied"); return }
                self.runARSession()
            }
        }
    }

    private func runARSession() {
        guard ARWorldTrackingConfiguration.isSupported else { fail("AR not supported"); return }
        let config = ARWorldTrackingConfiguration()
        if ARWorldTrackingConfiguration.supportsFrameSemantics(.smoothedSceneDepth) {
            config.frameSemantics = .smoothedSceneDepth
        } else if ARWorldTrackingConfiguration.supportsFrameSemantics(.sceneDepth) {
            config.frameSemantics = .sceneDepth
        } else {
            fail("LiDAR depth not supported on this device"); return
        }
        config.worldAlignment = .gravity
        depthSemanticsActive = true
        arSession.run(config, options: [.resetTracking, .removeExistingAnchors])
        sessionNeedsResume = false
        revealTorchIfAvailable()
        setState(.ready, message: "Ready — tap record")
    }

    // MARK: HUD (SwiftUI overlay — does not touch ARSCNView / writer path)

    private func setupHUD() {
        wireHudActions()
        hudHost.install(in: view, parent: self)
        pushHudState(force: true)
    }

    private func wireHudActions() {
        let model = hudHost.state
        model.actions.onBack = { [weak self] in self?.tapCancel() }
        model.actions.onHome = { [weak self] in self?.tapCancel() }
        model.actions.onToggleChrome = { [weak self] in
            Task { @MainActor in self?.hudHost.state.toggleChrome() }
        }
        model.actions.onClipsToggle = { [weak self] in
            Task { @MainActor in self?.hudHost.state.toggleClipsExpanded() }
        }
        model.actions.onShutter = { [weak self] in self?.tapRecord() }
        model.actions.onTorchToggle = { [weak self] in self?.tapTorch() }
        model.actions.onDone = { [weak self] in self?.tapFinish() }
    }

    /// Coalesced HUD refresh (5 Hz max) — always marshals to the main actor for SwiftUI.
    private func pushHudState(force: Bool = false) {
        let phase = hudPhase
        let elapsedMs = Int(max(0, lastVideoPTS) * 1000)
        let coverage = options.maxDurationSec > 0
            ? min(1, max(0, lastVideoPTS / options.maxDurationSec))
            : 0
        let clips = hudClipCount
        let hasContent = pointCount > 0 || lastVideoPTS >= 1.0
        let finishing = (state == .finishing)
        let capability = TwinHudCapability(
            torchSupported: torchDevice() != nil,
            depthPresent: depthSemanticsActive,
            streamReady: state == .ready || state == .recording,
            needsResume: sessionNeedsResume,
            photosModeEnabled: false,
            // ARKit owns camera exposure under ARWorldTrackingConfiguration.
            // Keep this disabled; do not attempt lockForConfiguration exposure control.
            exposureLockEnabled: false
        )
        let header: String = {
            switch phase {
            case .checking: return "Checking device…"
            case .ready: return "TWIN 360 · LIDAR"
            case .recording: return "● Recording"
            case .finishing: return "Saving…"
            case .failed: return "Failed"
            }
        }()
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            self.hudHost.state.headerLabel = header
            self.hudHost.state.applySnapshot(
                phase: phase,
                isRecording: self.isRecording,
                elapsedMs: elapsedMs,
                torchOn: self.torchOn,
                tracking: self.trackingQuality,
                thermal: TwinThermalLevel.from(ProcessInfo.processInfo.thermalState),
                lidarPointCount: self.pointCount,
                keyframeCount: self.keyframeCount,
                coverageProgress: coverage,
                clipCount: clips,
                hasContent: hasContent,
                finishing: finishing,
                capability: capability,
                tipText: self.tipText,
                tipWarning: self.tipWarning,
                force: force
            )
        }
    }

    private var hudPhase: TwinCapturePhase {
        switch state {
        case .checking: return .checking
        case .ready: return .ready
        case .recording: return .recording
        case .finishing: return .finishing
        case .failed: return .failed
        }
    }

    private var hudClipCount: Int {
        completedClipCount + (isRecording ? 1 : 0)
    }

    // MARK: Torch

    private func torchDevice() -> AVCaptureDevice? {
        // Prefer the device ARKit is actually driving so we lock the AR camera, not a different
        // AVCaptureDevice. `configurableCaptureDeviceForPrimaryCamera` is iOS 16+, so guard it and
        // fall back to the back wide camera on iOS 15.
        if #available(iOS 16.0, *) {
            if let d = ARWorldTrackingConfiguration.configurableCaptureDeviceForPrimaryCamera,
               d.hasTorch {
                return d
            }
        }
        let d = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back)
        return (d?.hasTorch == true) ? d : nil
    }

    /// Idempotent torch re-assert. ARKit periodically resets torchMode to .off (frame-config
    /// changes, interruptions, sceneDepth adjustments under ARWorldTrackingConfiguration), so the
    /// desired state must be RE-ASSERTED — a one-shot toggle silently reverts (the "flashlight
    /// stopped working" bug). Only touches the device when torchMode has drifted → ~free per-frame.
    private func reapplyTorchIfNeeded() {
        guard let device = torchDevice() else { return }
        let target: AVCaptureDevice.TorchMode = torchOn ? .on : .off
        guard device.torchMode != target else { return }
        do {
            try device.lockForConfiguration()
            if torchOn, device.isTorchModeSupported(.on) {
                try device.setTorchModeOn(level: 1.0)
            } else {
                device.torchMode = .off
            }
            device.unlockForConfiguration()
        } catch {
            // ARKit holds the lock this frame — the per-frame re-assert retries next frame.
        }
    }

    private func revealTorchIfAvailable() {
        pushHudState(force: true)
    }

    @objc private func tapTorch() {
        torchOn.toggle()
        reapplyTorchIfNeeded()  // re-assert now; the per-frame re-assert keeps it on if ARKit resets it
        pushHudState(force: true)
    }

    private func turnTorchOff() {
        guard torchOn, let device = torchDevice() else { return }
        torchOn = false
        try? device.lockForConfiguration()
        device.torchMode = .off
        device.unlockForConfiguration()
        pushHudState(force: true)
    }

    private func setState(_ s: State, message: String?) {
        state = s
        if let m = message { tipText = m }
        if s != .recording && s != .finishing { tipWarning = false }
        pushHudState(force: true)
        emitProgress()
    }

    // MARK: Buttons

    @objc private func tapRecord() {
        // Shutter = start / end a CLIP. The ARSession keeps running between clips so
        // the next clip shares the same world origin. Done exports everything.
        if isRecording { endClip(andExport: false) } else { startRecording() }
    }

    @objc private func tapCancel() {
        teardown()
        cleanupTempFiles()
        onCancel?()
    }

    @objc private func tapFinish() {
        if isRecording {
            endClip(andExport: true)
        } else if !clipVideos.isEmpty || pointCount > 0 {
            exportAndResolve()
        }
    }

    // MARK: Recording control

    private func startRecording() {
        guard state == .ready else { return }
        // Field preflight: storage headroom (~1.5 GB) + battery.
        UIDevice.current.isBatteryMonitoringEnabled = true
        if let free = freeDiskBytes(), free < 1_500_000_000 {
            fail("Not enough free storage — free up space (about 1.5 GB) and try again")
            return
        }
        let battery = UIDevice.current.batteryLevel
        let charging = UIDevice.current.batteryState == .charging || UIDevice.current.batteryState == .full
        if battery >= 0, battery < 0.15, !charging {
            fail("Battery too low to record — charge above 15% or plug in")
            return
        }
        hasStartedWriter = false
        didExport = false
        clipClosed = false
        lowOverlapDetected = false
        droppedVideoFrames = 0
        lastVideoPTS = -Double.infinity
        lastKeyframeArkit = 0
        sessionNeedsResume = false
        tipWarning = false
        if clipVideos.isEmpty {
            pointCount = 0
            keyframeCount = 0
            // Reset the point cloud ON depthQueue — the only queue allowed to touch these
            // collections. Enqueued before isRecording flips true, so (FIFO) it runs before
            // any frame's insert block. Clearing them on the main thread previously raced
            // the depth writes.
            depthQueue.async { [weak self] in
                self?.voxelGrid.removeAll(keepingCapacity: true)
                self?.keyframes.removeAll(keepingCapacity: true)
            }
        }
        // Clips 2+ KEEP the accumulated cloud/poses — same ARSession, same world origin.
        let msg = clipVideos.isEmpty
            ? "Move slowly · capture corners"
            : "Overlap the last area first, then move on"
        setState(.recording, message: msg)
        startTimers()
        // Flip last: no ARFrame is accumulated until the reset above is queued.
        isRecording = true
        pushHudState(force: true)
    }

    /// Ends the current clip. `andExport: false` closes the video and returns to ready —
    /// the ARSession keeps running so the next clip shares this clip's world frame.
    /// `andExport: true` (Done) closes the clip and then exports the whole capture.
    private func endClip(andExport: Bool) {
        guard isRecording else {
            if andExport { exportAndResolve() }
            return
        }
        isRecording = false
        stopTimers()
        let clipDuration = max(0, lastVideoPTS)
        setState(.finishing, message: andExport ? "Saving scan…" : "Saving clip…")

        // Watchdog: a wedged/interrupted AR session can leave AVAssetWriter in a state where
        // finishWriting's completion never fires — which used to strand capture on "Saving…"
        // forever (no upload). Force completion after 12 s. clipWriterDone is idempotent.
        let watchdog = DispatchWorkItem { [weak self] in
            self?.clipWriterDone(duration: clipDuration, andExport: andExport)
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 12, execute: watchdog)

        videoQueue.async { [weak self] in
            guard let self = self else { return }
            self.writerInput?.markAsFinished()
            if self.writer?.status == .writing {
                let durationPts = CMTime(seconds: clipDuration, preferredTimescale: 600)
                self.writer?.endSession(atSourceTime: durationPts)
                self.writer?.finishWriting {
                    watchdog.cancel()
                    self.clipWriterDone(duration: clipDuration, andExport: andExport)
                }
            } else {
                // Writer already failed/interrupted — keep the LiDAR data we have.
                watchdog.cancel()
                self.clipWriterDone(duration: clipDuration, andExport: andExport)
            }
        }
    }

    /// Records the finished clip and either returns to ready (next clip) or exports.
    /// Idempotent per clip — finishWriting's completion and the watchdog can both land.
    private func clipWriterDone(duration: Double, andExport: Bool) {
        DispatchQueue.main.async { [weak self] in
            guard let self = self, !self.clipClosed else { return }
            self.clipClosed = true
            if duration > 0, let url = self.videoURL {
                self.clipVideos.append(ClipRecord(
                    url: url,
                    filename: "twin_capture_clip\(self.clipVideos.count + 1).mp4",
                    startUnix: self.clipStartUnix,
                    duration: duration
                ))
            } else if let url = self.videoURL {
                // Zero-length clip (no frames landed) — drop the empty file.
                try? FileManager.default.removeItem(at: url)
            }
            self.completedClipCount = self.clipVideos.count
            self.writer = nil
            self.writerInput = nil
            self.pixelAdaptor = nil
            self.videoURL = nil
            if andExport {
                self.exportAndResolve()
            } else {
                self.setState(.ready, message: "Clip \(self.completedClipCount) saved — record the next area or tap Done")
            }
        }
    }

    private func exportAndResolve() {
        // Idempotent — finishWriting's completion handler and the watchdog can both call
        // this. The main-thread gate guarantees the save resolves (and the upload starts)
        // exactly once, so capture never strands on "Saving…".
        DispatchQueue.main.async { [weak self] in
            guard let self = self, !self.didExport else { return }
            self.didExport = true
            // Snapshot on main — clipVideos is main-thread-owned.
            let clips = self.clipVideos
            self.depthQueue.async { [weak self] in
                guard let self = self else { return }
                let sid = self.sessionId
            let tmp = URL(fileURLWithPath: NSTemporaryDirectory())
            let plyURL = tmp.appendingPathComponent("\(sid).ply")
            let posesURL = tmp.appendingPathComponent("\(sid)_poses.json")
            self.writePLY(to: plyURL)
            self.writePosesJSON(to: posesURL, clips: clips)

            let totalDuration = clips.reduce(0.0) { $0 + $1.duration }
            let manifest: [String: Any] = [
                "cancelled": false,
                // One video per clip; all clips share the session's world origin.
                "videoUris": clips.map { [
                    "uri": $0.url.absoluteString,
                    "filename": $0.filename,
                ] },
                "plyUri": plyURL.absoluteString,
                "posesUri": posesURL.absoluteString,
                "pointCount": self.voxelGrid.count,
                "keyframeCount": self.keyframes.count,
                "clipCount": clips.count,
                "durationSec": totalDuration,
                "sessionStartUnix": self.sessionStartUnix,
                "width": self.encWidth,
                "height": self.encHeight,
            ]
            // Free the point cloud on THIS queue (the only queue allowed to touch the
            // collections). The data is already on disk. Doing this on the main thread
            // previously raced the depth writes — never touch these off depthQueue.
            self.voxelGrid.removeAll(keepingCapacity: false)
            self.keyframes.removeAll(keepingCapacity: false)
            DispatchQueue.main.async {
                self.teardownSessionOnly()
                self.onFinish?(manifest)
            }
            }
        }
    }

    // MARK: ARSessionDelegate

    private var encWidth = 0
    private var encHeight = 0

    func session(_ session: ARSession, didUpdate frame: ARFrame) {
        reapplyTorchIfNeeded()  // ARKit resets the torch — re-assert desired state every frame
        guard isRecording else { return }

        let arkitTs = frame.timestamp
        if !hasStartedWriter {
            beginWriter(with: frame)
        }
        // Per-CLIP timeline: video PTS and the duration cap restart with each clip.
        let rel = arkitTs - clipStartArkit

        // Enforce max duration per clip — close the clip, stay in capture for the next one.
        if rel >= options.maxDurationSec {
            DispatchQueue.main.async { [weak self] in self?.endClip(andExport: false) }
            return
        }

        // ── Video: keep ~30 fps (every 2nd ARKit frame) ──
        frameCounter &+= 1
        if frameCounter % 2 == 0, rel - lastVideoPTS >= (1.0 / 31.0) {
            lastVideoPTS = rel
            // Convert YCbCr → BGRA synchronously (Metal-backed) into an owned buffer, then append async.
            if let bgra = convertToBGRA(frame.capturedImage) {
                let pts = CMTime(seconds: rel, preferredTimescale: 600)
                videoQueue.async { [weak self] in self?.appendVideo(bgra, pts: pts) }
            }
        }

        // ── Depth voxel accumulation (ported) ──
        let depthAnchor = frame.smoothedSceneDepth ?? frame.sceneDepth
        guard let depthMap = depthAnchor?.depthMap, let confMap = depthAnchor?.confidenceMap else { return }
        let transform = frame.camera.transform
        let intrinsics = frame.camera.intrinsics
        let width = CVPixelBufferGetWidth(depthMap)
        let height = CVPixelBufferGetHeight(depthMap)
        // ARKit intrinsics are expressed in the full RGB image resolution
        // (frame.camera.imageResolution, ~1920x1440). The LiDAR depthMap is only
        // ~256x192, so the intrinsics MUST be scaled to the depth resolution before
        // unprojecting — otherwise cx/cy (~960/720) dwarf the 256x192 pixel coords
        // and the whole point cloud is skewed. (Flagged by multi-AI review.)
        let imageRes = frame.camera.imageResolution
        let sx = Float(width) / Float(imageRes.width)
        let sy = Float(height) / Float(imageRes.height)
        let fx = intrinsics[0][0] * sx, fy = intrinsics[1][1] * sy
        let cx = intrinsics[2][0] * sx, cy = intrinsics[2][1] * sy

        CVPixelBufferLockBaseAddress(depthMap, .readOnly)
        CVPixelBufferLockBaseAddress(confMap, .readOnly)
        defer {
            CVPixelBufferUnlockBaseAddress(depthMap, .readOnly)
            CVPixelBufferUnlockBaseAddress(confMap, .readOnly)
        }
        guard let depthPtr = CVPixelBufferGetBaseAddress(depthMap),
              let confPtr = CVPixelBufferGetBaseAddress(confMap) else { return }
        let depthBuf = depthPtr.assumingMemoryBound(to: Float32.self)
        let confBuf = confPtr.assumingMemoryBound(to: UInt8.self)

        var newVoxels = [(key: SIMD3<Int32>, data: PointData)]()
        let step = 3
        let minConf = options.confidence.rawValue
        for row in stride(from: 0, to: height, by: step) {
            for col in stride(from: 0, to: width, by: step) {
                let idx = row * width + col
                let conf = Int(confBuf[idx])
                guard conf >= minConf else { continue }
                let depth = depthBuf[idx]
                guard depth > 0.1, depth < 8.0 else { continue }
                let xc = (Float(col) - cx) * depth / fx
                let yc = (Float(row) - cy) * depth / fy
                let zc = -depth
                let world = transform * SIMD4<Float>(xc, yc, zc, 1.0)
                let pos = SIMD3<Float>(world.x, world.y, world.z)
                let vk = SIMD3<Int32>(
                    Int32(floor(pos.x / voxelSize)),
                    Int32(floor(pos.y / voxelSize)),
                    Int32(floor(pos.z / voxelSize))
                )
                // Grey placeholder for V1; real RGB is a Week-2 hardening item.
                newVoxels.append((key: vk, data: PointData(position: pos, color: SIMD3<UInt8>(180, 180, 180))))
            }
        }

        let recordKeyframe = arkitTs - lastKeyframeArkit >= keyframeInterval
        // lastKeyframeArkit is read AND written only here, on the ARKit delegate thread
        // (which delivers frames serially) — so it never races depthQueue. Previously it
        // was written inside the depthQueue block, racing this read.
        if recordKeyframe { lastKeyframeArkit = arkitTs }
        let keyframeData: [String: Any]? = recordKeyframe
            ? buildKeyframe(arkitTs: arkitTs, transform: transform, intrinsics: intrinsics,
                            resolution: frame.camera.imageResolution)
            : nil

        // completedClipCount is a word-sized Int maintained on main (like pointCount) —
        // safe to read here; clipVideos itself is main-thread-only.
        let clipIndex = completedClipCount
        let clipRel = rel
        depthQueue.async { [weak self] in
            guard let self = self else { return }
            var inserted = 0
            for (key, data) in newVoxels where self.voxelGrid[key] == nil {
                self.voxelGrid[key] = data
                inserted += 1
            }
            // Overlap coaching (clips 2+, first 6 s): the share of scanned voxels that
            // already exist in the grid IS the overlap with previous clips. Below ~15%
            // the new clip risks poor alignment context in the reconstruction.
            if clipIndex > 0, clipRel < 6.0, newVoxels.count > 50 {
                let dupRatio = Double(newVoxels.count - inserted) / Double(newVoxels.count)
                self.lowOverlapDetected = dupRatio < 0.15
            } else {
                self.lowOverlapDetected = false
            }
            if self.voxelGrid.count > self.options.maxPoints {
                let excess = self.voxelGrid.count - self.options.maxPoints
                for k in self.voxelGrid.keys.prefix(excess) { self.voxelGrid.removeValue(forKey: k) }
            }
            if let kf = keyframeData {
                self.keyframes.append(kf)
            }
            // Publish sizes for the HUD/progress so those off-queue readers never touch the
            // collections directly (the EXC_BAD_ACCESS data race).
            self.pointCount = self.voxelGrid.count
            self.keyframeCount = self.keyframes.count
        }
        // Per-frame drive; TwinHudStateModel coalesces to avoid main-thread jank.
        pushHudState()
    }

    func session(_ session: ARSession, didFailWithError error: Error) {
        fail("AR session failed: \(error.localizedDescription)")
    }

    func sessionWasInterrupted(_ session: ARSession) {
        sessionNeedsResume = true
        // Close the in-flight clip but STAY in capture — when the interruption ends
        // ARKit relocalizes into the same world map and the next clip stays aligned.
        if isRecording { DispatchQueue.main.async { [weak self] in self?.endClip(andExport: false) } }
        setState(state, message: "Capture interrupted — clip saved")
    }

    func sessionInterruptionEnded(_ session: ARSession) {
        sessionNeedsResume = false
        reapplyTorchIfNeeded()  // ARKit resets torch across interruptions — restore desired state
        pushHudState(force: true)
    }

    func session(_ session: ARSession, cameraDidChangeTrackingState camera: ARCamera) {
        trackingQuality = TwinTrackingQuality.from(camera.trackingState)
        // `==` on ARCamera.TrackingState needs iOS 16 Equatable (hard error in Swift 6). Pattern
        // match instead — works on all deployment targets.
        if case .normal = camera.trackingState { sessionNeedsResume = false }
        if isRecording {
            switch camera.trackingState {
            case .normal: tipText = "Tracking good"; tipWarning = false
            case .limited: tipText = "Move slowly · point at textured surfaces"; tipWarning = true
            case .notAvailable: tipText = "Acquiring tracking…"; tipWarning = true
            }
        }
        pushHudState()
    }

    // MARK: Writer

    private func beginWriter(with frame: ARFrame) {
        // Session time base is set ONCE (first clip); each clip gets its own start on
        // the shared timeline so pose timestamps stay global while video PTS restarts.
        if !hasSessionStart {
            sessionStartArkit = frame.timestamp
            sessionStartUnix = Date().timeIntervalSince1970
            hasSessionStart = true
        }
        clipStartArkit = frame.timestamp
        clipStartUnix = sessionStartUnix + (clipStartArkit - sessionStartArkit)
        let res = frame.camera.imageResolution
        encWidth = Int(res.width)
        encHeight = Int(res.height)

        let sid = sessionId
        let url = URL(fileURLWithPath: NSTemporaryDirectory())
            .appendingPathComponent("\(sid)_clip\(clipVideos.count + 1).mp4")
        try? FileManager.default.removeItem(at: url)
        videoURL = url

        guard let w = try? AVAssetWriter(outputURL: url, fileType: .mp4) else {
            fail("Could not create video writer"); return
        }
        // Explicit per-CLIP creation_time so the Modal worker's ffprobe fallback resolves
        // this clip's start (the poses JSON "clips" array is the primary source).
        let dateItem = AVMutableMetadataItem()
        dateItem.keySpace = .common
        dateItem.key = AVMetadataKey.commonKeyCreationDate as NSString
        dateItem.value = ISO8601DateFormatter().string(from: Date(timeIntervalSince1970: clipStartUnix)) as NSString
        w.metadata = [dateItem]

        // HEVC (H.265) at ~5.5 Mbps ≈ H.264 @ 8 Mbps quality for ~half the bytes — the single
        // biggest upload-payload win (a 2-min clip's video drops ~120MB → ~65MB). Every
        // LiDAR-capable device (iPhone 12 Pro+/iPad Pro) hardware-encodes HEVC, and the Modal
        // worker extracts frames via ffmpeg, which decodes HEVC natively — no pipeline change.
        let settings: [String: Any] = [
            AVVideoCodecKey: AVVideoCodecType.hevc,
            AVVideoWidthKey: encWidth,
            AVVideoHeightKey: encHeight,
            AVVideoCompressionPropertiesKey: [
                AVVideoAverageBitRateKey: 5_500_000,
                AVVideoMaxKeyFrameIntervalKey: 30,
            ],
        ]
        let input = AVAssetWriterInput(mediaType: .video, outputSettings: settings)
        input.expectsMediaDataInRealTime = true
        // Encode landscape (native imageResolution) WITHOUT a rotation transform so the extracted
        // frames stay consistent with the ARKit intrinsics/resolution the worker uses.
        let attrs: [String: Any] = [
            kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
            kCVPixelBufferWidthKey as String: encWidth,
            kCVPixelBufferHeightKey as String: encHeight,
        ]
        let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: input, sourcePixelBufferAttributes: attrs)
        guard w.canAdd(input) else { fail("Writer cannot add input"); return }
        w.add(input)
        w.startWriting()
        w.startSession(atSourceTime: .zero)

        writer = w
        writerInput = input
        pixelAdaptor = adaptor
        hasStartedWriter = true
    }

    private func appendVideo(_ buffer: CVPixelBuffer, pts: CMTime) {
        guard let input = writerInput, let adaptor = pixelAdaptor else { return }
        guard input.isReadyForMoreMediaData else { droppedVideoFrames += 1; return }
        adaptor.append(buffer, withPresentationTime: pts)
    }

    /// Converts ARKit's YCbCr camera buffer into a BGRA buffer the writer accepts.
    /// Draws into a buffer recycled from the adaptor's `pixelBufferPool` instead of
    /// allocating a fresh full-res buffer every frame via `CVPixelBufferCreate`. The pool
    /// reuses a small set of IOSurfaces, which removes the per-frame allocation churn that
    /// drives memory fragmentation and thermal throttling — the practical limiter on how
    /// long a capture can run before iOS auto-stops it (.critical thermal). Falls back to a
    /// one-off allocation only if the pool isn't available yet.
    private func convertToBGRA(_ src: CVPixelBuffer) -> CVPixelBuffer? {
        let ci = CIImage(cvPixelBuffer: src)
        var dst: CVPixelBuffer?
        if let pool = pixelAdaptor?.pixelBufferPool {
            CVPixelBufferPoolCreatePixelBuffer(nil, pool, &dst)
        }
        if dst == nil {
            let attrs: [String: Any] = [kCVPixelBufferIOSurfacePropertiesKey as String: [:]]
            CVPixelBufferCreate(nil, CVPixelBufferGetWidth(src), CVPixelBufferGetHeight(src),
                                kCVPixelFormatType_32BGRA, attrs as CFDictionary, &dst)
        }
        guard let target = dst else { return nil }
        ciContext.render(ci, to: target)
        return target
    }

    // MARK: Export helpers (ported)

    private func buildKeyframe(arkitTs: TimeInterval, transform: simd_float4x4,
                               intrinsics: simd_float3x3, resolution: CGSize) -> [String: Any] {
        let cols = [transform.columns.0, transform.columns.1, transform.columns.2, transform.columns.3]
        let flat: [Float] = cols.flatMap { [$0.x, $0.y, $0.z, $0.w] }
        // Unix wall clock derived from the monotonic ARKit clock (NOT Date() in the loop).
        let unix = sessionStartUnix + (arkitTs - sessionStartArkit)
        var kf: [String: Any] = [
            "timestamp": unix,
            "ar_timestamp": arkitTs - sessionStartArkit,
            "transform_4x4": flat,
            "intrinsics": [
                "fx": intrinsics[0][0], "fy": intrinsics[1][1],
                "cx": intrinsics[2][0], "cy": intrinsics[2][1],
            ],
            "gravity": [0.0, 1.0, 0.0],
            "w": Int(resolution.width),
            "h": Int(resolution.height),
            // 1-based clip this keyframe was recorded during (0-based count + 1).
            "clip_index": completedClipCount + 1,
        ]
        if let loc = currentLocation {
            kf["gps"] = [
                "lat": loc.coordinate.latitude,
                "lon": loc.coordinate.longitude,
                "alt": loc.altitude,
                "hAcc": loc.horizontalAccuracy,
                "vAcc": loc.verticalAccuracy,
                "course": loc.course,
            ]
        }
        // Heading + GPS accuracy let the cloud georegister the twin onto 3D map tiles later.
        if let h = currentHeading {
            kf["heading"] = ["true": h.trueHeading, "magnetic": h.magneticHeading, "accuracy": h.headingAccuracy]
        }
        return kf
    }

    private func writePLY(to url: URL) {
        let pts = Array(voxelGrid.values)
        var data = Data()
        data.reserveCapacity(pts.count * 15 + 256)   // 12 B xyz + 3 B rgb/pt — avoids reallocs
        let header = """
        ply\nformat binary_little_endian 1.0\nelement vertex \(pts.count)\nproperty float x\nproperty float y\nproperty float z\nproperty uchar red\nproperty uchar green\nproperty uchar blue\nend_header\n
        """
        data.append(contentsOf: header.utf8)
        for pt in pts {
            var x = pt.position.x, y = pt.position.y, z = pt.position.z
            var r = pt.color.x, g = pt.color.y, b = pt.color.z
            withUnsafeBytes(of: &x) { data.append(contentsOf: $0) }
            withUnsafeBytes(of: &y) { data.append(contentsOf: $0) }
            withUnsafeBytes(of: &z) { data.append(contentsOf: $0) }
            withUnsafeBytes(of: &r) { data.append(contentsOf: $0) }
            withUnsafeBytes(of: &g) { data.append(contentsOf: $0) }
            withUnsafeBytes(of: &b) { data.append(contentsOf: $0) }
        }
        try? data.write(to: url)
    }

    private func writePosesJSON(to url: URL, clips: [ClipRecord]) {
        let payload: [String: Any] = [
            "version": 4,
            "session_start_time": sessionStartUnix,
            "session_start_ar_timestamp": 0.0,
            // Per-clip video mapping: exact wall-clock start for each clip's video so
            // the worker time-matches frames per clip (ffprobe creation_time = fallback).
            "clips": clips.enumerated().map { index, clip in
                [
                    "index": index + 1,
                    "video": clip.filename,
                    "start_time": clip.startUnix,
                    "duration": clip.duration,
                ] as [String: Any]
            },
            "frames": keyframes,
        ]
        if let data = try? JSONSerialization.data(withJSONObject: payload, options: .prettyPrinted) {
            try? data.write(to: url)
        }
    }

    // MARK: Timers / progress

    private func startTimers() {
        progressTimer = Timer.scheduledTimer(withTimeInterval: 0.5, repeats: true) { [weak self] _ in self?.emitProgress() }
        // 4 Hz HUD refresh — never push from session(_:didUpdate:) (ARKit hot path).
        displayTimer = Timer.scheduledTimer(withTimeInterval: 0.25, repeats: true) { [weak self] _ in
            guard let self = self, self.isRecording else { return }
            self.evaluateCaptureGuardrails()
            self.pushHudState()
        }
    }

    private func evaluateCaptureGuardrails() {
        let thermal = ProcessInfo.processInfo.thermalState
        let battery = UIDevice.current.batteryLevel
        let charging = UIDevice.current.batteryState == .charging
            || UIDevice.current.batteryState == .full
        let lowDisk = (freeDiskBytes() ?? .max) < 750_000_000

        if thermal == .critical || lowDisk || (battery >= 0 && battery < 0.10 && !charging) {
            tipWarning = true
            tipText = thermal == .critical
                ? "Device too hot — saving scan"
                : (lowDisk ? "Storage full — saving scan" : "Battery critically low — saving scan")
            endClip(andExport: true)
        } else if thermal == .serious {
            tipWarning = true
            tipText = "Device warming — finish this area soon"
        } else if lowOverlapDetected {
            tipWarning = true
            tipText = "Low overlap — re-scan part of the previous area first"
        } else if battery >= 0 && battery < 0.25 && !charging {
            tipWarning = true
            tipText = "Battery low — finish soon"
        }
    }

    private func stopTimers() {
        progressTimer?.invalidate(); progressTimer = nil
        displayTimer?.invalidate(); displayTimer = nil
    }

    private func emitProgress() {
        // Reads cached counts (not the collections) — emitProgress is called from timers
        // and setState on the main/AR threads, never on depthQueue.
        let payload: [String: Any] = [
            "state": stateString,
            "pointCount": pointCount,
            "keyframeCount": keyframeCount,
            "durationSec": max(0, lastVideoPTS),
        ]
        onProgress?(payload)
    }

    private var stateString: String {
        switch state {
        case .checking: return "checking"
        case .ready: return "ready"
        case .recording: return "recording"
        case .finishing: return "saving"
        case .failed: return "failed"
        }
    }

    // MARK: Location

    private func setupLocation() {
        locationManager = CLLocationManager()
        locationManager?.delegate = self
        locationManager?.desiredAccuracy = kCLLocationAccuracyBest
        locationManager?.requestWhenInUseAuthorization()
        locationManager?.startUpdatingLocation()
        if CLLocationManager.headingAvailable() {
            locationManager?.startUpdatingHeading()
        }
    }
    func locationManager(_ m: CLLocationManager, didUpdateLocations locs: [CLLocation]) { currentLocation = locs.last }
    func locationManager(_ m: CLLocationManager, didUpdateHeading newHeading: CLHeading) { currentHeading = newHeading }
    func locationManager(_ m: CLLocationManager, didFailWithError error: Error) {}

    // MARK: Teardown

    private func freeDiskBytes() -> Int64? {
        let url = URL(fileURLWithPath: NSTemporaryDirectory())
        let vals = try? url.resourceValues(forKeys: [.volumeAvailableCapacityForImportantUsageKey])
        return vals?.volumeAvailableCapacityForImportantUsage
    }

    private func teardownSessionOnly() {
        turnTorchOff()
        arSession.pause()
        locationManager?.stopUpdatingLocation()
        locationManager?.stopUpdatingHeading()
        stopTimers()
    }

    private func teardown() {
        isRecording = false
        teardownSessionOnly()
        writerInput?.markAsFinished()
        writer?.cancelWriting()
    }

    private func cleanupTempFiles() {
        if let v = videoURL { try? FileManager.default.removeItem(at: v) }
        for clip in clipVideos { try? FileManager.default.removeItem(at: clip.url) }
        clipVideos.removeAll()
    }

    private func fail(_ message: String) {
        setState(.failed, message: message)
        teardown()
        cleanupTempFiles()
        onFatalError?(message)
    }

    func stopAndCleanup() {
        teardown()
        cleanupTempFiles()
    }
}
