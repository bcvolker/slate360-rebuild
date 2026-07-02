import SwiftUI

// MARK: - Design tokens

private enum TwinHudColor {
    static let twinBlue = Color(red: 0x3D / 255, green: 0x8E / 255, blue: 0xFF / 255)
    static let canvas = Color(red: 0x0B / 255, green: 0x0F / 255, blue: 0x15 / 255)
    static let body = Color(red: 0xF8 / 255, green: 0xFA / 255, blue: 0xFC / 255)
    static let muted = Color(red: 0xA3 / 255, green: 0xAE / 255, blue: 0xD0 / 255)
    static let destructive = Color(red: 0.94, green: 0.27, blue: 0.27)
}

private struct TwinGlassPanel: ViewModifier {
    var cornerRadius: CGFloat = TwinCaptureChrome.topBarRadius

    func body(content: Content) -> some View {
        content
            // Graphite Glass: dark scrim at 0.62 (not the old 0.85 "black pill") over a
            // material blur, with a NEUTRAL white hairline — matching Site Walk's panel
            // grammar. Accent is reserved for interactive states, never panel chrome.
            // (.ultraThinMaterial alone washed out over bright camera feeds; the scrim
            // layer keeps labels legible over any scene.)
            .background(
                ZStack {
                    RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                        .fill(.ultraThinMaterial)
                    RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                        .fill(TwinHudColor.canvas.opacity(0.62))
                }
            )
            .overlay(
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .stroke(Color.white.opacity(0.12), lineWidth: 1)
            )
            .shadow(color: .black.opacity(0.35), radius: 8, y: 2)
    }
}

private extension View {
    func twinGlass(cornerRadius: CGFloat = TwinCaptureChrome.topBarRadius) -> some View {
        modifier(TwinGlassPanel(cornerRadius: cornerRadius))
    }
}

// MARK: - Root HUD

struct TwinCaptureHudView: View {
    @ObservedObject var model: TwinHudStateModel

    var body: some View {
        ZStack {
            if model.isRecording {
                Rectangle()
                    .fill(TwinHudColor.destructive.opacity(0.85))
                    .frame(height: 8)
                    .frame(maxHeight: .infinity, alignment: .top)
                    .allowsHitTesting(false)
                    .ignoresSafeArea() // accent strip stays at the physical top edge
            } else {
                Rectangle()
                    .fill(TwinHudColor.twinBlue)
                    .frame(height: 4)
                    .frame(maxHeight: .infinity, alignment: .top)
                    .allowsHitTesting(false)
                    .ignoresSafeArea() // accent strip stays at the physical top edge
            }

            if model.chromeVisible {
                // Site Walk grammar: TOP CLUSTER (hugs top) · empty CENTER (camera shows through) ·
                // BOTTOM DOCK (hugs bottom). The ONE Spacer is the only flexible element — nothing
                // renders between it and the dock, so the quality pill / mode selector / hint can no
                // longer float mid-screen. The dock no longer uses maxHeight:.infinity (that competed
                // with the Spacer and parked the mid views at the vertical centre).
                VStack(spacing: 0) {
                    // TOP CLUSTER — top bar + optional clip chips + slim LiDAR/tracking status row
                    TwinHudTopBar(model: model)
                    if model.clipsExpanded, model.clipCount > 0 {
                        TwinHudClipChips(model: model)
                    }
                    TwinHudChipRow(model: model)

                    // CENTER — intentionally empty; ARSCNView shows through
                    Spacer(minLength: 0)

                    // BOTTOM DOCK — one cohesive glass rail (hint + torch/record/done)
                    TwinHudBottomRail(model: model)
                }
            } else {
                TwinHudChromeRestoreButton(model: model)
            }
        }
        // Chrome (top bar, chips, rail) now RESPECTS safe area → clears the Dynamic Island /
        // notch. Camera shows through (ARSCNView behind); accent strips opt back to full-bleed
        // via their own .ignoresSafeArea() above. Host no longer zeros safeAreaRegions.
        .background(Color.clear)
    }
}

// MARK: - Top bar

private struct TwinHudTopBar: View {
    @ObservedObject var model: TwinHudStateModel

