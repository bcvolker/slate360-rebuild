import "server-only";
import { resolveChatProvider } from "@/lib/server/ai-provider";
import { DesignPlanSchema, type DesignPlan } from "./action-schema";

/**
 * Turn a natural-language design prompt into a validated DesignPlan.
 * Uses the existing Groq provider (OpenAI-compatible JSON mode) with a strict
 * system prompt + Zod validation + one repair round-trip. A larger model is
 * preferred for structured output than the note-cleanup default.
 */

export interface PromptContext {
  sourceFormat: string | null; // 'spz' | 'glb' | ...
  viewerKind: string | null; // 'splat' | 'model'
  sessionTitle: string;
  parentActions?: unknown[]; // cumulative actions from the variant being iterated
  referenceImageCount?: number; // drag-dropped inspiration images attached to this prompt
}

const SCHEMA_HINT = `Return ONLY a JSON object with this shape:
{
  "version": "1",
  "summary": string (<=280 chars),
  "confidence": number 0..1,
  "actions": Action[] (max 24),
  "build_steps"?: { "order": int, "action": Action, "pause_ms": int 0..10000 }[],
  "needs_generation"?: { "kind": "image_to_3d"|"text_to_3d"|"image_render", "prompt": string, "reference_image_key"?: string, "placeholder_id": string }[]
}
Action is one of (discriminated by "op"):
- { "op":"clear_scene", "scope":"all"|"agent_spawned_only" }
- { "op":"swap_material", "target":string, "material":string, "color_hex"?:string, "finish"?:"matte"|"gloss"|"metallic" }
- { "op":"recolor", "target":string, "color_hex":string }
- { "op":"remove_object", "target":string }
- { "op":"spawn_furniture", "asset_id":string, "position"?:[x,y,z], "rotation"?:[x,y,z], "scale"?:number }
- { "op":"import_glb", "url":string, "label"?:string, "position"?:[x,y,z], "rotation"?:[x,y,z], "scale"?:number }
- { "op":"move_object", "target":string, "delta":[x,y,z] }
- { "op":"adjust_lighting", "preset"?:"daylight"|"dusk"|"interior"|"studio"|"overcast", "intensity"?:0..2, "color_temp_k"?:number, "sun_elevation"?:number }
- { "op":"set_environment", "sky"?:string, "ground"?:string }
- { "op":"set_camera", "preset"?:"overview"|"interior"|"elevation"|"walkthrough", "position"?:[x,y,z], "look_at"?:[x,y,z] }
- { "op":"annotate", "target":string, "note":string }

Rules:
- "target" is a natural-language region label (e.g. "floor", "walls", "kitchen island"), NOT a UE object path.
- For new objects the user describes that aren't in a known library, add a needs_generation entry and reference it from an import_glb whose url is the placeholder_id.
- When the prompt asks to BUILD or assemble something, emit build_steps (sequenced) so it animates step-by-step.`;

function systemPrompt(ctx: PromptContext): string {
  return [
    "You are a 3D design action parser for an Unreal Engine design studio.",
    `Scene: "${ctx.sessionTitle}", source format ${ctx.sourceFormat ?? "unknown"} (${ctx.viewerKind ?? "?"}).`,
    ctx.parentActions && ctx.parentActions.length
      ? `Prior cumulative actions on this variant: ${JSON.stringify(ctx.parentActions).slice(0, 1500)}`
      : "No prior actions; this is the first edit.",
    ctx.referenceImageCount && ctx.referenceImageCount > 0
      ? `The user attached ${ctx.referenceImageCount} reference image(s) for style/inspiration. Treat objects the user wants added that match those references as needs_generation entries (kind "image_to_3d") and reference them from import_glb steps.`
      : "",
    SCHEMA_HINT,
    "Output strictly valid JSON. No commentary outside the JSON object.",
  ].join("\n\n");
}

function pickModel(): { model: string; baseUrl: string; apiKey: string } | null {
  const cfg = resolveChatProvider();
  if (!cfg) return null;
  // Prefer a larger model for structured output than the note-cleanup default.
  const model =
    process.env.DESIGN_STUDIO_CHAT_MODEL ??
    (cfg.provider === "groq" ? "llama-3.3-70b-versatile" : cfg.chatModel);
  return { model, baseUrl: cfg.baseUrl, apiKey: cfg.apiKey };
}

async function callJson(
  m: { model: string; baseUrl: string; apiKey: string },
  messages: { role: string; content: string }[],
): Promise<string> {
  const res = await fetch(`${m.baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${m.apiKey}` },
    body: JSON.stringify({
      model: m.model,
      messages,
      temperature: 0.1,
      max_tokens: 1500,
      response_format: { type: "json_object" },
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`design chat ${res.status}: ${text.slice(0, 200)}`);
  }
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  return json.choices?.[0]?.message?.content?.trim() ?? "";
}

export interface InterpretResult {
  plan: DesignPlan;
  modelName: string;
  raw: string;
}

export async function interpretDesignPrompt(
  promptText: string,
  ctx: PromptContext,
): Promise<InterpretResult> {
  const m = pickModel();
  if (!m) throw new Error("No AI provider configured (GROQ_API_KEY or OPENAI_API_KEY).");

  const messages = [
    { role: "system", content: systemPrompt(ctx) },
    { role: "user", content: promptText },
  ];

  let raw = await callJson(m, messages);
  let parsed = DesignPlanSchema.safeParse(safeJson(raw));

  if (!parsed.success) {
    // One repair round-trip with the validation errors fed back.
    messages.push({ role: "assistant", content: raw });
    messages.push({
      role: "user",
      content: `That did not validate. Errors: ${JSON.stringify(parsed.error.issues).slice(0, 800)}. Return corrected JSON only.`,
    });
    raw = await callJson(m, messages);
    parsed = DesignPlanSchema.safeParse(safeJson(raw));
    if (!parsed.success) {
      throw new Error(`Could not produce a valid design plan: ${parsed.error.issues[0]?.message ?? "invalid"}`);
    }
  }

  return { plan: parsed.data, modelName: m.model, raw };
}

function safeJson(s: string): unknown {
  try {
    return JSON.parse(s);
  } catch {
    // Strip markdown fences if the model wrapped it.
    const m = s.match(/\{[\s\S]*\}/);
    if (m) {
      try {
        return JSON.parse(m[0]);
      } catch {
        /* fall through */
      }
    }
    return null;
  }
}
