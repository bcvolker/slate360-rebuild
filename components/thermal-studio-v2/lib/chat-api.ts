import type { ThermalV2ChatMessage, ThermalV2ChatProposal } from "@/components/thermal-studio-v2/types";

export type ChatSendResult = { reply: string; proposal: ThermalV2ChatProposal | null } | { error: string };

/** Hydrates the drawer with this capture's persisted thread (survives reload). */
export async function fetchAnalystChatThread(sessionId: string, captureId: string): Promise<ThermalV2ChatMessage[]> {
  try {
    const res = await fetch(`/api/ops/thermal/sessions/${sessionId}/chat?capture_id=${encodeURIComponent(captureId)}`);
    if (!res.ok) return [];
    const json = await res.json();
    return Array.isArray(json?.thread) ? (json.thread as ThermalV2ChatMessage[]) : [];
  } catch {
    return [];
  }
}

/** S6.6 Analyst chat: one grounded Q&A turn against the active capture's findings. */
export async function sendAnalystChatMessage(sessionId: string, captureId: string, message: string): Promise<ChatSendResult> {
  try {
    const res = await fetch(`/api/ops/thermal/sessions/${sessionId}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ capture_id: captureId, message }),
    });
    const json = await res.json();
    if (!res.ok || json?.error) return { error: json?.error ?? "The analyst couldn't respond right now." };
    return { reply: json.reply as string, proposal: (json.proposal as ThermalV2ChatProposal | null) ?? null };
  } catch {
    return { error: "Network error — message not sent." };
  }
}