    var body: some View {
        VStack(spacing: 8) {
            HStack(spacing: 8) {
                Button(action: model.actions.onBack) {
                    HStack(spacing: 2) {
                        Image(systemName: "chevron.left")
                        Text("Back")
                    }
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(TwinHudColor.twinBlue)
                    .padding(.horizontal, 10)
                    .frame(height: 32)
                    .background(TwinHudColor.twinBlue.opacity(0.22), in: RoundedRectangle(cornerRadius: 8))
                    .overlay(RoundedRectangle(cornerRadius: 8).stroke(TwinHudColor.twinBlue.opacity(0.6), lineWidth: 1))
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Back")

                Text(model.headerLabel)
                    .font(.system(size: 11, weight: .semibold, design: .monospaced))
                    .foregroundStyle(TwinHudColor.body)
                    .lineLimit(1)
                    .frame(maxWidth: .infinity)

                if model.clipCount > 0 {
                    Button(action: model.actions.onClipsToggle) {
                        HStack(spacing: 4) {
                            Text("\(model.clipCount)")
                                .font(.system(size: 11, weight: .semibold, design: .monospaced))
                            Image(systemName: model.clipsExpanded ? "chevron.up" : "chevron.down")
                                .font(.system(size: 12, weight: .semibold))
                        }
                        .foregroundStyle(TwinHudColor.twinBlue)
                        .frame(width: 44, height: 32)
                        .background(TwinHudColor.twinBlue.opacity(0.20), in: RoundedRectangle(cornerRadius: 8))
                        .overlay(RoundedRectangle(cornerRadius: 8).stroke(TwinHudColor.twinBlue.opacity(0.55), lineWidth: 1))
                    }
                    .buttonStyle(.plain)
                }

                Text(TwinHudStateModel.formatTimer(ms: model.elapsedMs))
                    .font(.system(size: 14, weight: .bold, design: .monospaced))
                    .foregroundStyle(.white)
                    .frame(minWidth: 44, alignment: .trailing)

                Button(action: model.actions.onToggleChrome) {
                    Image(systemName: "arrow.up.left.and.arrow.down.right")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(TwinHudColor.twinBlue)
                        .frame(width: 32, height: 32)
                        .background(TwinHudColor.twinBlue.opacity(0.10), in: RoundedRectangle(cornerRadius: 8))
                        .overlay(RoundedRectangle(cornerRadius: 8).stroke(TwinHudColor.twinBlue.opacity(0.3), lineWidth: 1))
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Hide controls")

                Button(action: model.actions.onHome) {
                    Image(systemName: "house")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(TwinHudColor.twinBlue)
                        .frame(width: 32, height: 32)
                        .background(TwinHudColor.twinBlue.opacity(0.10), in: RoundedRectangle(cornerRadius: 8))
                        .overlay(RoundedRectangle(cornerRadius: 8).stroke(TwinHudColor.twinBlue.opacity(0.3), lineWidth: 1))
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Home")
            }
            .padding(.horizontal, 12)
            .frame(height: TwinCaptureChrome.topBarHeight)
            .twinGlass()
            .padding(.horizontal, TwinCaptureChrome.sideInset)
            .padding(.top, TwinCaptureChrome.topInset)
        }
    }
}

private struct TwinHudChromeRestoreButton: View {
    @ObservedObject var model: TwinHudStateModel

    var body: some View {
        VStack {
            HStack {
                Spacer()
                Button(action: model.actions.onToggleChrome) {
                    Image(systemName: "arrow.down.right.and.arrow.up.left")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(TwinHudColor.twinBlue)
                        .frame(width: 48, height: 48)
                        .twinGlass(cornerRadius: 12)
                }
                .buttonStyle(.plain)
                .padding(.top, TwinCaptureChrome.topInset + 8)
                .padding(.trailing, TwinCaptureChrome.sideInset)
            }
            Spacer()
        }
    }
}

// MARK: - Clip chips (expandable panel under top bar)

private struct TwinHudClipChips: View {
    @ObservedObject var model: TwinHudStateModel

    var body: some View {
        HStack(spacing: 8) {
            Text(model.isRecording ? "● CLIP \(clipLabel)" : "CLIP \(clipLabel)")
                .font(.system(size: 10, weight: .semibold, design: .monospaced))
                .foregroundStyle(model.isRecording ? TwinHudColor.twinBlue : TwinHudColor.body)
                .padding(.horizontal, 10)
                .padding(.vertical, 6)
                .background(
                    model.isRecording
                        ? TwinHudColor.twinBlue.opacity(0.18)
                        : Color.white.opacity(0.06),
                    in: Capsule()
                )
                .overlay(
                    Capsule().stroke(
                        model.isRecording
                            ? TwinHudColor.twinBlue.opacity(0.45)
                            : Color.white.opacity(0.12),
                        lineWidth: 1
                    )
                )
            Spacer(minLength: 0)
        }
        .padding(.horizontal, 14)
        .padding(.vertical, 8)
        .twinGlass(cornerRadius: 12)
        .padding(.horizontal, TwinCaptureChrome.sideInset)
        .padding(.top, 6)
    }

    private var clipLabel: String {
        String(format: "%02d", max(1, model.clipCount))
    }
}

// MARK: - LiDAR + tracking chips

private struct TwinHudChipRow: View {
    @ObservedObject var model: TwinHudStateModel

    var body: some View {
        Group {
            if model.capability.depthPresent {
                HStack(spacing: 8) {
                    Label {
                        Text("LiDAR · \(TwinHudStateModel.formatPointCount(model.lidarPointCount)) pts")
                            .font(.system(size: 12, weight: .semibold, design: .monospaced))
                    } icon: {
                        Circle()
                            .fill(TwinHudColor.twinBlue)
                            .frame(width: 6, height: 6)
                    }
                    .foregroundStyle(TwinHudColor.body)

                    Text("·")
                        .foregroundStyle(TwinHudColor.muted)

                    Text("Tracking \(model.tracking.label)")
                        .font(.system(size: 12, weight: .semibold, design: .monospaced))
                        .foregroundStyle(model.tracking == .good ? TwinHudColor.body : Color.orange)
                }
                .padding(.horizontal, 14)
                .frame(height: 28)
                .twinGlass(cornerRadius: 14)
                .padding(.top, 10)
            }
        }
    }
}

// NOTE: TwinHudQualityPill, TwinHudModeSelector, and TwinHudHint were removed — they floated
// mid-screen over the camera. "Auto (LiDAR)" exposure state now lives in the top chip row; the
// VIDEO/PHOTOS selector is dropped (video-only product); the hint + recording readout are folded
// into the bottom dock's hint line (TwinHudBottomRail.hintText).

// MARK: - Bottom dock (hint + torch/record/done in one cohesive glass rail)

private struct TwinHudBottomRail: View {
    @ObservedObject var model: TwinHudStateModel

    private var shutterEnabled: Bool {
        model.capability.streamReady
            && !model.capability.needsResume
            && !model.finishing
            && model.phase != .finishing
    }

    var body: some View {
        VStack(spacing: 12) {
            // Readiness / recording hint — INSIDE the dock, never floating over the camera.
            Text(hintText)
                .font(.system(size: 12, weight: .semibold, design: .monospaced))
                .foregroundStyle(model.tipWarning ? Color.orange : .white)
                .lineLimit(1)
                .minimumScaleFactor(0.8)
                .frame(maxWidth: .infinity)
                .allowsHitTesting(false)

            // VIDEO | PHOTOS mode selector — Site Walk grammar (mono uppercase segments,
            // accent only on the active segment). Locked while recording.
            modeSelector

            // Photo cadence (photos mode only): manual shutter or auto-capture every
            // 1/2/3 s. Exposure is ARKit-managed (locking it breaks tracking) — cadence
            // + torch are the controls the hardware allows.
            if model.captureMode == .photos, !model.isRecording {
                intervalSelector
            }

            HStack(alignment: .center) {
                torchControl
                    .frame(maxWidth: .infinity, alignment: .leading)

                shutterControl
                    .frame(width: TwinCaptureChrome.shutterSize + 16)

                doneControl
                    .frame(maxWidth: .infinity, alignment: .trailing)
            }
            .padding(.horizontal, TwinCaptureChrome.railSideInset)
        }
        .padding(.top, 12)
        .padding(.bottom, 14)
        // ONE cohesive glass dock (solid scrim) — no maxHeight:.infinity float. The single Spacer in
        // the root VStack pins this to the bottom safe-area edge; the dock hugs its content height.
        .twinGlass(cornerRadius: 16)
        .padding(.horizontal, TwinCaptureChrome.sideInset)
        .padding(.bottom, 10)
    }

    private var hintText: String {
        if model.isRecording {
            return "● REC \(TwinHudStateModel.formatTimer(ms: model.elapsedMs)) · CLIP \(max(1, model.clipCount))"
        }
        if model.captureMode == .photos {
            if model.photoAutoActive {
                let cadence = model.photoIntervalSec < 1 ? "½S" : "\(Int(model.photoIntervalSec))S"
                return "AUTO \(cadence) · \(model.photoCount) captured · tap to stop"
            }
            return model.photoCount > 0
                ? "PHOTOS · \(model.photoCount) captured · tap for more"
                : (model.tipText.isEmpty ? "Photos — tap the shutter" : model.tipText)
        }
        return model.tipText.isEmpty ? "Ready · tap record" : model.tipText
    }

    @ViewBuilder
    private var modeSelector: some View {
        if model.capability.photosModeEnabled {
            HStack(spacing: 4) {
                modeSegment("VIDEO", mode: .video)
                modeSegment("PHOTOS", mode: .photos)
            }
            .padding(3)
            .background(Color.white.opacity(0.06), in: RoundedRectangle(cornerRadius: 10))
            .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.white.opacity(0.10), lineWidth: 1))
            .opacity(model.isRecording ? 0.4 : 1)
            .disabled(model.isRecording)
        }
    }

    private func modeSegment(_ label: String, mode: TwinCaptureMode) -> some View {
        let active = model.captureMode == mode
        return Button(action: { model.actions.onModeChange(mode) }) {
            Text(label)
                .font(.system(size: 11, weight: .bold, design: .monospaced))
                .foregroundStyle(active ? TwinHudColor.canvas : .white)
                .padding(.horizontal, 16)
                .frame(height: 28)
                .background(
                    active ? TwinHudColor.twinBlue : Color.clear,
                    in: RoundedRectangle(cornerRadius: 8)
                )
        }
        .buttonStyle(.plain)
    }

    private var intervalSelector: some View {
        // CEO spec: 0.5/1/2/3 s then manual — 1 s is the DEFAULT (crews walk and
        // shoot; "manual" as default confused users into single-shot mode).
        HStack(spacing: 4) {
            intervalSegment("½S", value: 0.5)
            intervalSegment("1S", value: 1)
            intervalSegment("2S", value: 2)
            intervalSegment("3S", value: 3)
            intervalSegment("MANUAL", value: 0)
        }
        .padding(3)
        .background(Color.white.opacity(0.06), in: RoundedRectangle(cornerRadius: 10))
        .overlay(RoundedRectangle(cornerRadius: 10).stroke(Color.white.opacity(0.10), lineWidth: 1))
    }

    private func intervalSegment(_ label: String, value: Double) -> some View {
        let active = model.photoIntervalSec == value
        return Button(action: { model.actions.onPhotoIntervalChange(value) }) {
            Text(label)
                .font(.system(size: 11, weight: .bold, design: .monospaced))
                .foregroundStyle(active ? TwinHudColor.canvas : .white)
                .padding(.horizontal, 12)
                .frame(height: 26)
                .background(
                    active ? TwinHudColor.twinBlue : Color.clear,
                    in: RoundedRectangle(cornerRadius: 8)
                )
        }
        .buttonStyle(.plain)
    }

    @ViewBuilder
    private var torchControl: some View {
        if model.capability.torchSupported {
            VStack(spacing: 6) {
                Button(action: model.actions.onTorchToggle) {
                    Image(systemName: model.torchOn ? "flashlight.on.fill" : "flashlight.off.fill")
                        .font(.system(size: 20, weight: .semibold))
                        .foregroundStyle(model.torchOn ? TwinHudColor.twinBlue : TwinHudColor.body)
                        .frame(width: TwinCaptureChrome.lightButtonSize, height: TwinCaptureChrome.lightButtonSize)
                        .background(
                            model.torchOn ? TwinHudColor.twinBlue.opacity(0.22) : Color.white.opacity(0.06),
                            in: RoundedRectangle(cornerRadius: 12)
                        )
                        .overlay(
                            RoundedRectangle(cornerRadius: 12)
                                .stroke(model.torchOn ? TwinHudColor.twinBlue.opacity(0.55) : Color.white.opacity(0.10), lineWidth: 1)
                        )
                }
                .buttonStyle(.plain)
                Text("Light")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(.white)
            }
        } else {
            Color.clear.frame(width: TwinCaptureChrome.lightButtonSize, height: TwinCaptureChrome.lightButtonSize + 20)
        }
    }

    @ViewBuilder
    private var shutterControl: some View {
        let photosMode = model.captureMode == .photos
        Button(action: model.actions.onShutter) {
            ZStack {
                Circle()
                    .stroke(
                        AngularGradient(
                            gradient: Gradient(colors: [TwinHudColor.twinBlue, TwinHudColor.twinBlue.opacity(0.2), TwinHudColor.twinBlue]),
                            center: .center
                        ),
                        lineWidth: TwinCaptureChrome.coverageRingWidth
                    )
                    .opacity(model.isRecording ? 1 : 0.35)
                    .frame(width: TwinCaptureChrome.shutterSize, height: TwinCaptureChrome.shutterSize)
                    .rotationEffect(.degrees(model.coverageProgress * 360))

                Circle()
                    .fill(
                        (model.isRecording || model.photoAutoActive)
                            ? TwinHudColor.destructive
                            : (photosMode ? Color.white : TwinHudColor.twinBlue)
                    )
                    .frame(width: TwinCaptureChrome.shutterInner, height: TwinCaptureChrome.shutterInner)
                    .overlay(
                        Circle().stroke(Color.white.opacity(0.85), lineWidth: (model.isRecording || model.photoAutoActive) ? 0 : 3)
                    )

                if model.isRecording || model.photoAutoActive {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color.white)
                        .frame(width: 22, height: 22)
                }
            }
        }
        .buttonStyle(.plain)
        .disabled(!shutterEnabled)
        .opacity(shutterEnabled ? 1 : 0.45)
        .accessibilityLabel(
            photosMode ? "Take photo" : (model.isRecording ? "Stop clip" : "Start clip")
        )
        // No offset — the shutter sits inline in the dock row (the old -16pt raise made it
        // overlap the hint text above; the "backing disc" black pill is gone with it).
    }

