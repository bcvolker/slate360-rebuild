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
            // Solid dark scrim (Graphite canvas @ 85%) instead of .ultraThinMaterial, which washed
            // out to near-white over a bright camera feed and made every chip/label invisible. A
            // near-opaque pill + shadow reads over ANY scene; stroke raised for a defined edge.
            .background(
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .fill(TwinHudColor.canvas.opacity(0.85))
            )
            .overlay(
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .stroke(TwinHudColor.twinBlue.opacity(0.55), lineWidth: 1)
            )
            .shadow(color: .black.opacity(0.45), radius: 8, y: 2)
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
                VStack(spacing: 0) {
                    TwinHudTopBar(model: model)
                    if model.clipsExpanded, model.clipCount > 0 {
                        TwinHudClipChips(model: model)
                    }
                    TwinHudChipRow(model: model)
                    Spacer(minLength: 0)
                    TwinHudQualityPill()
                    TwinHudModeSelector(model: model)
                    TwinHudHint(model: model)
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
                    .font(.system(size: 11, weight: .bold))
                    .foregroundStyle(TwinHudColor.twinBlue)
                    .padding(.horizontal, 10)
                    .frame(height: 32)
                    .background(TwinHudColor.twinBlue.opacity(0.14), in: RoundedRectangle(cornerRadius: 8))
                    .overlay(RoundedRectangle(cornerRadius: 8).stroke(TwinHudColor.twinBlue.opacity(0.35), lineWidth: 1))
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Back")

                Text(model.headerLabel)
                    .font(.system(size: 11, weight: .semibold, design: .monospaced))
                    .foregroundStyle(TwinHudColor.twinBlue)
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
                        .background(TwinHudColor.twinBlue.opacity(0.12), in: RoundedRectangle(cornerRadius: 8))
                        .overlay(RoundedRectangle(cornerRadius: 8).stroke(TwinHudColor.twinBlue.opacity(0.3), lineWidth: 1))
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
                    .foregroundStyle(TwinHudColor.twinBlue)

                    Text("·")
                        .foregroundStyle(TwinHudColor.muted)

                    Text("Tracking \(model.tracking.label)")
                        .font(.system(size: 12, weight: .semibold, design: .monospaced))
                        .foregroundStyle(model.tracking == .good ? TwinHudColor.twinBlue : Color.orange)
                }
                .padding(.horizontal, 14)
                .frame(height: 28)
                .twinGlass(cornerRadius: 14)
                .padding(.top, 10)
            }
        }
    }
}

// MARK: - Exposure pill (disabled under ARKit)

private struct TwinHudQualityPill: View {
    var body: some View {
        HStack(spacing: 6) {
            Image(systemName: "lock.fill")
                .font(.system(size: 10, weight: .semibold))
            Text("Auto (LiDAR)")
                .font(.system(size: 11, weight: .semibold))
        }
        .foregroundStyle(TwinHudColor.muted)
        .padding(.horizontal, 12)
        .frame(height: TwinCaptureChrome.qualityLockRow)
        .twinGlass(cornerRadius: 16)
        .opacity(0.72)
        .padding(.horizontal, TwinCaptureChrome.railSideInset)
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottom)
        .padding(.bottom, TwinCaptureChrome.qualityLockBottom - TwinCaptureChrome.railLabelBottom - TwinCaptureChrome.shutterSize - 24)
        .allowsHitTesting(false)
        .accessibilityLabel("Exposure controlled by ARKit")
    }
}

// MARK: - Mode selector (video only; photos disabled)

private struct TwinHudModeSelector: View {
    @ObservedObject var model: TwinHudStateModel

    var body: some View {
        Group {
            if model.isRecording {
                HStack(spacing: 4) {
                    Text("VIDEO")
                        .foregroundStyle(TwinHudColor.twinBlue)
                    Text("·")
                        .foregroundStyle(TwinHudColor.muted)
                    Text("● REC \(TwinHudStateModel.formatTimer(ms: model.elapsedMs))")
                        .foregroundStyle(.white)
                    Text("· target 1:30")
                        .foregroundStyle(TwinHudColor.muted)
                }
                .font(.system(size: 13, weight: .semibold, design: .monospaced))
                .padding(.horizontal, 10)
                .padding(.vertical, 6)
                .twinGlass(cornerRadius: 10)
            } else {
                HStack(spacing: 4) {
                    modeTab("VIDEO", active: true, enabled: true)
                    modeTab("PHOTOS", active: false, enabled: false)
                }
                .padding(4)
                .twinGlass(cornerRadius: 10)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottom)
        .padding(.bottom, TwinCaptureChrome.modeSelectorBottom - TwinCaptureChrome.railLabelBottom - TwinCaptureChrome.shutterSize - 8)
    }

    @ViewBuilder
    private func modeTab(_ label: String, active: Bool, enabled: Bool) -> some View {
        Text(label)
            .font(.system(size: 11, weight: .bold, design: .monospaced))
            .foregroundStyle(active ? TwinHudColor.canvas : TwinHudColor.muted.opacity(enabled ? 1 : 0.45))
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(
                active ? TwinHudColor.twinBlue : Color.clear,
                in: RoundedRectangle(cornerRadius: 8)
            )
            .opacity(enabled ? 1 : 0.45)
    }
}

// MARK: - Hint

private struct TwinHudHint: View {
    @ObservedObject var model: TwinHudStateModel

