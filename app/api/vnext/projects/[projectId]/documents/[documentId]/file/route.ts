import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { NextRequest, NextResponse } from "next/server";
import { notFound, serverError } from "@/lib/server/api-response";
import { withProjectAuth } from "@/lib/server/api-auth";
import { BUCKET, s3 } from "@/lib/s3";
import { canOpenInBrowser, contentTypeForExtension, fileExtension } from "@/lib/vnext/documents/document-language";
import { readClientDocumentFile } from "@/lib/vnext/documents/read-project-documents";

type Params = { params: Promise<{ projectId: string; documentId: string }> };

export function GET(req: NextRequest, ctx: Params) {
  return withProjectAuth(req, ctx, async ({ admin, projectId }) => {
    const { documentId } = await ctx.params;
    const file = await readClientDocumentFile(admin, projectId, documentId);
    if (!file) return notFound();

    const extension = fileExtension(file.filename) ?? file.extension;
    const requested = req.nextUrl.searchParams.get("disposition");
    const inline = requested === "inline" && canOpenInBrowser(extension);
    const disposition = `${inline ? "inline" : "attachment"}; filename="${encodeURIComponent(file.filename)}"`;

    try {
      const url = await getSignedUrl(
        s3,
        new GetObjectCommand({
          Bucket: BUCKET,
          Key: file.s3Key,
          ResponseContentDisposition: disposition,
          ResponseContentType: contentTypeForExtension(extension),
        }),
        { expiresIn: 3600 },
      );
      return NextResponse.redirect(url);
    } catch {
      return serverError("The file could not be opened.");
    }
  });
}
