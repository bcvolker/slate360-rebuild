import UIKit
import ARKit
import SceneKit
import AVFoundation
import CoreLocation
import simd

// MARK: - Options / result

struct TwinCaptureOptions {
    var confidence: ARConfidenceLevel = .medium
    var maxDurationSec: Double = 480      // 8 min
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

    // HUD
    private let statePill = UILabel()
    private let metricsLabel = UILabel()
    private let tipLabel = UILabel()
    private let timerLabel = UILabel()
    private let recordButton = UIButton(type: .system)
    private let finishButton = UIButton(type: .system)
    private let cancelButton = UIButton(type: .system)
    private var progressTimer: Timer?
    private var displayTimer: Timer?

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

    override var prefersStatusBarHidden: Bool { true }
    override var supportedInterfaceOrientations: UIInterfaceOrientationMask { .portrait }

    private func setupPreview() {
        sceneView.frame = view.bounds
        sceneView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        sceneView.session = arSession
        sceneView.automaticallyUpdatesLighting = true
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
        arSession.run(config, options: [.resetTracking, .removeExistingAnchors])
        setState(.ready, message: "Ready — tap record")
    }

    // MARK: HUD

    // Twin 360 brand blue (#3D8EFF) — matches --twin360-blue used across the web UI.
    private let brandBlue = UIColor(red: 0x3D/255, green: 0x8E/255, blue: 0xFF/255, alpha: 1)

