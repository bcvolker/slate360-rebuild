"use client";

import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { LiDARCapture } from "@/src/plugins/LiDARCapture";
import { twinAccent } from "@/lib/digital-twin/twin-accent";
import { cn } from "@/lib/utils";

/**
 * Phone-only rescue for a stuck Twin upload: continue sending files still on
 * this device, and a visible Sign out. Native methods need the new TestFlight
 * build; Sign out works on the current web bundle.
 */
export function TwinPhoneRescueBar() {
  const native = Capacitor.isNativePlatform();
  const [pending, setPending] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    if (!native) return;
    void LiDARCapture.pendingUploadStatus()
      .then((status) => setPending(status.pending))
      .catch(() => setPending(null));
  }, [native]);

  async function continueUpload() {
    setBusy(true);
    setNote(null);
    try {
      const result = await LiDARCapture.resumePendingUploads();
      setPending(result.pending);
      if (result.signedIn === false) {
        setNote("Sign in first, then tap Continue upload again.");
      } else if ((result.resumed ?? 0) > 0) {
        setNote(`Continuing ${result.resumed} file${result.resumed === 1 ? "" : "s"} from this phone. Keep the app open on Wi-Fi.`);
      } else if ((result.sourceMissing ?? 0) > 0) {
        setNote("The leftover photos are no longer on this phone. LiDAR and the photos that already finished are already in the cloud.");
      } else {
        setNote("Nothing left on this phone to send.");
      }
    } catch {
      setNote("This TestFlight build cannot retry uploads yet. Install the new build, then tap Continue upload. Do not delete the app.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mb-5 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-zinc-400">This phone</p>
      <p className="mt-1 text-sm text-zinc-200">
        {pending && pending > 0
          ? `${pending} scan file${pending === 1 ? "" : "s"} still waiting to finish sending.`
          : "If a scan is stuck on Uploading, continue it here. Do not delete the app."}
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          disabled={busy || !native}
          onClick={() => void continueUpload()}
          className={cn(twinAccent.button, "min-h-12 flex-1")}
        >
          {busy ? "Starting upload…" : "Continue upload"}
        </button>
        <a href="/auth/logout" className={cn(twinAccent.button, "flex min-h-12 flex-1 items-center justify-center")}>
          Sign out
        </a>
      </div>
      {!native ? (
        <p className="mt-2 text-[11px] text-zinc-500">Continue upload works in the iPhone app after the new TestFlight build.</p>
      ) : null}
      {note ? <p className="mt-2 text-[12px] text-zinc-300">{note}</p> : null}
    </section>
  );
}
