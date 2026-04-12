/**
 * Shared upload-permission validation.
 *
 * Extracted from `app/api/slatedrop/upload-url/route.ts` so the same
 * rules can be reused across routes, tested in isolation, and extended
 * when new app contexts are added.
 */

export interface UploadRequest {
  filename: string;
  size: number;
  app_context?: string;
}

export interface UploadRejection {
  error: string;
  target_app: string;
  message: string;
}

const FIFTY_MB = 50 * 1024 * 1024;
const BLOCKED_EXTENSIONS_SITE_WALK = new Set(["glb", "obj"]);

/** Dangerous executable/script extensions blocked globally. */
const BLOCKED_EXTENSIONS_GLOBAL = new Set([
  "exe", "bat", "cmd", "com", "msi", "scr", "pif", "vbs", "vbe",
  "js", "jse", "ws", "wsf", "wsc", "wsh", "ps1", "ps2", "psc1",
  "psc2", "reg", "inf", "lnk", "sct", "shb", "shs", "cpl", "hta",
  "jar", "apk", "ipa", "deb", "rpm",
]);

/**
 * Validates whether the upload is permitted for the given app context.
 *
 * Returns `null` if the upload is allowed, or an `UploadRejection`
 * describing why it was blocked.
 */
export function validateUploadPermissions(
  req: UploadRequest,
): UploadRejection | null {
  const ext = req.filename.split(".").pop()?.toLowerCase() ?? "";

  // Global blocklist — dangerous executable/script types
  if (BLOCKED_EXTENSIONS_GLOBAL.has(ext)) {
    return {
      error: "BLOCKED_FILE_TYPE",
      target_app: "slatedrop",
      message: `File type .${ext} is not allowed for security reasons.`,
    };
  }

  if (req.app_context !== "site_walk") {
    return null; // no further restrictions for other contexts
  }

  if (BLOCKED_EXTENSIONS_SITE_WALK.has(ext)) {
    return {
      error: "UPGRADE_REQUIRED",
      target_app: "tour_builder",
      message: "3D model files (.glb, .obj) require the Tour Builder app.",
    };
  }

  if (req.size > FIFTY_MB) {
    return {
      error: "UPGRADE_REQUIRED",
      target_app: "tour_builder",
      message: "Files over 50 MB require the Tour Builder app.",
    };
  }

  return null;
}
