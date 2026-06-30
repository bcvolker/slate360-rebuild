import SwiftUI
import UIKit

/// Hosts `TwinCaptureHudView` as a transparent overlay sibling to `ARSCNView`.
///
/// Lifecycle: call `install(in:parent:)` once from `viewDidLoad` after the AR preview
/// is added. Call `detach()` from `viewWillDisappear` so the hosting controller is
/// removed before the capture VC dismisses — avoids stale SwiftUI state if the modal
/// is presented again.
@MainActor
final class TwinCaptureHudHost {
    let state: TwinHudStateModel
    private let hostingController: UIHostingController<TwinCaptureHudView>
    private var installed = false

    init() {
        let model = TwinHudStateModel()
        self.state = model
        self.hostingController = UIHostingController(rootView: TwinCaptureHudView(model: model))
        configureHostingView(hostingController.view)
    }

    var view: UIView { hostingController.view }

    /// Pin the HUD edge-to-edge above `ARSCNView` (same superview, added after preview).
    func install(in containerView: UIView, parent: UIViewController) {
        guard !installed else { return }
        installed = true

        parent.addChild(hostingController)
        let hudView = hostingController.view!
        hudView.translatesAutoresizingMaskIntoConstraints = false
        containerView.addSubview(hudView)
        NSLayoutConstraint.activate([
            hudView.leadingAnchor.constraint(equalTo: containerView.leadingAnchor),
            hudView.trailingAnchor.constraint(equalTo: containerView.trailingAnchor),
            hudView.topAnchor.constraint(equalTo: containerView.topAnchor),
            hudView.bottomAnchor.constraint(equalTo: containerView.bottomAnchor),
        ])
        containerView.bringSubviewToFront(hudView)
        hostingController.didMove(toParent: parent)
    }

    func detach() {
        guard installed else { return }
        installed = false
        hostingController.willMove(toParent: nil)
        hostingController.view.removeFromSuperview()
        hostingController.removeFromParent()
    }

    private func configureHostingView(_ view: UIView) {
        view.backgroundColor = .clear
        view.isOpaque = false
        view.isUserInteractionEnabled = true
        // UIHostingController defaults to an opaque background — must stay clear so AR
        // frames show through non-control regions.
        //
        // NOTE: we intentionally do NOT set `safeAreaRegions = []`. Zeroing safe areas hid
        // the Dynamic Island / notch from the SwiftUI HUD, so the top bar rendered under the
        // Island. Letting safe areas propagate lets the chrome inset below it (the camera and
        // accent strips stay full-bleed via per-view .ignoresSafeArea() in TwinCaptureHudView).
    }
}
