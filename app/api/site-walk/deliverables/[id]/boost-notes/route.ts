/**
 * POST /api/site-walk/deliverables/[id]/boost-notes
 *
 * AI Boost for a deliverable's notes — the "verify before it goes in" flow.
 * Cleans each note-bearing block's text into professional report prose and
 * returns BOTH the before/after pairs and the proposed full content array.
 * It does NOT save: the client shows the diff, and only on the user's approval
 * PATCHes `{ content: proposedContent }` back to the deliverable. This keeps the
 * subscriber in control of what actually lands in the report.
 *
 * Computed blocks (summary/cover/voice-memo headers) are left untouched.
 */
import { NextRequest } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { ok, badRequest, notFound, serverError } from "@/lib/server/api-response";
import { chatComplete, resolveChatProvider, type ChatMessage } from "@/lib/server/ai-provider";
import {
  checkAICreditLimit,
  meteringBlockedResponse,
  recordSiteWalkUsage,
} from "@/lib/site-walk/metering";
import type { IdRouteContext } from "@/lib/types/api";

const SYSTEM_PROMPT = `You are an expert construction project manager assistant.
Rewrite the user's field notes as clear, professional prose suitable for a formal
site-walk deliverable. Rules:
- Fix grammar, spelling, and punctuation; expand obvious abbreviations.
- Keep construction terminology intact (rebar, drywall, HVAC, GC, RFI, etc.).
- Be concise and objective; remove conversational filler.
- Do NOT invent details that are not in the source text.
- Return ONLY the rewritten text, with no preamble or quotes.`;

const SKIP_BLOCK_IDS = new Set(["summary", "cover", "voice-memos"]);
const MAX_BLOCKS = 25;
const MAX_CHARS_PER_BLOCK = 2000;

type Block = Record<string, unknown>;

export const POST = (req: NextRequest, ctx: IdRouteContext) =>
  withAppAuth("punchwalk", req, async ({ admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");
    const { id } = await ctx.params;

    const { data: del } = await admin
      .from("site_walk_deliverables")
      .select("id, content, project_id, session_id")
      .eq("id", id)
      .eq("org_id", orgId)
      .maybeSingle();

    if (!del) return notFound("Deliverable not found");

    const content: Block[] = Array.isArray(del.content) ? (del.content as Block[]) : [];

    const targets = content
      .map((block, index) => ({ block, index }))
      .filter(({ block }) => {
        if (!block || typeof block !== "object") return false;
        const blockId = typeof block.id === "string" ? block.id : "";
        const notes = typeof block.notes === "string" ? block.notes : "";
        return notes.trim().length > 0 && !SKIP_BLOCK_IDS.has(blockId);
      })
      .slice(0, MAX_BLOCKS);

    if (targets.length === 0) {
      return badRequest("This deliverable has no notes to boost");
    }

    const totalChars = targets.reduce(
      (n, t) => n + Math.min(String(t.block.notes).length, MAX_CHARS_PER_BLOCK),
      0,
    );
    const creditCost = Math.max(1, Math.ceil(totalChars / 2_000));
    const creditCheck = await checkAICreditLimit(admin, orgId, creditCost);
    const blocked = meteringBlockedResponse(creditCheck);
    if (blocked) return blocked;

    const cfg = resolveChatProvider();
    if (!cfg) return serverError("AI provider not configured");

    await recordSiteWalkUsage(admin, {
      orgId,
      projectId: (del.project_id as string | null) ?? null,
      sessionId: (del.session_id as string | null) ?? null,
      eventType: "ai_credits_used",
      quantity: creditCost,
      unit: "credits",
      sourceTable: "site_walk_deliverables",
      sourceId: id,
      metadata: { route: "deliverable_boost_notes", blocks: targets.length, chars: totalChars },
    });

    const proposals: Array<{ id: string; title: string; before: string; after: string }> = [];
    const proposedContent: Block[] = content.map((block) => ({ ...block }));

    for (const { block, index } of targets) {
      const before = String(block.notes).slice(0, MAX_CHARS_PER_BLOCK);
      const messages: ChatMessage[] = [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: `Rewrite these field notes as professional report prose.\n\nNotes:\n${before}` },
      ];

      let after = before;
      try {
        const out = await chatComplete(cfg, messages, { temperature: 0.2, maxTokens: 500 });
        if (out && out.trim()) after = out.trim();
      } catch (err) {
        console.error("[deliverable-boost-notes]", err);
      }

      proposals.push({
        id: typeof block.id === "string" ? block.id : String(index),
        title: typeof block.title === "string" ? block.title : "",
        before,
        after,
      });
      proposedContent[index] = { ...proposedContent[index], notes: after };
    }

    return ok({ proposals, proposedContent });
  });