    private func setupHUD() {
        func glass(_ v: UIView) {
            v.backgroundColor = UIColor(red: 0x0B/255, green: 0x0F/255, blue: 0x15/255, alpha: 0.78)
            v.layer.cornerRadius = 10
            v.layer.masksToBounds = true
        }
        let safe = view.safeAreaLayoutGuide

        statePill.translatesAutoresizingMaskIntoConstraints = false
        statePill.text = "Checking device…"
        statePill.textColor = brandBlue
        statePill.font = .monospacedSystemFont(ofSize: 12, weight: .semibold)
        statePill.textAlignment = .center
        glass(statePill)
        view.addSubview(statePill)

        timerLabel.translatesAutoresizingMaskIntoConstraints = false
        timerLabel.text = "0:00"
        timerLabel.textColor = .white
        timerLabel.font = .monospacedDigitSystemFont(ofSize: 15, weight: .bold)
        timerLabel.textAlignment = .center
        glass(timerLabel)
        view.addSubview(timerLabel)

        metricsLabel.translatesAutoresizingMaskIntoConstraints = false
        metricsLabel.text = "LIDAR · 0 pts"
        metricsLabel.textColor = brandBlue
        metricsLabel.font = .monospacedSystemFont(ofSize: 12, weight: .semibold)
        metricsLabel.textAlignment = .center
        glass(metricsLabel)
        view.addSubview(metricsLabel)

        tipLabel.translatesAutoresizingMaskIntoConstraints = false
        tipLabel.text = "Move slowly · capture corners · keep device steady"
        tipLabel.textColor = UIColor.white.withAlphaComponent(0.85)
        tipLabel.font = .systemFont(ofSize: 12, weight: .medium)
        tipLabel.textAlignment = .center
        tipLabel.numberOfLines = 2
        view.addSubview(tipLabel)

        cancelButton.translatesAutoresizingMaskIntoConstraints = false
        cancelButton.setTitle("Cancel", for: .normal)
        cancelButton.setTitleColor(.white, for: .normal)
        cancelButton.titleLabel?.font = .systemFont(ofSize: 15, weight: .semibold)
        cancelButton.addTarget(self, action: #selector(tapCancel), for: .touchUpInside)
        view.addSubview(cancelButton)

        recordButton.translatesAutoresizingMaskIntoConstraints = false
        recordButton.setTitle("● REC", for: .normal)
        recordButton.setTitleColor(.white, for: .normal)
        recordButton.backgroundColor = brandBlue
        recordButton.layer.cornerRadius = 14
        recordButton.titleLabel?.font = .systemFont(ofSize: 18, weight: .bold)
        recordButton.setTitleColor(UIColor(red: 0x0B/255, green: 0x0F/255, blue: 0x15/255, alpha: 1), for: .normal)
        recordButton.addTarget(self, action: #selector(tapRecord), for: .touchUpInside)
        view.addSubview(recordButton)

        finishButton.translatesAutoresizingMaskIntoConstraints = false
        finishButton.setTitle("Finish capture", for: .normal)
        finishButton.setTitleColor(.white, for: .normal)
        finishButton.titleLabel?.font = .systemFont(ofSize: 15, weight: .semibold)
        finishButton.isHidden = true
        finishButton.addTarget(self, action: #selector(tapFinish), for: .touchUpInside)
        view.addSubview(finishButton)

        NSLayoutConstraint.activate([
            cancelButton.leadingAnchor.constraint(equalTo: safe.leadingAnchor, constant: 16),
            cancelButton.topAnchor.constraint(equalTo: safe.topAnchor, constant: 10),

            statePill.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            statePill.topAnchor.constraint(equalTo: safe.topAnchor, constant: 8),
            statePill.heightAnchor.constraint(equalToConstant: 26),
            statePill.widthAnchor.constraint(greaterThanOrEqualToConstant: 130),

            timerLabel.trailingAnchor.constraint(equalTo: safe.trailingAnchor, constant: -16),
            timerLabel.topAnchor.constraint(equalTo: safe.topAnchor, constant: 8),
            timerLabel.heightAnchor.constraint(equalToConstant: 26),
            timerLabel.widthAnchor.constraint(equalToConstant: 64),

            metricsLabel.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            metricsLabel.topAnchor.constraint(equalTo: statePill.bottomAnchor, constant: 10),
            metricsLabel.heightAnchor.constraint(equalToConstant: 24),
            metricsLabel.widthAnchor.constraint(greaterThanOrEqualToConstant: 130),

            tipLabel.leadingAnchor.constraint(equalTo: safe.leadingAnchor, constant: 24),
            tipLabel.trailingAnchor.constraint(equalTo: safe.trailingAnchor, constant: -24),
            tipLabel.bottomAnchor.constraint(equalTo: recordButton.topAnchor, constant: -16),

            recordButton.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            recordButton.bottomAnchor.constraint(equalTo: safe.bottomAnchor, constant: -20),
            recordButton.widthAnchor.constraint(equalToConstant: 180),
            recordButton.heightAnchor.constraint(equalToConstant: 56),

            finishButton.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            finishButton.bottomAnchor.constraint(equalTo: recordButton.topAnchor, constant: -10),
        ])
    }

    private func setState(_ s: State, message: String?) {
        state = s
        DispatchQueue.main.async {
            switch s {
            case .checking: self.statePill.text = "Checking device…"
            case .ready: self.statePill.text = "Ready"
            case .recording: self.statePill.text = "● Recording"
            case .finishing: self.statePill.text = "Saving…"
            case .failed: self.statePill.text = "Failed"
            }
            if let m = message { self.tipLabel.text = m }
            self.finishButton.isHidden = !(s == .recording)
        }
        emitProgress()
    }

    // MARK: Buttons

    @objc private func tapRecord() {
        if isRecording { tapFinish() } else { startRecording() }
    }

    @objc private func tapCancel() {
        teardown()
        cleanupTempFiles()
        onCancel?()
    }

    @objc private func tapFinish() {
        guard isRecording else { return }
        finishRecording()
    }

    // MARK: Recording control

    private func startRecording() {
        guard state == .ready else { return }
        // Disk preflight (~500 MB).
        if let free = freeDiskBytes(), free < 500_000_000 {
            fail("Not enough free storage to record")
            return
        }
        hasStartedWriter = false
        droppedVideoFrames = 0
        lastVideoPTS = -Double.infinity
        lastKeyframeArkit = 0
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
        recordButton.setTitle("■ Stop", for: .normal)
        setState(.recording, message: "Move slowly · capture corners")
        startTimers()
        // Flip last: no ARFrame is accumulated until the reset above is queued.
        isRecording = true
    }

    private func finishRecording() {
        guard isRecording else { return }
        isRecording = false
        stopTimers()
        setState(.finishing, message: "Saving scan…")
        recordButton.isEnabled = false

        videoQueue.async { [weak self] in
            guard let self = self else { return }
            self.writerInput?.markAsFinished()
            let durationPts = CMTime(seconds: max(0, self.lastVideoPTS), preferredTimescale: 600)
            self.writer?.endSession(atSourceTime: durationPts)
            self.writer?.finishWriting {
                self.exportAndResolve()
            }
        }
    }

    private func exportAndResolve() {
        depthQueue.async { [weak self] in
            guard let self = self else { return }
            let sid = self.sessionId
            let tmp = URL(fileURLWithPath: NSTemporaryDirectory())
            let plyURL = tmp.appendingPathComponent("\(sid).ply")
            let posesURL = tmp.appendingPathComponent("\(sid)_poses.json")
            self.writePLY(to: plyURL)
            self.writePosesJSON(to: posesURL)

            let manifest: [String: Any] = [
                "cancelled": false,
                "videoUri": self.videoURL?.absoluteString ?? NSNull(),
                "plyUri": plyURL.absoluteString,
                "posesUri": posesURL.absoluteString,
                "pointCount": self.voxelGrid.count,
                "keyframeCount": self.keyframes.count,
                "durationSec": max(0, self.lastVideoPTS),
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

    // MARK: ARSessionDelegate

    private var encWidth = 0
    private var encHeight = 0

    func session(_ session: ARSession, didUpdate frame: ARFrame) {
        guard isRecording else { return }

        let arkitTs = frame.timestamp
        if !hasStartedWriter {
            beginWriter(with: frame)
        }
        let rel = arkitTs - sessionStartArkit

        // Enforce max duration.
        if rel >= options.maxDurationSec {
            DispatchQueue.main.async { [weak self] in self?.finishRecording() }
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
        let fx = intrinsics[0][0], fy = intrinsics[1][1]
        let cx = intrinsics[2][0], cy = intrinsics[2][1]
        let width = CVPixelBufferGetWidth(depthMap)
        let height = CVPixelBufferGetHeight(depthMap)

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

        depthQueue.async { [weak self] in
            guard let self = self else { return }
            for (key, data) in newVoxels where self.voxelGrid[key] == nil {
                self.voxelGrid[key] = data
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
    }

    func session(_ session: ARSession, didFailWithError error: Error) {
        fail("AR session failed: \(error.localizedDescription)")
    }

    func sessionWasInterrupted(_ session: ARSession) {
        if isRecording { DispatchQueue.main.async { [weak self] in self?.finishRecording() } }
        setState(state, message: "Capture interrupted — saving")
    }

    func session(_ session: ARSession, cameraDidChangeTrackingState camera: ARCamera) {
        let msg: String
        switch camera.trackingState {
        case .normal: msg = "Tracking good"
        case .limited: msg = "Move slowly · point at textured surfaces"
        case .notAvailable: msg = "Acquiring tracking…"
        }
        DispatchQueue.main.async { [weak self] in
            if self?.isRecording == true { self?.tipLabel.text = msg }
        }
    }

    // MARK: Writer

    private func beginWriter(with frame: ARFrame) {
        sessionStartArkit = frame.timestamp
        sessionStartUnix = Date().timeIntervalSince1970
        let res = frame.camera.imageResolution
        encWidth = Int(res.width)
        encHeight = Int(res.height)

        let sid = sessionId
        let url = URL(fileURLWithPath: NSTemporaryDirectory()).appendingPathComponent("\(sid).mp4")
        try? FileManager.default.removeItem(at: url)
        videoURL = url

        guard let w = try? AVAssetWriter(outputURL: url, fileType: .mp4) else {
            fail("Could not create video writer"); return
        }
        // Explicit creation_time so the Modal worker's ffprobe path resolves video_start_unix.
        let dateItem = AVMutableMetadataItem()
        dateItem.keySpace = .common
        dateItem.key = AVMetadataKey.commonKeyCreationDate as NSString
        dateItem.value = ISO8601DateFormatter().string(from: Date(timeIntervalSince1970: sessionStartUnix)) as NSString
        w.metadata = [dateItem]

        let settings: [String: Any] = [
            AVVideoCodecKey: AVVideoCodecType.h264,
            AVVideoWidthKey: encWidth,
            AVVideoHeightKey: encHeight,
            AVVideoCompressionPropertiesKey: [
                AVVideoAverageBitRateKey: 12_000_000,
                AVVideoMaxKeyFrameIntervalKey: 30,
                AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
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
        ]
        if let loc = currentLocation {
            kf["gps"] = ["lat": loc.coordinate.latitude, "lon": loc.coordinate.longitude, "alt": loc.altitude]
        }
        return kf
    }

    private func writePLY(to url: URL) {
        let pts = Array(voxelGrid.values)
        var data = Data()
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

    private func writePosesJSON(to url: URL) {
        let payload: [String: Any] = [
            "version": 3,
            "session_start_time": sessionStartUnix,
            "session_start_ar_timestamp": 0.0,
            "frames": keyframes,
        ]
        if let data = try? JSONSerialization.data(withJSONObject: payload, options: .prettyPrinted) {
            try? data.write(to: url)
        }
    }

    // MARK: Timers / progress

    private func startTimers() {
        progressTimer = Timer.scheduledTimer(withTimeInterval: 0.5, repeats: true) { [weak self] _ in self?.emitProgress() }
        displayTimer = Timer.scheduledTimer(withTimeInterval: 0.25, repeats: true) { [weak self] _ in
            guard let self = self, self.isRecording else { return }
            let secs = Int(max(0, self.lastVideoPTS))
            DispatchQueue.main.async {
                self.timerLabel.text = String(format: "%d:%02d", secs / 60, secs % 60)
                self.metricsLabel.text = "LIDAR · \(self.formatCount(self.pointCount)) pts"
            }
            // Thermal guard.
            switch ProcessInfo.processInfo.thermalState {
            case .serious:
                DispatchQueue.main.async { self.tipLabel.text = "Device warming — finish soon" }
            case .critical:
                DispatchQueue.main.async { self.finishRecording() }
            default: break
            }
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

    private func formatCount(_ n: Int) -> String { n >= 1000 ? "\(n / 1000)K" : "\(n)" }

    // MARK: Location

    private func setupLocation() {
        locationManager = CLLocationManager()
        locationManager?.delegate = self
        locationManager?.desiredAccuracy = kCLLocationAccuracyBest
        locationManager?.requestWhenInUseAuthorization()
        locationManager?.startUpdatingLocation()
    }
    func locationManager(_ m: CLLocationManager, didUpdateLocations locs: [CLLocation]) { currentLocation = locs.last }
    func locationManager(_ m: CLLocationManager, didFailWithError error: Error) {}

    // MARK: Teardown

    private func freeDiskBytes() -> Int64? {
        let url = URL(fileURLWithPath: NSTemporaryDirectory())
        let vals = try? url.resourceValues(forKeys: [.volumeAvailableCapacityForImportantUsageKey])
        return vals?.volumeAvailableCapacityForImportantUsage
    }

    private func teardownSessionOnly() {
        arSession.pause()
        locationManager?.stopUpdatingLocation()
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
