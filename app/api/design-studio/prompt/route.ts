import { NextRequest } from "next/server";
import { withAuth } from "@/lib/server/api-auth";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { ok, badRequest, forbidden, serverError } from "@/lib/server/api-response";
import { interpretDesignPrompt } from "@/lib/design-studio/interpret-prompt";

// POST /api/design-studio/prompt — natural-language prompt → variant + generation job.
export const POST = (req: NextRequest) =>
  withAuth(req, async ({ user, admin, orgId }) => {
    const { isSlateCeo } = await resolveServerOrgContext();
    if (!isSlateCeo) return forbidden();
    if (!orgId) return forbidden("No organization");

    let body: {
      sessionId?: string;
      parentVariantId?: string | null;
      promptText?: string;
      referenceImageKeys?: string[];
    };
    try {
      body = await req.json();
    } catch {
      return badRequest("Invalid JSON body");
    }
    if (!body.sessionId || !body.promptText?.trim()) {
      return badRequest("sessionId and promptText are required");
    }

    // Load the session (org-scoped) for prompt context.
    const { data: session, error: sessErr } = await admin
      .from("design_sessions")
      .select("id, org_id, title, source_format, source_viewer_kind")
      .eq("id", body.sessionId)
      .eq("org_id", orgId)
      .single();
    if (sessErr || !session) return badRequest("Session not found");

    // Pull the parent variant's cumulative actions for iteration context.
    let parentActions: unknown[] = [];
    let parentCommandList: unknown[] = [];
    if (body.parentVariantId) {
      const { data: parent } = await admin
        .from("design_variants")
        .select("structured_actions, command_list")
        .eq("id", body.parentVariantId)
        .eq("org_id", orgId)
        .single();
      parentActions = (parent?.structured_actions as unknown[]) ?? [];
      parentCommandList = (parent?.command_list as unknown[]) ?? [];
    }

    // 1. Interpret.
    let interpreted;
    try {
      interpreted = await interpretDesignPrompt(body.promptText, {
        sourceFormat: session.source_format,
        viewerKind: session.source_viewer_kind,
        sessionTitle: session.title,
        parentActions,
        referenceImageCount: body.referenceImageKeys?.length ?? 0,
      });
    } catch (e) {
      return serverError(e instanceof Error ? e.message : "AI interpretation failed");
    }
    const { plan, modelName } = interpreted;

    // 2. Persist prompt.
    const { data: promptRow, error: promptErr } = await admin
      .from("design_prompts")
      .insert({
        org_id: orgId,
        session_id: session.id,
        parent_variant_id: body.parentVariantId ?? null,
        created_by: user.id,
        prompt_text: body.promptText,
        structured_actions: plan.actions,
        reference_image_keys: body.referenceImageKeys ?? [],
        model_provider: "groq",
        model_name: modelName,
      })
      .select("*")
      .single();
    if (promptErr || !promptRow) return serverError(promptErr?.message ?? "Failed to save prompt");

    // 3. Create the variant (queued) with cumulative command list.
    const cumulative = [...parentCommandList, ...plan.actions];
    const { data: variant, error: varErr } = await admin
      .from("design_variants")
      .insert({
        org_id: orgId,
        session_id: session.id,
        parent_variant_id: body.parentVariantId ?? null,
        prompt_id: promptRow.id,
        label: plan.summary.slice(0, 60),
        tier: "preview",
        status: "queued",
        structured_actions: plan.actions,
        command_list: cumulative,
      })
      .select("*")
      .single();
    if (varErr || !variant) return serverError(varErr?.message ?? "Failed to create variant");

    await admin.from("design_prompts").update({ variant_id: variant.id }).eq("id", promptRow.id);

    // 4. Create the generation job (queued).
    const { data: job, error: jobErr } = await admin
      .from("design_generation_jobs")
      .insert({
        org_id: orgId,
        session_id: session.id,
        variant_id: variant.id,
        prompt_id: promptRow.id,
        created_by: user.id,
        job_type: plan.needs_generation?.length ? "image_to_3d" : "preview",
        status: "queued",
        input_payload: { plan },
      })
      .select("*")
      .single();
    if (jobErr || !job) return serverError(jobErr?.message ?? "Failed to create job");

    // 5. Dispatch to Trigger (resilient — DB row is source of truth if dispatch fails).
    try {
      const { tasks } = await import("@trigger.dev/sdk/v3");
      await tasks.trigger("design.generate", { jobId: job.id }, undefined, {
        clientConfig: { previewBranch: "" },
      });
    } catch (e) {
      // Worker not deployed yet (slice 6) — leave job queued, surface softly.
      console.warn("[design.prompt] trigger dispatch skipped:", e instanceof Error ? e.message : e);
    }

    return ok({ prompt: promptRow, variant, job, plan });
  });
