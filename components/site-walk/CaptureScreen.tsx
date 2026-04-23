"use client";

import { useState, useRef, useEffect } from "react";
import { Camera, Mic, MessageSquare, MapPin, X, ChevronDown, ChevronUp, Sparkles, Loader2 } from "lucide-react";

/**
 * CaptureScreen — Premium field UI for the Slate360 Site Walk capture experience.
 *
 * Features:
 *   - Full-bleed camera viewfinder with focus bracket overlay
 *   - Dark isolated top bar (sync status + item count badge)
 *   - Floating pill-shaped action bar with 4 thumb-friendly icons
 *   - Interactive bottom sheet (50% of screen) for capture form
 *   - Light/premium theme inside sheet with AI Format button
 *   - Collapsed "Advanced Details" accordion
 *
 * All transitions use duration-200, premium focus rings, and smooth micro-interactions.
 */

interface CaptureScreenProps {
  siteName: string;
  itemCount?: number;
  isSyncing?: boolean;
  onClose: () => void;
}

export function CaptureScreen({
  siteName,
  itemCount = 0,
  isSyncing = false,
  onClose,
}: CaptureScreenProps) {
  const [sheetOpen, setSheetOpen] = useState(false);
  const [activeCapture, setActiveCapture] = useState<"camera" | "mic" | "text" | "pin" | null>(null);
  const [formData, setFormData] = useState({ title: "", notes: "" });
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  // When a capture type is clicked, open the sheet if it isn't already
  const handleCaptureClick = (type: "camera" | "mic" | "text" | "pin") => {
    setActiveCapture(type);
    if (!sheetOpen) {
      setSheetOpen(true);
    }
  };

  const handleSave = async () => {
    if (!formData.title.trim()) return;
    setSaving(true);
    try {
      // Simulate save (would call API)
      await new Promise((resolve) => setTimeout(resolve, 1200));
      console.log("[v0] Saved:", formData);
      setFormData({ title: "", notes: "" });
      setSheetOpen(false);
      setActiveCapture(null);
    } finally {
      setSaving(false);
    }
  };

  const sheetHeight = "50vh";

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-slate-950">
      {/* ────────────────────────────────────────────────────────────────
          Top Bar — Dark Isolated Theme (Cobalt #0B0F15)
          ──────────────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between gap-3 px-4 py-3 bg-[#0B0F15] border-b border-white/10 shrink-0">
        {/* Left: Close Button */}
        <button
          onClick={onClose}
          aria-label="Close capture"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full text-white transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-blue-500/50"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Center: Site Name */}
        <div className="flex-1 text-center">
          <p className="truncate text-sm font-semibold text-white">
            {siteName}
          </p>
        </div>

        {/* Right: Sync Status + Item Badge */}
        <div className="flex items-center gap-2">
          {isSyncing && (
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
          )}
          <div className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-white/10 text-xs font-medium text-slate-300">
            {itemCount}
          </div>
        </div>
      </header>

      {/* ────────────────────────────────────────────────────────────────
          Camera Viewfinder — Simulated with Dark Gradient
          ──────────────────────────────────────────────────────────────── */}
      <div className="relative flex-1 bg-gradient-to-b from-slate-900 to-black overflow-hidden">
        {/* Focus Bracket Overlay */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative w-48 h-48">
            {/* Corner brackets */}
            <div className="absolute inset-0 border border-white/20" />
            <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-white/40" />
            <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-white/40" />
            <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-white/40" />
            <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-white/40" />
            {/* Center dot */}
            <div className="absolute top-1/2 left-1/2 w-1 h-1 bg-white/20 rounded-full transform -translate-x-1/2 -translate-y-1/2" />
          </div>
        </div>

        {/* GPS Indicator (top-left corner) */}
        <div className="absolute left-4 top-4 flex items-center gap-1.5 rounded-full bg-black/50 backdrop-blur px-3 py-1.5 text-xs text-white">
          <MapPin className="h-3.5 w-3.5 text-blue-400" />
          <span>GPS Active</span>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────
          Floating Pill Action Bar — Above Bottom Sheet
          ──────────────────────────────────────────────────────────────── */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-30 pointer-events-auto">
        <div className="flex items-center gap-3 rounded-full bg-slate-900/80 backdrop-blur-md border border-white/10 px-2 py-3 shadow-lg">
          {/* Camera (Primary, Larger) */}
          <button
            onClick={() => handleCaptureClick("camera")}
            aria-label="Capture photo"
            className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-b from-blue-500 to-blue-600 text-white transition-all duration-200 hover:from-blue-600 hover:to-blue-700 active:scale-95 ring-2 ring-blue-500/50 focus-visible:ring-2 focus-visible:ring-blue-400/50 shadow-sm"
          >
            <Camera className="h-6 w-6" />
          </button>

          {/* Microphone */}
          <button
            onClick={() => handleCaptureClick("mic")}
            aria-label="Record voice note"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-200 transition-colors duration-200 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-blue-500/50"
          >
            <Mic className="h-5 w-5" />
          </button>

          {/* Text Note */}
          <button
            onClick={() => handleCaptureClick("text")}
            aria-label="Add text note"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-200 transition-colors duration-200 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-blue-500/50"
          >
            <MessageSquare className="h-5 w-5" />
          </button>

          {/* Location Pin */}
          <button
            onClick={() => handleCaptureClick("pin")}
            aria-label="Mark location"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-200 transition-colors duration-200 hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-blue-500/50"
          >
            <MapPin className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────────
          Bottom Sheet Overlay (50% of screen, light theme)
          ──────────────────────────────────────────────────────────────── */}
      {sheetOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 backdrop-blur-sm transition-opacity duration-200"
          onClick={() => setSheetOpen(false)}
          aria-hidden="true"
        />
      )}

      <div
        className={`fixed bottom-0 left-0 right-0 z-40 bg-white rounded-t-3xl shadow-2xl transition-all duration-300 ease-out ${
          sheetOpen ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ height: sheetHeight }}
        ref={formRef}
      >
        {/* Sheet Content */}
        <div className="flex h-full flex-col overflow-hidden">
          {/* Drag Handle + Close */}
          <div className="flex items-center justify-between px-6 pt-4 pb-2 border-b border-gray-100">
            <div className="w-12 h-1 bg-gray-200 rounded-full" />
            <button
              onClick={() => setSheetOpen(false)}
              aria-label="Close sheet"
              className="p-2 rounded-full text-gray-600 hover:bg-gray-100 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500/50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Scrollable Form */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            {/* Title Input */}
            <div>
              <input
                type="text"
                placeholder="Title (e.g., Cracked drywall)"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                className="w-full text-base font-medium text-gray-900 placeholder:text-gray-400 border-0 bg-transparent focus:outline-none"
              />
            </div>

            {/* Notes Textarea */}
            <div>
              <textarea
                placeholder="Add notes..."
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                rows={4}
                className="w-full text-sm text-gray-800 placeholder:text-gray-400 border border-gray-200 rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all"
              />
            </div>

            {/* Format with AI Button */}
            <button
              type="button"
              className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-lg text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors duration-200"
            >
              <Sparkles className="h-4 w-4" />
              Format with AI
            </button>

            {/* Advanced Details Accordion */}
            <div className="border-t border-gray-200 pt-3">
              <button
                onClick={() => setAdvancedOpen(!advancedOpen)}
                className="w-full flex items-center justify-between py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
              >
                Advanced Details
                {advancedOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </button>
              {advancedOpen && (
                <div className="mt-3 space-y-2 text-xs text-gray-600">
                  <p>GPS: 40.7128° N, 74.0060° W</p>
                  <p>Weather: Clear, 72°F</p>
                  <p>Timestamp: {new Date().toLocaleString()}</p>
                </div>
              )}
            </div>
          </div>

          {/* Save Button */}
          <div className="border-t border-gray-100 px-6 py-4">
            <button
              onClick={handleSave}
              disabled={saving || !formData.title.trim()}
              className="w-full py-3 rounded-full bg-blue-600 text-white font-semibold text-sm transition-all duration-200 hover:bg-blue-700 focus-visible:ring-2 focus-visible:ring-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                `Save to ${siteName}`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
