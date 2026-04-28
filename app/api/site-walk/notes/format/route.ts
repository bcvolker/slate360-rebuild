import { NextRequest } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { ok, badRequest, serverError } from "@/lib/server/api-response";
import { chatComplete, resolveChatProvider, type ChatMessage } from "@/lib/server/ai-provider";
import {
  checkAICreditLimit,
  meteringBlockedResponse,
  recordSiteWalkUsage,
} from "@/lib/site-walk/metering";

const SYSTEM_PROMPT = `You are an expert construction project manager assistant.
Take the dictated or typed field notes the user gives you and rewrite them as clear,
professional bullet points suitable for a formal site-walk report, then infer smart tags. Rules:

- Fix grammar, spelling, and punctuation. Expand obvious abbreviations.
- Keep construction terminology (rebar, drywall, HVAC, GC, RFI, etc.) intact.
- Use short, objective bullets. No conversational filler ("so basically", "you know").
- If the input describes multiple distinct issues, output one bullet per issue.
- Do NOT invent details that are not in the source text.
- Use "- " as the bullet marker.`;

const JSON_INSTRUCTIONS = `Return ONLY valid JSON with this exact shape:
{"cleanedNotes":"- formatted bullet","suggestedClassification":"Issue|Observation|Safety|Progress|Question|Other","suggestedPriority":"low|medium|high|critical"}
Classification guidance: Safety for hazards, Issue for defects/blockers, Progress for status documentation, Question for unresolved clarification, Observation for neutral field notes. Priority guidance: critical for life safety/major blockers, high for urgent trade rework, medium for normal follow-up, low for minor observations.`;

const MAX_INPUT_CHARS = 4000;

type FormatBody = {
  rawText?: unknown;
  item_id?: unknown;
  session_id?: unknown;
  project_id?: unknown;
};

/**
 * POST /api/site-walk/notes/format
 * Body: { rawText: string }
 * Response: { cleanedNotes, suggestedClassification, suggestedPriority, formattedText, provider }
 *
 * Metering is enforced before model processing so exhausted orgs are blocked
 * before any AI provider call is made.
 */
export const POST = (req: NextRequest) =>
  withAppAuth("punchwalk", req, async ({ user, admin, orgId }) => {
    if (!orgId) return badRequest("Organization required");

    const body = (await req.json().catch(() => null)) as FormatBody | null;
    const rawText = typeof body?.rawText === "string" ? body.rawText : "";
    if (!rawText.trim()) return badRequest("rawText is required");
    if (rawText.length > MAX_INPUT_CHARS) {
      return badRequest(`rawText must be ≤ ${MAX_INPUT_CHARS} characters`);
    }

    const creditCost = Math.max(1, Math.ceil(rawText.length / 2_000));
    const creditCheck = await checkAICreditLimit(admin, orgId, creditCost);
    const blocked = meteringBlockedResponse(creditCheck);
    if (blocked) return blocked;

    const cfg = resolveChatProvider();
    if (!cfg) return serverError("AI provider not configured");

    const itemId = typeof body?.item_id === "string" ? body.item_id : null;
    const sessionId = typeof body?.session_id === "string" ? body.session_id : null;
    const projectId = typeof body?.project_id === "string" ? body.project_id : null;

    await recordSiteWalkUsage(admin, {
      orgId,
      projectId,
      sessionId,
      eventType: "ai_credits_used",
      quantity: creditCost,
      unit: "credits",
      sourceTable: itemId ? "site_walk_items" : "site_walk_notes_format",
      sourceId: itemId,
      metadata: { route: "notes_format", chars: rawText.length, reserved_before_provider_call: true },
    });

    const messages: ChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `${JSON_INSTRUCTIONS}\n\nField notes:\n${rawText.trim()}` },
    ];

    try {
      const aiText = await chatComplete(cfg, messages, {
        temperature: 0.2,
        maxTokens: 600,
      });
      if (!aiText) return serverError("Empty AI response");
      const parsed = parseSmartTags(aiText);
      console.info(
        `[notes-format] org=${orgId} user=${user.id} provider=${cfg.provider} chars=${rawText.length}`,
      );
      return ok({ ...parsed, formattedText: parsed.cleanedNotes, provider: cfg.provider });
    } catch (err) {
      console.error("[notes-format]", err);
      return serverError("Failed to format notes");
    }
  });

function parseSmartTags(aiText: string) {
  const json = aiText.match(/\{[\s\S]*\}/)?.[0] ?? aiText;
  try {
    const parsed = JSON.parse(json) as Record<string, unknown>;
    const cleanedNotes = typeof parsed.cleanedNotes === "string" && parsed.cleanedNotes.trim() ? parsed.cleanedNotes.trim() : aiText.trim();
    return {
      cleanedNotes,
      suggestedClassification: normalizeClassification(parsed.suggestedClassification),
      suggestedPriority: normalizePriority(parsed.suggestedPriority),
    };
  } catch {
    return { cleanedNotes: aiText.trim(), suggestedClassification: "Observation", suggestedPriority: "medium" };
  }
}

function normalizeClassification(value: unknown) {
  const match = ["Issue", "Observation", "Safety", "Progress", "Question", "Other"].find((option) => option.toLowerCase() === String(value ?? "").toLowerCase());
  return match ?? "Observation";
}

function normalizePriority(value: unknown) {
  const normalized = String(value ?? "").toLowerCase();
  if (normalized === "low" || normalized === "medium" || normalized === "high" || normalized === "critical") return normalized;
  return "medium";
}
