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
professional bullet points suitable for a formal site-walk report. Rules:

- Fix grammar, spelling, and punctuation. Expand obvious abbreviations.
- Keep construction terminology (rebar, drywall, HVAC, GC, RFI, etc.) intact.
- Use short, objective bullets. No conversational filler ("so basically", "you know").
- If the input describes multiple distinct issues, output one bullet per issue.
- Do NOT invent details that are not in the source text.
- Output ONLY the bullets — no preamble, no closing remarks.
- Use "- " as the bullet marker.`;

const MAX_INPUT_CHARS = 4000;

/**
 * POST /api/site-walk/notes/format
 * Body: { rawText: string }
 * Response: { formattedText: string, provider: "groq" | "openai" }
 *
 * TODO PR #27g.x: enforce per-org daily quota via ai_usage table.
 */
export const POST = (req: NextRequest) =>
  withAppAuth("punchwalk", req, async ({ user, admin, orgId }) => {
    if (!orgId) return badRequest("Organization required");

    const body = await req.json().catch(() => null);
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

    const messages: ChatMessage[] = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: rawText.trim() },
    ];

    try {
      const formattedText = await chatComplete(cfg, messages, {
        temperature: 0.2,
        maxTokens: 600,
      });
      if (!formattedText) return serverError("Empty AI response");
      await recordSiteWalkUsage(admin, {
        orgId,
        eventType: "ai_credits_used",
        quantity: creditCost,
        unit: "credits",
        sourceTable: "site_walk_notes_format",
        metadata: { provider: cfg.provider, chars: rawText.length },
      });
      console.info(
        `[notes-format] org=${orgId} user=${user.id} provider=${cfg.provider} chars=${rawText.length}`,
      );
      return ok({ formattedText, provider: cfg.provider });
    } catch (err) {
      console.error("[notes-format]", err);
      return serverError("Failed to format notes");
    }
  });
