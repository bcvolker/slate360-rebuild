import { NextRequest } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { badRequest, notFound, ok, serverError } from "@/lib/server/api-response";
import { createAdminClient } from "@/lib/supabase/admin";
import { BUCKET, s3 } from "@/lib/s3";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createCanvas } from "@napi-rs/canvas";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";

// Use the legacy build which includes node.js polyfills
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

export const runtime = "nodejs";
export const maxDuration = 300; // Allow 5 mins for large sets

class NodeCanvasFactory {
  create(width: number, height: number) {
    const canvas = createCanvas(width, height);
    const context = canvas.getContext("2d");
    return { canvas, context };
  }
  reset(canvasAndContext: any, width: number, height: number) {
    canvasAndContext.canvas.width = width;
    canvasAndContext.canvas.height = height;
  }
  destroy(canvasAndContext: any) {
    canvasAndContext.canvas.width = 0;
    canvasAndContext.canvas.height = 0;
    canvasAndContext.canvas = null;
    canvasAndContext.context = null;
  }
}

export const POST = (req: NextRequest, ctx: any) =>
  withAppAuth("punchwalk", req, async ({ user, admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");
    const { id } = await ctx.params;

    // Fetch the plan set to get the S3 key
    const { data: planSet, error: setError } = await admin
      .from("site_walk_plan_sets")
      .select("id, org_id, project_id, source_s3_key")
      .eq("id", id)
      .eq("org_id", orgId)
      .single();

    if (setError || !planSet) return notFound("Plan set not found");
    if (!planSet.source_s3_key) return badRequest("Plan set has no source file");

    // Fetch sheets that haven't been rasterized yet
    const { data: sheets, error: sheetsError } = await admin
      .from("site_walk_plan_sheets")
      .select("id, sheet_number, rasterized_key")
      .eq("plan_set_id", planSet.id)
      .eq("org_id", orgId)
      .is("rasterized_key", null);

    if (sheetsError) return serverError(sheetsError.message);
    if (!sheets || sheets.length === 0) return ok({ message: "All sheets are already rasterized", rasterized: 0 });

    try {
      // 1. Download the PDF from S3
      const getCommand = new GetObjectCommand({ Bucket: BUCKET, Key: planSet.source_s3_key });
      const presignedUrl = await getSignedUrl(s3, getCommand, { expiresIn: 3600 });
      const pdfResponse = await fetch(presignedUrl);
      if (!pdfResponse.ok) return serverError(`Failed to download PDF from S3: ${pdfResponse.status}`);
      const pdfArrayBuffer = await pdfResponse.arrayBuffer();
      
      // 2. Load PDF into pdfjs
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(pdfArrayBuffer),
        standardFontDataUrl: "node_modules/pdfjs-dist/standard_fonts/",
        ...( { canvasFactory: new NodeCanvasFactory() } as any )
      });
      const pdfDoc = await loadingTask.promise;

      let rasterizedCount = 0;

      // 3. Render each un-rasterized sheet page
      for (const sheet of sheets) {
        if (!sheet.sheet_number) continue;
        if (sheet.sheet_number > pdfDoc.numPages) continue;

        const page = await pdfDoc.getPage(sheet.sheet_number);
        // We render at scale 2 to get decent resolution, standard page is ~1000px, so this gets ~2000px
        const viewport = page.getViewport({ scale: 2.0 });

        const canvasFactory = new NodeCanvasFactory();
        const canvasAndContext = canvasFactory.create(viewport.width, viewport.height);

        const renderContext: any = {
          canvasContext: canvasAndContext.context,
          viewport: viewport,
          canvasFactory: canvasFactory,
          canvas: canvasAndContext.canvas
        };

        await page.render(renderContext).promise;

        // Convert the napi-rs canvas to a webp buffer using Sharp
        const rawImageData = canvasAndContext.context.getImageData(0, 0, viewport.width, viewport.height);
        
        // NAPI canvas getImageData.data is a Uint8ClampedArray of RGBA
        const webpBuffer = await sharp(Buffer.from(rawImageData.data), {
          raw: {
            width: viewport.width,
            height: viewport.height,
            channels: 4,
          },
        })
          .webp({ quality: 85 })
          .toBuffer();

        // 4. Upload the WebP to R2
        const safeName = planSet.source_s3_key.split('/').pop()?.replace('.pdf', '') || 'plan';
        const rasterizedKey = `orgs/${orgId}/site_walk/rasterized/${planSet.id}/sheet_${sheet.sheet_number}_${uuidv4()}.webp`;

        const putCommand = new PutObjectCommand({
          Bucket: BUCKET,
          Key: rasterizedKey,
          Body: webpBuffer,
          ContentType: "image/webp",
        });
        await s3.send(putCommand);

        // 5. Update the site_walk_plan_sheets row
        await admin
          .from("site_walk_plan_sheets")
          .update({
            rasterized_key: rasterizedKey,
            rasterized_width: Math.round(viewport.width),
            rasterized_height: Math.round(viewport.height),
          })
          .eq("id", sheet.id);

        rasterizedCount++;
        canvasFactory.destroy(canvasAndContext);
        page.cleanup();
      }

      await pdfDoc.destroy();

      return ok({ message: "Rasterization complete", rasterized: rasterizedCount, totalSheets: sheets.length });
    } catch (e: any) {
      console.error("[Rasterize Error]", e);
      return serverError(`Rasterization error: ${e.message}`);
    }
  });