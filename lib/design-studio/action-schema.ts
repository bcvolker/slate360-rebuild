import { z } from "zod";

/**
 * The Design Studio command vocabulary — the single contract shared by:
 *  - the AI layer (Groq tool-use emits these, validated here),
 *  - the Next.js → Unreal bridge (forwarded over the Pixel Streaming data channel),
 *  - the UE BP_DesignOrchestrator (ExecuteCommandJson consumes these).
 *
 * Keep the vocabulary small and stable: every command must map cleanly to a single
 * orchestrator handler. The LLM never emits raw UE object paths — only these verbs.
 */

const Vec3 = z.tuple([z.number(), z.number(), z.number()]);

export const DesignActionSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("clear_scene"), scope: z.enum(["all", "agent_spawned_only"]).default("agent_spawned_only") }),

  z.object({
    op: z.literal("swap_material"),
    target: z.string(),                              // tag, e.g. "Surface.Floor"
    material: z.string(),                            // catalog id or material path
    color_hex: z.string().optional(),
    finish: z.enum(["matte", "gloss", "metallic"]).optional(),
  }),

  z.object({ op: z.literal("recolor"), target: z.string(), color_hex: z.string() }),

  z.object({ op: z.literal("remove_object"), target: z.string() }),

  z.object({
    op: z.literal("spawn_furniture"),
    asset_id: z.string(),                            // item in the UE starter library
    position: Vec3.optional(),
    rotation: Vec3.optional(),
    scale: z.number().optional(),
  }),

  z.object({
    op: z.literal("import_glb"),                     // runtime asset from Modal → R2 signed URL
    url: z.string(),
    label: z.string().optional(),
    position: Vec3.optional(),
    rotation: Vec3.optional(),
    scale: z.number().optional(),
  }),

  z.object({ op: z.literal("move_object"), target: z.string(), delta: Vec3 }),

  z.object({
    op: z.literal("adjust_lighting"),
    preset: z.enum(["daylight", "dusk", "interior", "studio", "overcast"]).optional(),
    intensity: z.number().min(0).max(2).optional(),
    color_temp_k: z.number().optional(),
    sun_elevation: z.number().optional(),
  }),

  z.object({ op: z.literal("set_environment"), sky: z.string().optional(), ground: z.string().optional() }),

  z.object({
    op: z.literal("set_camera"),
    preset: z.enum(["overview", "interior", "elevation", "walkthrough"]).optional(),
    position: Vec3.optional(),
    look_at: Vec3.optional(),
  }),

  z.object({ op: z.literal("annotate"), target: z.string(), note: z.string() }),
]);

export type DesignAction = z.infer<typeof DesignActionSchema>;

/** A build step = one action plus optional pacing so the viewer watches construction. */
export const BuildStepSchema = z.object({
  order: z.number().int().nonnegative(),
  action: DesignActionSchema,
  pause_ms: z.number().int().nonnegative().max(10_000).default(0),
});
export type BuildStep = z.infer<typeof BuildStepSchema>;

/** The full structured output of the AI layer for a single prompt. */
export const DesignPlanSchema = z.object({
  version: z.literal("1"),
  summary: z.string().max(280),
  confidence: z.number().min(0).max(1),
  actions: z.array(DesignActionSchema).max(24),
  /** Present when the prompt asks to build/sequence (so it animates step-by-step). */
  build_steps: z.array(BuildStepSchema).max(48).optional(),
  /** Items the agent wants generated (photo/text → 3D) before import_glb can run. */
  needs_generation: z
    .array(
      z.object({
        kind: z.enum(["image_to_3d", "text_to_3d", "image_render"]),
        prompt: z.string(),
        reference_image_key: z.string().optional(),
        placeholder_id: z.string(), // referenced by a later import_glb once generated
      }),
    )
    .max(12)
    .optional(),
});
export type DesignPlan = z.infer<typeof DesignPlanSchema>;

/** JSON Schema fed to the LLM tool definition (kept in sync with DesignPlanSchema). */
export const DESIGN_PLAN_TOOL_NAME = "emit_design_plan";
