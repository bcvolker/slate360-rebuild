"use client";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-6 text-center">
      <div className="mb-6 text-5xl">📡</div>
      <h1 className="mb-2 text-2xl font-bold text-white">You&apos;re offline</h1>
      <p className="mb-8 max-w-sm text-sm text-zinc-400">
        Slate360 needs an internet connection. Any pending changes will sync
        automatically when you reconnect.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="rounded-lg bg-amber-500 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-600"
      >
        Try again
      </button>
    </div>
  );
}
