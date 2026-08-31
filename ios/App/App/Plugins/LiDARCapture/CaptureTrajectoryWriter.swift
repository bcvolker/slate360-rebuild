import Foundation

/// Streaming JSONL writer for the high-rate ARKit trajectory master.
///
/// One compact pose line per valid ARFrame (typically ~60 Hz). RGB/depth are
/// never stored here. Writes are serialised on an internal queue so the capture
/// loop does not retain the whole trajectory in RAM.
final class CaptureTrajectoryWriter {
    static let filename = "lidar_traj.jsonl"
    static let version = 1

    private let queue = DispatchQueue(label: "ai.slate360.twincap.traj", qos: .utility)
    private var handle: FileHandle?
    private(set) var url: URL?
    private(set) var posesWritten = 0
    private(set) var writeFailures = 0
    private var lastFx: Float?
    private var lastFy: Float?
    private var lastCx: Float?
    private var lastCy: Float?
    private var lastW: Int?
    private var lastH: Int?
    private var headerWritten = false
    private var sessionStartUnix: Double = 0

    func open(sessionId: String, sessionStartUnix: Double) {
        queue.sync {
            self.closeLocked()
            self.sessionStartUnix = sessionStartUnix
            self.posesWritten = 0
            self.writeFailures = 0
            self.lastFx = nil
            self.lastFy = nil
            self.lastCx = nil
            self.lastCy = nil
            self.headerWritten = false
            let dest = URL(fileURLWithPath: NSTemporaryDirectory())
                .appendingPathComponent("\(sessionId)_traj.jsonl")
            try? FileManager.default.removeItem(at: dest)
            FileManager.default.createFile(atPath: dest.path, contents: nil)
            self.url = dest
            self.handle = try? FileHandle(forWritingTo: dest)
            if self.handle == nil { self.writeFailures += 1 }
        }
    }

    func append(
        arTimestamp: Double,
        unixTimestamp: Double,
        transform4x4: [Float],
        trackingState: String,
        fx: Float,
        fy: Float,
        cx: Float,
        cy: Float,
        width: Int,
        height: Int
    ) {
        queue.async { [weak self] in
            guard let self else { return }
            self.writePoseLocked(
                arTimestamp: arTimestamp,
                unixTimestamp: unixTimestamp,
                transform4x4: transform4x4,
                trackingState: trackingState,
                fx: fx, fy: fy, cx: cx, cy: cy,
                width: width, height: height
            )
        }
    }

    func close() {
        queue.sync { closeLocked() }
    }

    private func closeLocked() {
        handle?.synchronizeFile()
        handle?.closeFile()
        handle = nil
    }

    private func writePoseLocked(
        arTimestamp: Double,
        unixTimestamp: Double,
        transform4x4: [Float],
        trackingState: String,
        fx: Float,
        fy: Float,
        cx: Float,
        cy: Float,
        width: Int,
        height: Int
    ) {
        guard let handle else {
            writeFailures += 1
            return
        }
        if !headerWritten {
            let header: [String: Any] = [
                "type": "header",
                "version": Self.version,
                "role": "trajectory_master",
                "session_start_unix": sessionStartUnix,
            ]
            if !writeJSONLine(header, handle: handle) {
                writeFailures += 1
                return
            }
            headerWritten = true
        }

        var payload: [String: Any] = [
            "version": Self.version,
            "ar_timestamp": arTimestamp,
            "unix_timestamp": unixTimestamp,
            "transform_4x4": transform4x4.map { Double($0) },
            "tracking_state": trackingState,
        ]
        let changed = lastFx == nil
            || abs((lastFx ?? 0) - fx) > 0.001
            || abs((lastFy ?? 0) - fy) > 0.001
            || abs((lastCx ?? 0) - cx) > 0.001
            || abs((lastCy ?? 0) - cy) > 0.001
            || lastW != width
            || lastH != height
        if changed {
            payload["intrinsics"] = [
                "fx": Double(fx), "fy": Double(fy),
                "cx": Double(cx), "cy": Double(cy),
                "w": width, "h": height,
            ]
            lastFx = fx; lastFy = fy; lastCx = cx; lastCy = cy
            lastW = width; lastH = height
        }
        if writeJSONLine(payload, handle: handle) {
            posesWritten += 1
        } else {
            writeFailures += 1
        }
    }

    private func writeJSONLine(_ object: [String: Any], handle: FileHandle) -> Bool {
        guard var data = try? JSONSerialization.data(withJSONObject: object, options: []) else {
            return false
        }
        data.append(0x0A)
        handle.write(data)
        return true
    }
}