    var body: some View {
        Text(model.tipText)
            .font(.system(size: 11, weight: .medium))
            .foregroundStyle(model.tipWarning ? Color.orange : TwinHudColor.body)
            .multilineTextAlignment(.center)
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .twinGlass(cornerRadius: 10)
            .padding(.horizontal, 24)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottom)
            .padding(.bottom, TwinCaptureChrome.hintBottom + TwinCaptureChrome.railLabelBottom + TwinCaptureChrome.shutterSize + 28)
            .allowsHitTesting(false)
    }
}

// MARK: - Bottom rail

private struct TwinHudBottomRail: View {
    @ObservedObject var model: TwinHudStateModel

    private var shutterEnabled: Bool {
        model.capability.streamReady
            && !model.capability.needsResume
            && !model.finishing
            && model.phase != .finishing
    }

    var body: some View {
        VStack(spacing: 6) {
            HStack(alignment: .bottom) {
                torchControl
                    .frame(maxWidth: .infinity, alignment: .leading)

                shutterControl
                    .frame(width: TwinCaptureChrome.shutterSize + 16)

                doneControl
                    .frame(maxWidth: .infinity, alignment: .trailing)
            }
            .padding(.horizontal, TwinCaptureChrome.railSideInset)
        }
        .padding(.bottom, TwinCaptureChrome.railLabelBottom)
        .frame(maxHeight: .infinity, alignment: .bottom)
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
                    .font(.system(size: 11, weight: .medium))
                    .foregroundStyle(TwinHudColor.body)
            }
        } else {
            Color.clear.frame(width: TwinCaptureChrome.lightButtonSize, height: TwinCaptureChrome.lightButtonSize + 20)
        }
    }

    @ViewBuilder
    private var shutterControl: some View {
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
                    .fill(model.isRecording ? TwinHudColor.destructive : TwinHudColor.twinBlue)
                    .frame(width: TwinCaptureChrome.shutterInner, height: TwinCaptureChrome.shutterInner)
                    .overlay(
                        Circle().stroke(Color.white.opacity(0.85), lineWidth: model.isRecording ? 0 : 3)
                    )

                if model.isRecording {
                    RoundedRectangle(cornerRadius: 4)
                        .fill(Color.white)
                        .frame(width: 22, height: 22)
                }
            }
        }
        .buttonStyle(.plain)
        .disabled(!shutterEnabled)
        .opacity(shutterEnabled ? 1 : 0.45)
        .accessibilityLabel(model.isRecording ? "Stop clip" : "Start clip")
        .offset(y: -TwinCaptureChrome.shutterRaise)
    }

    @ViewBuilder
    private var doneControl: some View {
        let prominent = model.hasContent && !model.isRecording && !model.finishing
        VStack(spacing: 6) {
            Button(action: model.actions.onDone) {
                Image(systemName: "checkmark")
                    .font(.system(size: 22, weight: .bold))
                    .foregroundStyle(prominent ? TwinHudColor.canvas : TwinHudColor.twinBlue)
                    .frame(width: TwinCaptureChrome.doneButtonSize, height: TwinCaptureChrome.doneButtonSize)
                    .background(
                        prominent ? TwinHudColor.twinBlue : TwinHudColor.twinBlue.opacity(0.12),
                        in: RoundedRectangle(cornerRadius: 14)
                    )
                    .overlay(
                        RoundedRectangle(cornerRadius: 14)
                            .stroke(TwinHudColor.twinBlue.opacity(prominent ? 0.9 : 0.35), lineWidth: 1)
                    )
            }
            .buttonStyle(.plain)
            .disabled(!prominent && !model.isRecording)
            .opacity((prominent || model.isRecording) ? 1 : 0.45)
            Text("Done")
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(TwinHudColor.body)
        }
    }
}