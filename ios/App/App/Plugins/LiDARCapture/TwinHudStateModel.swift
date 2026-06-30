import ARKit
import Combine
import Foundation
import SwiftUI

// MARK: - Public enums (parity with React TwinHudState contract)

enum TwinCapturePhase: String, Equatable {
    case checking
    case ready
    case recording
    case finishing
    case failed
}

enum TwinTrackingQuality: String, Equatable {
    case good
    case limited
    case unavailable

    static func from(_ state: ARCamera.TrackingState) -> TwinTrackingQuality {
        switch state {
        case .normal: return .good
        case .limited: return .limited
        case .notAvailable: return .unavailable
        }
    }

    var label: String {
        switch self {
        case .good: return "Good"
        case .limited: return "Limited"
        case .unavailable: return "Acquiring"
        }
    }
}

enum TwinThermalLevel: String, Equatable {
    case nominal
    case fair
    case serious
    case critical

    static func from(_ state: ProcessInfo.ThermalState) -> TwinThermalLevel {
        switch state {
        case .nominal: return .nominal
        case .fair: return .fair
        case .serious: return .serious
        case .critical: return .critical
        @unknown default: return .nominal
        }
    }
}

/// Capability flags — what the HUD may render as interactive.
struct TwinHudCapability: Equatable {
    var torchSupported: Bool = false
    var depthPresent: Bool = false
    var streamReady: Bool = false
    var needsResume: Bool = false
    var photosModeEnabled: Bool = false   // engine is video-only
    var exposureLockEnabled: Bool = false // ARKit owns AVCaptureDevice exposure
}

/// Action bridge — wired once by the view controller (UIKit targets).
struct TwinHudActions {
    var onBack: () -> Void = {}
    var onHome: () -> Void = {}
    var onToggleChrome: () -> Void = {}
    var onShutter: () -> Void = {}
    var onTorchToggle: () -> Void = {}
    var onDone: () -> Void = {}
    var onClipsToggle: () -> Void = {}
}

// MARK: - Observable state (main-actor only)

@MainActor
final class TwinHudStateModel: ObservableObject {
    @Published var phase: TwinCapturePhase = .checking
    @Published var headerLabel: String = "TWIN 360 · LIDAR"
    @Published var tipText: String = "Move slowly · capture corners · keep device steady"
    @Published var tipWarning: Bool = false

    @Published var isRecording: Bool = false
    @Published var elapsedMs: Int = 0
    @Published var torchOn: Bool = false
    @Published var tracking: TwinTrackingQuality = .unavailable
    @Published var thermal: TwinThermalLevel = .nominal

    @Published var lidarPointCount: Int = 0
    @Published var keyframeCount: Int = 0
    @Published var coverageProgress: Double = 0 // 0…1

    @Published var clipCount: Int = 0
    @Published var clipsExpanded: Bool = false
    @Published var chromeVisible: Bool = true
    @Published var finishing: Bool = false
    @Published var hasContent: Bool = false

    @Published var capability = TwinHudCapability()

    var actions = TwinHudActions()

    /// Throttle coalesced HUD pushes from ARKit / depth queues.
    private var lastPushUptime: TimeInterval = 0
    private let minPushInterval: TimeInterval = 0.2 // 5 Hz max

    func applySnapshot(
        phase: TwinCapturePhase,
        isRecording: Bool,
        elapsedMs: Int,
        torchOn: Bool,
        tracking: TwinTrackingQuality,
        thermal: TwinThermalLevel,
        lidarPointCount: Int,
        keyframeCount: Int,
        coverageProgress: Double,
        clipCount: Int,
        hasContent: Bool,
        finishing: Bool,
        capability: TwinHudCapability,
        tipText: String?,
        tipWarning: Bool,
        force: Bool = false
    ) {
        let now = ProcessInfo.processInfo.systemUptime
        if !force, now - lastPushUptime < minPushInterval { return }
        lastPushUptime = now

        self.phase = phase
        self.isRecording = isRecording
        self.elapsedMs = elapsedMs
        self.torchOn = torchOn
        self.tracking = tracking
        self.thermal = thermal
        self.lidarPointCount = lidarPointCount
        self.keyframeCount = keyframeCount
        self.coverageProgress = min(1, max(0, coverageProgress))
        self.clipCount = clipCount
        self.hasContent = hasContent
        self.finishing = finishing
        self.capability = capability
        if let tipText { self.tipText = tipText }
        self.tipWarning = tipWarning
    }

    func toggleChrome() {
        chromeVisible.toggle()
    }

    func toggleClipsExpanded() {
        clipsExpanded.toggle()
    }

    static func formatTimer(ms: Int) -> String {
        let totalSec = max(0, ms / 1000)
        let m = totalSec / 60
        let s = totalSec % 60
        return String(format: "%d:%02d", m, s)
    }

    static func formatPointCount(_ n: Int) -> String {
        n >= 1000 ? "\(n / 1000)K" : "\(n)"
    }
}