    @ViewBuilder
    private var doneControl: some View {
        // `prominent` = there's a captured clip to finish → solid blue fill, dark check.
        // Otherwise the button stays FULLY VISIBLE (white check on a defined blue-tinted
        // pill) instead of the old blue-on-blue @ 0.45 opacity, which vanished on the dark
        // dock. It only becomes tappable once there is content or a recording to stop, but
        // it must always be legible so the user knows where "Done" lives.
        let prominent = model.hasContent && !model.isRecording && !model.finishing
        let enabled = prominent || model.isRecording
        VStack(spacing: 6) {
            Button(action: model.actions.onDone) {
                Image(systemName: "checkmark")
                    .font(.system(size: 22, weight: .bold))
                    .foregroundStyle(prominent ? TwinHudColor.canvas : TwinHudColor.body)
                    .frame(width: TwinCaptureChrome.doneButtonSize, height: TwinCaptureChrome.doneButtonSize)
                    .background(
                        prominent ? TwinHudColor.twinBlue : TwinHudColor.twinBlue.opacity(0.22),
                        in: RoundedRectangle(cornerRadius: 14)
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: 14)
                            .stroke(TwinHudColor.twinBlue.opacity(prominent ? 0.9 : 0.6), lineWidth: 1.5)
                    )
            }
            .buttonStyle(.plain)
            .disabled(!enabled)
            // Legible even when disabled — dim only slightly (0.85), never the old 0.45.
            .opacity(enabled ? 1 : 0.85)
            Text("Done")
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(.white)
        }
    }
}