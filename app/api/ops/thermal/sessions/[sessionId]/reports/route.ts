import { NextRequest, NextResponse } from "next/server";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { withThermalOpsAuth } from "@/lib/thermal/access";
import { ok, badRequest, notFound, serverError } from "@/lib/server/api-response";
import { s3, BUCKET } from "@/lib/s3";

export const runtime = "nodejs";

type Params = { params: Promise<{ sessionId: string }> };

/**
 * Lists generated reports for a session, or — with `?download=<reportId>&fmt=pdf|html`
 * — issues a short-lived signed URL redirect to the stored artifact in R2.
 */
export const GET = (req: NextRequest, { params }: Params) =>
  withThermalOpsAuth(req, async ({ admin, orgId }) => {
    const { sessionId } = await params;
    if (!sessionId) return badRequest("sessionId is required");

    const url = new URL(req.url);
    const downloadId = url.searchParams.get("download");
    const fmt = url.searchParams.get("fmt") === "html" ? "html" : "pdf";

    let query = admin
      .from("thermal_analysis_reports")
      .select("id, session_id, org_id, title, template_id, storage_key, html_storage_key, generated_at, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false });
    if (orgId) query = query.eq("org_id", orgId);

    const { data: reports, error } = await query;
    if (error) return serverError(error.message);

    if (downloadId) {
      const report = (reports ?? []).find((r) => r.id === downloadId);
      if (!report) return notFound("Report not found");
      const key = fmt === "html" ? report.html_storage_key : report.storage_key;
      if (!key) return notFound(`No ${fmt} artifact for this report`);
      const signed = await getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: key }), {
        expiresIn: 3600,
      });
      return NextResponse.redirect(signed);
    }

    return ok({ reports: reports ?? [] });
  });
