import type { CapacitorConfig } from "@capacitor/cli";

/**
 * APP_VARIANT selects which native shell this build produces. Unset/anything
 * else = the legacy Slate360 app (byte-identical to the old capacitor.config.json
 * — nothing changes for the existing ios-capacitor / android-capacitor
 * Codemagic workflows). APP_VARIANT=sw360 = the standalone Site Walk 360 app
 * (docs/design/SITEWALK360_SONNET_BUILD_PLAN.md B2.0).
 */
const variant = process.env.APP_VARIANT === "sw360" ? "sw360" : "legacy";

const legacyConfig: CapacitorConfig = {
  appId: "ai.slate360.app",
  appName: "Slate360",
  webDir: "public",
  backgroundColor: "#0B0F15",
  server: {
    url: "https://www.slate360.ai",
    cleartext: false,
    androidScheme: "https",
  },
  ios: {
    contentInset: "never",
    backgroundColor: "#0B0F15",
  },
  android: {
    backgroundColor: "#0B0F15",
  },
  plugins: {
    SplashScreen: {
      backgroundColor: "#0B0F15",
      launchAutoHide: true,
      showSpinner: false,
    },
    StatusBar: {
      overlaysWebView: true,
      style: "DARK",
    },
  },
};

const sw360Config: CapacitorConfig = {
  appId: "com.slate360.sitewalk360",
  appName: "Site Walk 360",
  webDir: "public",
  backgroundColor: "#F2EFE9",
  server: {
    url: "https://app.sitewalk360.app",
    cleartext: false,
    androidScheme: "https",
  },
  ios: {
    contentInset: "never",
    backgroundColor: "#F2EFE9",
  },
  android: {
    backgroundColor: "#F2EFE9",
  },
  plugins: {
    SplashScreen: {
      backgroundColor: "#F2EFE9",
      launchAutoHide: true,
      showSpinner: false,
    },
    StatusBar: {
      overlaysWebView: true,
      // Dark text/icons over the light SW360 splash/paper background.
      style: "LIGHT",
    },
  },
};

const config: CapacitorConfig = variant === "sw360" ? sw360Config : legacyConfig;

export default config;
