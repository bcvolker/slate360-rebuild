import { NextRequest } from "next/server";
import { withThermalOpsAuth } from "@/lib/thermal/access";
import { ok, badRequest, notFound, serverError } from "@/lib/server/api-response";
import { resolveChatProvider, chatComplete } from "@/lib/server/ai-provider";
import { describeAnomaly, type ThermalAnomaly } from "@/lib/thermal/anomaly-describe";

export const runtime = "nodejs";

type Params = { params: Promise<{ captureId: string }> };

/**
 * Generates an AI DRAFT findings narrative from a capture's detected anomalies.
 * Standards-driven (from the request, sourced from the report template) — never a
 * hardcoded certification. The result is an editable draft; the operator reviews
 * and edits it before it goes in a report. Uses the project's existing chat
 * provider (Groq/OpenAI), not a new dependency.
 */
export const POST = (req: NextRequest, { params }: Params) =>
  withThermalOpsAuth(req, async ({ admin, orgId }) => {
    const { captureId } = await params;
    if (!captureId) return badRequest("captureId is required");

    const body = (await req.json().catch(() => ({}))) as { standards?: string[] };
    const standards = Array.isArray(body.standards) ? body.standards.filter((s) => typeof s === "string") : [];

    const { data: capture, error } = await admin
      .from("thermal_captures")
      .select("id, org_id, filename, anomalies")
      .eq("id", captureId)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) return serverError(error.message);
    if (!capture || (orgId && capture.org_id && capture.org_id !== orgId)) {
      return notFound("Capture not found");
    }

    const anomalies = (capture.anomalies as ThermalAnomaly[] | null) ?? [];
    if (!anomalies.length) {
      return ok({ draft: "", note: "No detected anomalies to draft from — add findings manually." });
    }

    const provider = resolveChatProvider();
    if (!provider) return serverError("No AI provider configured");

    // Deterministic, standards-aware descriptions seed the model so it stays factual.
    const facts = anomalies
      .map((a, i) => `${i + 1}. ${describeAnomaly(a, { standards })}`)
      .join("\n");
    const stdLine = standards.length ? `Applicable standards: ${standards.join(", ")}.` : "";

    const system =
      "You are assisting with a thermal inspection report. " +
      "Draft concise, professional findings (3–5 sentences). Use neutral, observation-first, " +
      "evidence-based language ('observed', 'measured', 'consistent with', 'may indicate') and " +
      "do NOT assert a root cause. Reference the applicable standards where relevant. State the " +
      "empirical facts first, then a careful interpretation clearly framed as a suggestion for " +
      "the reviewer to confirm, then a recommended verification step. Output plain text only — no " +
      "preamble, headings, or markdown.";
    const user = `Detected anomalies for image "${capture.filename ?? "capture"}":\n${facts}\n${stdLine}`;

    try {
      const draft = await chatComplete(
        provider,
        [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        { temperature: 0.3, maxTokens: 400 },
      );
      return ok({ draft });
    } catch (err) {
      return serverError(err instanceof Error ? err.message : "Draft generation failed");
    }
  });
