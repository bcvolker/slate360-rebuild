// Intentionally empty.
//
// The legacy CAP_PLUGIN(...) auto-registration macro was removed: under Capacitor
// 8 + Swift Package Manager it does not register an app-target plugin reliably
// (the bridge reported "LiDARCapture plugin is not implemented on ios"). The plugin
// is now registered explicitly via SlateBridgeViewController.capacitorDidLoad()
// with bridge?.registerPluginInstance(LiDARCapturePlugin()).
//
// LiDARCapturePlugin.swift remains a CAPBridgedPlugin (declares jsName + pluginMethods).
#import <Capacitor/Capacitor.h>
