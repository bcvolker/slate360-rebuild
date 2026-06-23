#import <Capacitor/Capacitor.h>

// Registers the plugin with the Capacitor bridge.
// Capacitor 8 auto-discovers this via the CAP_PLUGIN macro — no AppDelegate changes needed.
CAP_PLUGIN(LiDARCapturePlugin, "LiDARCapture",
           CAP_PLUGIN_METHOD(isAvailable,   CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(startSession,  CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(stopSession,   CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(exportData,    CAPPluginReturnPromise);
           CAP_PLUGIN_METHOD(cleanup,       CAPPluginReturnPromise);
)
