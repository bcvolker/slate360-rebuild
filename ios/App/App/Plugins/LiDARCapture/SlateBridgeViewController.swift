import Capacitor
import UIKit
import WebKit

/// Custom Capacitor bridge controller. Does two things the stock
/// `CAPBridgeViewController` cannot:
///
/// 1. Registers the app-target `LiDARCapturePlugin` explicitly. App-target plugins
///    are NOT auto-discovered under Swift Package Manager, which is why the bridge
///    reported "LiDARCapture plugin is not implemented on ios". The legacy `.m`
///    `CAP_PLUGIN` macro is removed in favor of this (per Capacitor guidance).
///
/// 2. Publishes the real UIKit safe-area insets to the web layer as CSS custom
///    properties (`--safe-area-inset-*`). With `StatusBar.overlaysWebView = true`
///    the WKWebView is edge-to-edge, but WebKit then stops reliably exposing the
///    notch/Dynamic Island inset via CSS `env(safe-area-inset-*)` (it collapses to
///    ~0), which jammed normal headers under the status bar. Injecting the native
///    value gives CSS a dependable source; headers read
///    `var(--safe-area-inset-top, env(safe-area-inset-top, 0px))`.
class SlateBridgeViewController: CAPBridgeViewController {

    override func capacitorDidLoad() {
        bridge?.registerPluginInstance(LiDARCapturePlugin())
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        // Pairs with ios.contentInset = "never" — no scroll-view auto-insets.
        webView?.scrollView.contentInsetAdjustmentBehavior = .never
        publishSafeAreaInsets()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        publishSafeAreaInsets()
    }

    override func viewSafeAreaInsetsDidChange() {
        super.viewSafeAreaInsetsDidChange()
        publishSafeAreaInsets()
    }

    private func publishSafeAreaInsets() {
        let insets = view.safeAreaInsets
        let js = """
        (function () {
          var r = document.documentElement;
          if (!r) return;
          r.style.setProperty('--safe-area-inset-top', '\(insets.top)px');
          r.style.setProperty('--safe-area-inset-right', '\(insets.right)px');
          r.style.setProperty('--safe-area-inset-bottom', '\(insets.bottom)px');
          r.style.setProperty('--safe-area-inset-left', '\(insets.left)px');
        })();
        """
        webView?.evaluateJavaScript(js, completionHandler: nil)
    }

    override var preferredStatusBarStyle: UIStatusBarStyle {
        .lightContent
    }
}
