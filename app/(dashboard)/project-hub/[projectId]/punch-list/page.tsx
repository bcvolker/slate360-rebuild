"use client";

import { FormEvent, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import { Loader2, Mic, MicOff } from "lucide-react";

export default function PunchListPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params?.projectId;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
  } = useSpeechRecognition();

  useEffect(() => {
    if (!transcript) return;
    setDescription(transcript);
  }, [transcript]);

  const onToggleDictation = async () => {
    setStatus(null);
    if (!browserSupportsSpeechRecognition) {
      setStatus("Speech recognition is not supported in this browser.");
      return;
    }

    if (listening) {
      await SpeechRecognition.stopListening();
      return;
    }

    resetTranscript();
    await SpeechRecognition.startListening({ continuous: true, language: "en-US" });
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!projectId) {
      setStatus("Project context missing.");
      return;
    }
    setSaving(true);
    setStatus(null);

    if (listening) {
      await SpeechRecognition.stopListening();
    }

    try {
      const res = await fetch(`/api/projects/${projectId}/records`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind: "PunchList",
          title: title.trim() || `punch-${new Date().toISOString().slice(0, 10)}`,
          content: [
            `Priority: ${priority}`,
            "",
            description.trim(),
          ].join("\n"),
        }),
      });

      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(payload?.error ?? "Unable to save punch item");
      }

      setStatus("Punch item saved to project folders.");
      setTitle("");
      setDescription("");
      resetTranscript();
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Unable to save punch item.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-xl">
      <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-base font-black text-gray-900">Punch List Item</h2>
        <p className="mt-1 text-xs text-gray-500">Mobile-first issue capture with voice dictation.</p>

        <form onSubmit={onSubmit} className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">Title</label>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. Rework drywall corner"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <label className="block text-xs font-semibold text-gray-600">Description</label>
              <button
                type="button"
                onClick={onToggleDictation}
                className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold ${
                  listening
                    ? "border-red-200 bg-red-50 text-red-700"
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                {listening ? <MicOff size={12} /> : <Mic size={12} />}
                {listening ? "Stop Dictation" : "Dictate Note"}
              </button>
            </div>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={5}
              placeholder="Describe deficiency and required corrective action"
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm resize-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">Priority</label>
            <select
              value={priority}
              onChange={(event) => setPriority(event.target.value)}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="w-full rounded-xl px-3 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            style={{ backgroundColor: "#FF4D00" }}
          >
            {saving ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" /> Saving…
              </span>
            ) : (
              "Save Punch Item"
            )}
          </button>
        </form>

        {status ? (
          <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-700">{status}</div>
        ) : null}
      </div>
    </div>
  );
}
