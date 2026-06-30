import CoreGraphics

/// Locked layout metrics — mirrors `lib/digital-twin/twin-capture-chrome-layout.ts`.
enum TwinCaptureChrome {
    static let canvas = "#0B0F15"
    static let twinBlue = "#3D8EFF"
    static let topInset: CGFloat = 12
    static let topBarHeight: CGFloat = 44
    static let topBarRadius: CGFloat = 12
    static let sideInset: CGFloat = 12
    static let railSideInset: CGFloat = 16
    static let railLabelBottom: CGFloat = 44
    static let railLabelRow: CGFloat = 15
    static let shutterSize: CGFloat = 72
    static let shutterInner: CGFloat = 58
    static let shutterRaise: CGFloat = 16
    static let lightButtonSize: CGFloat = 48
    static let doneButtonSize: CGFloat = 56
    static let modeSelectorBottom: CGFloat = 167
    static let modeSelectorRow: CGFloat = 36
    static let qualityLockBottom: CGFloat = 209
    static let qualityLockRow: CGFloat = 32
    static let hintBottom: CGFloat = 12
    static let coverageRingWidth: CGFloat = 4
}