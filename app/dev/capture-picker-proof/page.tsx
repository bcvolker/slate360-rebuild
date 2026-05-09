"use client";

import { useRef, useState, useEffect, useCallback } from "react";

/* ─── Types ─── */
interface PickerResult {
  button: "A-direct" | "B-effect";
  tapTs: number;
  effectTs?: number;
  pickerOpenTs?: number;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  error?: string;
}

/* ─── Device context (mirrors production useDeviceContext) ─── */
function useDeviceDiag() {
  const [mobile, setMobile] = useState(false);
  const [ua, setUa] = useState("");
  useEffect(() => {
    setUa(navigator.userAgent);
    const mq =
      window.matchMedia("(pointer: coarse)").matches &&
      window.matchMedia("(hover: none)").matches &&
      window.matchMedia("(max-width: 767px)").matches;
    setMobile(mq);
  }, []);
  return { mobile, ua };
}

/* ─── Page ─── */
export default function CapturePickerProofPage() {
  const directCameraRef = useRef<HTMLInputElement>(null);
  const directUploadRef = useRef<HTMLInputElement>(null);
  const effectCameraRef = useRef<HTMLInputElement>(null);
  const effectUploadRef = useRef<HTMLInputElement>(null);

  const [results, setResults] = useState<PickerResult[]>([]);
  const [effectPending, setEffectPending] = useState<{
    input: "camera" | "upload";
    tapTs: number;
  } | null>(null);

  const { mobile, ua } = useDeviceDiag();

  const addResult = useCallback((r: PickerResult) => {
    setResults((prev) => [r, ...prev].slice(0, 20));
  }, []);

  /* ─── Button A: Direct picker (synchronous .click() in tap handler) ─── */
  function handleDirectCamera() {
    const tapTs = Date.now();
    try {
      directCameraRef.current!.value = "";
      directCameraRef.current!.click();
      addResult({ button: "A-direct", tapTs, pickerOpenTs: Date.now() });
    } catch (err) {
      addResult({
        button: "A-direct",
        tapTs,
        error: String(err),
      });
    }
  }

  function handleDirectUpload() {
    const tapTs = Date.now();
    try {
      directUploadRef.current!.value = "";
      directUploadRef.current!.click();
      addResult({ button: "A-direct", tapTs, pickerOpenTs: Date.now() });
    } catch (err) {
      addResult({
        button: "A-direct",
        tapTs,
        error: String(err),
      });
    }
  }

  /* ─── Button B: Effect picker (setState → useEffect → .click()) ─── */
  function handleEffectCamera() {
    setEffectPending({ input: "camera", tapTs: Date.now() });
  }

  function handleEffectUpload() {
    setEffectPending({ input: "upload", tapTs: Date.now() });
  }

  useEffect(() => {
    if (!effectPending) return;
    const effectTs = Date.now();
    const ref =
      effectPending.input === "camera" ? effectCameraRef : effectUploadRef;
    try {
      ref.current!.value = "";
      ref.current!.click();
      addResult({
        button: "B-effect",
        tapTs: effectPending.tapTs,
        effectTs,
        pickerOpenTs: Date.now(),
      });
    } catch (err) {
      addResult({
        button: "B-effect",
        tapTs: effectPending.tapTs,
        effectTs,
        error: String(err),
      });
    }
    setEffectPending(null);
  }, [effectPending, addResult]);

  /* ─── Shared file change handler ─── */
  function handleFileChange(
    e: React.ChangeEvent<HTMLInputElement>,
    button: "A-direct" | "B-effect"
  ) {
    const file = e.target.files?.[0];
    if (file) {
      setResults((prev) => {
        const last = prev.find((r) => r.button === button && !r.fileName);
        if (!last) return prev;
        return prev.map((r) =>
          r === last
            ? { ...r, fileName: file.name, fileSize: file.size, fileType: file.type }
            : r
        );
      });
    }
  }

  return (
    <div className="min-h-[100dvh] bg-[#0B0F15] p-4 text-white font-sans">
      <h1 className="text-xl font-bold text-amber-400 mb-1">
        Capture Picker Proof
      </h1>
      <p className="text-xs text-white/50 mb-4">
        Dev-only route — tests whether mobile Safari allows .click() from
        synchronous tap handlers vs React useEffect deferred handlers.
      </p>

      {/* Device info */}
      <div className="rounded-lg border border-white/10 bg-white/5 p-3 mb-4 text-xs">
        <div>
          <span className="text-white/50">Device: </span>
          <span className={mobile ? "text-red-400" : "text-green-400"}>
            {mobile ? "MOBILE" : "DESKTOP"}
          </span>
        </div>
        <div className="truncate">
          <span className="text-white/50">UA: </span>
          <span className="text-white/70">{ua || "loading…"}</span>
        </div>
      </div>

      {/* Button A: Direct */}
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-green-400 mb-2">
          Button A — Direct Picker (sync .click in onClick)
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleDirectCamera}
            className="flex-1 rounded-lg bg-green-600 px-4 py-3 text-sm font-medium active:bg-green-700 min-h-[48px]"
          >
            A: Camera (direct)
          </button>
          <button
            type="button"
            onClick={handleDirectUpload}
            className="flex-1 rounded-lg bg-green-700 px-4 py-3 text-sm font-medium active:bg-green-800 min-h-[48px]"
          >
            A: Upload (direct)
          </button>
        </div>
      </div>

      {/* Button B: Effect */}
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-red-400 mb-2">
          Button B — Effect Picker (setState → useEffect → .click)
        </h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleEffectCamera}
            className="flex-1 rounded-lg bg-red-600 px-4 py-3 text-sm font-medium active:bg-red-700 min-h-[48px]"
          >
            B: Camera (effect)
          </button>
          <button
            type="button"
            onClick={handleEffectUpload}
            className="flex-1 rounded-lg bg-red-700 px-4 py-3 text-sm font-medium active:bg-red-800 min-h-[48px]"
          >
            B: Upload (effect)
          </button>
        </div>
      </div>

      {/* Hidden file inputs */}
      <input
        ref={directCameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFileChange(e, "A-direct")}
      />
      <input
        ref={directUploadRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFileChange(e, "A-direct")}
      />
      <input
        ref={effectCameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFileChange(e, "B-effect")}
      />
      <input
        ref={effectUploadRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFileChange(e, "B-effect")}
      />

      {/* Results log */}
      <div className="mt-4">
        <h2 className="text-sm font-semibold text-amber-400 mb-2">
          Results ({results.length})
        </h2>
        {results.length === 0 && (
          <p className="text-xs text-white/40">Tap a button to start testing…</p>
        )}
        <div className="space-y-2">
          {results.map((r, i) => (
            <div
              key={`${r.tapTs}-${i}`}
              className={`rounded-lg border p-3 text-xs ${
                r.button === "A-direct"
                  ? "border-green-500/30 bg-green-900/20"
                  : "border-red-500/30 bg-red-900/20"
              }`}
            >
              <div className="flex justify-between mb-1">
                <span className="font-mono font-bold">
                  {r.button === "A-direct" ? "✅ A-DIRECT" : "⚠️ B-EFFECT"}
                </span>
                <span className="text-white/40">
                  {new Date(r.tapTs).toLocaleTimeString()}
                </span>
              </div>
              {r.effectTs && (
                <div>
                  <span className="text-white/50">Effect delay: </span>
                  <span className="text-amber-300 font-mono">
                    {r.effectTs - r.tapTs}ms
                  </span>
                </div>
              )}
              {r.pickerOpenTs && (
                <div>
                  <span className="text-white/50">Picker .click() delay: </span>
                  <span className="font-mono">
                    {r.pickerOpenTs - r.tapTs}ms
                  </span>
                </div>
              )}
              {r.fileName && (
                <div className="mt-1 text-green-300">
                  📷 {r.fileName} ({Math.round((r.fileSize ?? 0) / 1024)}KB,{" "}
                  {r.fileType})
                </div>
              )}
              {r.error && (
                <div className="mt-1 text-red-300">❌ {r.error}</div>
              )}
              {!r.fileName && !r.error && (
                <div className="mt-1 text-white/30">
                  (picker opened — waiting for file selection or cancel)
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Hypothesis */}
      <div className="mt-6 rounded-lg border border-amber-500/20 bg-amber-900/10 p-3 text-xs text-amber-200/80">
        <p className="font-bold text-amber-400 mb-1">Expected Result:</p>
        <p>
          <strong>Button A (green)</strong> should open the native camera or
          gallery picker on all devices including iOS Safari, because .click()
          runs synchronously inside the tap handler — preserving the
          user-activation gesture token.
        </p>
        <p className="mt-1">
          <strong>Button B (red)</strong> may fail silently on iOS Safari/mobile
          because .click() runs inside a React useEffect (deferred from the
          original tap) — the browser no longer considers this user-activated.
        </p>
        <p className="mt-1 text-white/50">
          If Button A works and Button B fails on your phone, the production
          capture chain (which uses the B pattern) is confirmed broken.
        </p>
      </div>
    </div>
  );
}
