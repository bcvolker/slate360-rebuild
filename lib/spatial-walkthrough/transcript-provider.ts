import "server-only";

import { transcribeAudio } from "@/lib/server/ai-provider";
import type { TranscriptPhrase, TranscriptWord } from "./audio";
import { phrasesFromText } from "./transcript";

/**
 * Vendor-agnostic STT. Spatial Walkthrough must not hard-lock to one provider.
 * Existing Site Walk path uses Groq Whisper with OpenAI fallback (`transcribeAudio`).
 *
 * Candidates (not wired): Deepgram nova-2, AssemblyAI, Rev AI, Amazon Transcribe.
 * Set SPATIAL_STT_PROVIDER=groq|openai|mock|manual
 */
export type TranscriptJob = {
  text: string;
  phrases: TranscriptPhrase[];
  words: TranscriptWord[] | null;
  provider: string;
};

export type TranscriptProvider = {
  id: string;
  transcribe: (audio: Blob, filename: string, opts?: { start?: number; end?: number; speaker?: string | null }) => Promise<TranscriptJob>;
};

export function resolveTranscriptProvider(): TranscriptProvider {
  const forced = (process.env.SPATIAL_STT_PROVIDER ?? "").trim().toLowerCase();
  if (forced === "manual") return manualProvider;
  if (forced === "mock") return mockProvider;
  if (forced === "openai" || forced === "groq") return groqOpenaiProvider(forced);
  return groqOpenaiProvider("auto");
}

function groqOpenaiProvider(id: string): TranscriptProvider {
  return {
    id: id === "auto" ? "groq-openai" : id,
    transcribe: async (audio, filename, opts) => {
      const text = await transcribeAudio(audio, filename);
      const start = opts?.start ?? 0;
      const end = opts?.end ?? Math.max(start + 1, start);
      return {
        text,
        phrases: phrasesFromText(text, start, end, opts?.speaker),
        words: null,
        provider: id === "auto" ? "groq-openai" : id,
      };
    },
  };
}

const mockProvider: TranscriptProvider = {
  id: "mock",
  transcribe: async (_audio, _filename, opts) => {
    const text = "Welcome to HouseWalk. Lobby first, then the corridor hold, then MEP.";
    const start = opts?.start ?? 0;
    const end = opts?.end ?? start + 12;
    return {
      text,
      phrases: phrasesFromText(text, start, end, opts?.speaker ?? "Brian"),
      words: null,
      provider: "mock",
    };
  },
};

const manualProvider: TranscriptProvider = {
  id: "manual",
  transcribe: async () => {
    throw new Error("manual-transcript");
  },
};

export function providerCandidates(): Array<{ id: string; notes: string }> {
  return [
    { id: "groq", notes: "Existing Slate360 Whisper path. Fast, low cost." },
    { id: "openai", notes: "Fallback already in transcribeAudio." },
    { id: "deepgram", notes: "Streaming + word timestamps. Commercial candidate." },
    { id: "assemblyai", notes: "Speaker labels. Commercial candidate." },
    { id: "amazon-transcribe", notes: "If audio stays in AWS/R2-adjacent workflows." },
    { id: "manual", notes: "Paste/edit transcript without a vendor." },
  ];
}
