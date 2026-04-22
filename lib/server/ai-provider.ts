/**
 * Thin wrapper around Groq's OpenAI-compatible API.
 *
 * Why Groq:
 *   - llama-3.1-8b-instant: ~10× cheaper than gpt-4o-mini, ~5× lower latency.
 *     Plenty of capability for "rewrite these dictated notes as clean bullets".
 *   - whisper-large-v3-turbo: ~$0.04/hr — far below OpenAI Whisper.
 *
 * Falls back to OpenAI when GROQ_API_KEY is missing but OPENAI_API_KEY exists,
 * so dev environments without Groq still work.
 */

const GROQ_BASE = "https://api.groq.com/openai/v1";
const OPENAI_BASE = "https://api.openai.com/v1";

export type ChatProvider = "groq" | "openai";

export interface ChatProviderConfig {
  provider: ChatProvider;
  baseUrl: string;
  apiKey: string;
  chatModel: string;
}

export function resolveChatProvider(): ChatProviderConfig | null {
  const groqKey = process.env.GROQ_API_KEY;
  if (groqKey) {
    return {
      provider: "groq",
      baseUrl: GROQ_BASE,
      apiKey: groqKey,
      chatModel: process.env.GROQ_CHAT_MODEL ?? "llama-3.1-8b-instant",
    };
  }
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) {
    return {
      provider: "openai",
      baseUrl: OPENAI_BASE,
      apiKey: openaiKey,
      chatModel: process.env.OPENAI_CHAT_MODEL ?? "gpt-4o-mini",
    };
  }
  return null;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export async function chatComplete(
  cfg: ChatProviderConfig,
  messages: ChatMessage[],
  opts: { temperature?: number; maxTokens?: number } = {},
): Promise<string> {
  const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify({
      model: cfg.chatModel,
      messages,
      temperature: opts.temperature ?? 0.2,
      max_tokens: opts.maxTokens ?? 600,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`chat ${cfg.provider} ${res.status}: ${text.slice(0, 200)}`);
  }
  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return json.choices?.[0]?.message?.content?.trim() ?? "";
}

/** Whisper transcription via Groq (preferred) or OpenAI fallback. */
export async function transcribeAudio(audio: Blob, filename = "note.webm"): Promise<string> {
  const groqKey = process.env.GROQ_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;

  let baseUrl: string;
  let apiKey: string;
  let model: string;

  if (groqKey) {
    baseUrl = GROQ_BASE;
    apiKey = groqKey;
    model = process.env.GROQ_WHISPER_MODEL ?? "whisper-large-v3-turbo";
  } else if (openaiKey) {
    baseUrl = OPENAI_BASE;
    apiKey = openaiKey;
    model = "whisper-1";
  } else {
    throw new Error("no-stt-provider");
  }

  const form = new FormData();
  form.set("file", audio, filename);
  form.set("model", model);
  form.set("response_format", "json");
  form.set("language", "en");

  const res = await fetch(`${baseUrl}/audio/transcriptions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`transcribe ${res.status}: ${text.slice(0, 200)}`);
  }
  const json = (await res.json()) as { text?: string };
  return json.text?.trim() ?? "";
}
