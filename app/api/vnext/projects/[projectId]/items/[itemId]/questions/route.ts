import { NextRequest } from "next/server";
import { badRequest, created, notFound, ok, serverError } from "@/lib/server/api-response";
import { withProjectAuth } from "@/lib/server/api-auth";
import { createItemQuestion, readItemQuestions } from "@/lib/vnext/items/item-questions";
import { questionValidationMessage } from "@/lib/vnext/items/question-body";
import { projectIncludesCapability } from "@/lib/vnext/scope/read-project-scope";

type Params = { params: Promise<{ projectId: string; itemId: string }> };

export function GET(req: NextRequest, ctx: Params) {
  return withProjectAuth(req, ctx, async ({ admin, projectId }) => {
    if (!(await projectIncludesCapability(admin, projectId, "items"))) return notFound();
    const { itemId } = await ctx.params;
    const read = await readItemQuestions(admin, projectId, itemId);
    if (!read.ok && read.status === "missing") return notFound();
    if (!read.ok) return serverError("Questions could not be loaded.");
    return ok({ questions: read.questions });
  });
}

export function POST(req: NextRequest, ctx: Params) {
  return withProjectAuth(req, ctx, async ({ admin, projectId, user }) => {
    if (!(await projectIncludesCapability(admin, projectId, "items"))) return notFound();
    const { itemId } = await ctx.params;
    const payload = (await req.json().catch(() => null)) as { body?: unknown } | null;
    const raw = typeof payload?.body === "string" ? payload.body : "";
    const createdQuestion = await createItemQuestion(admin, projectId, itemId, user.id, raw);
    if (!createdQuestion.ok && createdQuestion.status === "missing") return notFound();
    if (!createdQuestion.ok && createdQuestion.status === "invalid") {
      return badRequest(questionValidationMessage(createdQuestion.reason ?? "empty"));
    }
    if (!createdQuestion.ok) return serverError("The question could not be sent. Try again.");
    return created({ question: createdQuestion.question });
  });
}
