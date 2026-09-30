import type { TranscriptPhrase, TranscriptRecord, TranscriptWord } from "./audio";

export function parsePhrases(raw: unknown): TranscriptPhrase[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const o = item as Record<string, unknown>;
    const start = Number(o.start);
    const end = Number(o.end);
    const text = typeof o.text === "string" ? o.text.trim() : "";
    if (!(end > start) || !text) return [];
    return [{
      start,
      end,
      text,
      speaker: typeof o.speaker === "string" ? o.speaker : null,
    }];
  });
}

export function parseWords(raw: unknown): TranscriptWord[] | null {
  if (!Array.isArray(raw)) return null;
  const words = raw.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const o = item as Record<string, unknown>;
    const start = Number(o.start);
    const end = Number(o.end);
    const word = typeof o.word === "string" ? o.word : "";
    if (!(end >= start) || !word) return [];
    return [{ start, end, word, speaker: typeof o.speaker === "string" ? o.speaker : null }];
  });
  return words.length ? words : null;
}

export function toTranscript(row: Record<string, unknown>): TranscriptRecord {
  return {
    id: String(row.id),
    walkthroughId: String(row.walkthrough_id ?? row.walkthroughId),
    narrationSegmentId: row.narration_segment_id || row.narrationSegmentId
      ? String(row.narration_segment_id ?? row.narrationSegmentId)
      : null,
    voiceNoteId: row.voice_note_id || row.voiceNoteId ? String(row.voice_note_id ?? row.voiceNoteId) : null,
    provider: String(row.provider ?? "manual"),
    language: typeof row.language === "string" ? row.language : "en",
    fullText: typeof row.full_text === "string" ? row.full_text : typeof row.fullText === "string" ? row.fullText : "",
    phrases: parsePhrases(row.phrases),
    words: parseWords(row.words),
  };
}

export function phrasesFromText(text: string, start: number, end: number, speaker?: string | null): TranscriptPhrase[] {
  const trimmed = text.trim();
  if (!trimmed) return [];
  const parts = trimmed.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (parts.length <= 1) return [{ start, end, text: trimmed, speaker: speaker ?? null }];
  const span = Math.max(0.2, end - start);
  const slice = span / parts.length;
  return parts.map((part, i) => ({
    start: start + i * slice,
    end: i === parts.length - 1 ? end : start + (i + 1) * slice,
    text: part,
    speaker: speaker ?? null,
  }));
}

export function searchTranscript(
  records: TranscriptRecord[],
  query: string,
): Array<{ transcriptId: string; phrase: TranscriptPhrase; index: number }> {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const hits: Array<{ transcriptId: string; phrase: TranscriptPhrase; index: number }> = [];
  for (const rec of records) {
    rec.phrases.forEach((phrase, index) => {
      if (phrase.text.toLowerCase().includes(q)) hits.push({ transcriptId: rec.id, phrase, index });
    });
  }
  return hits;
}

export function activePhrase(phrases: TranscriptPhrase[], t: number): TranscriptPhrase | null {
  return phrases.find((p) => t >= p.start && t < p.end) ?? null;
}

export function allPhrases(records: TranscriptRecord[]): TranscriptPhrase[] {
  return records.flatMap((r) => r.phrases).sort((a, b) => a.start - b.start);
}
