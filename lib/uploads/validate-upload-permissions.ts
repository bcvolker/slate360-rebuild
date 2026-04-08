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
  /** True when the request arrives via a publicToken (unauthenticated external client). */
  isExternal?: boolean;
}

export interface UploadRejection {
  error: string;
  target_app: string;
  message: string;
}

const FIFTY_MB = 50 * 1024 * 1024;
const BLOCKED_EXTENSIONS_SITE_WALK = new Set(["glb", "obj"]);

/**
 * Extensions that are never acceptable regardless of caller context.
 * This list covers executable and script types that have no legitimate
 * place in a construction-document platform and pose obvious malware risk.
 */
const GLOBALLY_BLOCKED_EXTENSIONS = new Set([
  "exe", "bat", "cmd", "com", "msi", "dll", "sys",
  "sh", "bash", "zsh", "fish",
  "ps1", "psm1", "psd1",       // PowerShell
  "vbs", "vbe", "js", "jse",   // Windows Script Host
  "scr", "pif", "reg",
  "jar", "class",               // Java executables
  "dmg", "pkg", "app",          // macOS executables
  "deb", "rpm",                 // Linux packages
]);

/** Max file size accepted from unauthenticated external-token uploads. */
const EXTERNAL_MAX_BYTES = FIFTY_MB;

/**
 * Validates whether the upload is permitted for the given app context.
 *
 * Returns `null` if the upload is allowed, or an `UploadRejection`
 * describing why it was blocked.
 *
 * Evaluation order (fail-fast):
 *  1. Globally blocked extensions — applies to all callers.
 *  2. External size cap — applies when isExternal=true.
 *  3. App-context rules (site_walk) — applies to internal authenticated callers.
 */
export function validateUploadPermissions(
  req: UploadRequest,
): UploadRejection | null {
  const ext = req.filename.split(".").pop()?.toLowerCase() ?? "";

  // ── 1. Global block list ─────────────────────────────────────
  if (GLOBALLY_BLOCKED_EXTENSIONS.has(ext)) {
    return {
      error: "FILE_TYPE_BLOCKED",
      target_app: "slatedrop",
      message: `Files of type .${ext} are not permitted.`,
    };
  }

  // ── 2. External upload size cap ──────────────────────────────
  if (req.isExternal && req.size > EXTERNAL_MAX_BYTES) {
    return {
      error: "FILE_TOO_LARGE",
      target_app: "slatedrop",
      message: `External uploads are limited to ${EXTERNAL_MAX_BYTES / 1024 / 1024} MB.`,
    };
  }

  // ── 3. App-context rules (internal authenticated users only) ─
  if (req.app_context === "site_walk") {
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
  }

  return null;
}
