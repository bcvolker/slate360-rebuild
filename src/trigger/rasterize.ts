import { task } from "@trigger.dev/sdk/v3";
import { createClient } from "@supabase/supabase-js";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createCanvas } from "canvas";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";

// Polyfill for NodeJS environments before importing pdfjs
if (typeof globalThis.DOMMatrix === "undefined") {
  (globalThis as any).DOMMatrix = class DOMMatrix {
    a=1; b=0; c=0; d=1; e=0; f=0;
    constructor() {}
  };
}
if (typeof globalThis.Path2D === "undefined") {
  (globalThis as any).Path2D = class Path2D {
    constructor() {}
  };
}
if (typeof globalThis.ImageData === "undefined") {
  (globalThis as any).ImageData = class ImageData {
    data: Uint8ClampedArray;
    width: number;
    height: number;
    constructor(width: number, height: number) {
      this.width = width;
      this.height = height;
      this.data = new Uint8ClampedArray(width * height * 4);
    }
  };
}

// We will dynamically import pdfjs-dist inside the run function

const BUCKET = process.env.R2_BUCKET || "slate360-storage";

// Move supabase initialization into a getter so it doesn't fail at import time
const getSupabase = () => {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!supabaseUrl) throw new Error("supabaseUrl is required.");
  if (!supabaseServiceKey) throw new Error("supabaseServiceKey is required.");
  return createClient(supabaseUrl, supabaseServiceKey);
};

const getS3 = () => new S3Client({
  region: process.env.R2_REGION || "us-east-1",
  endpoint: process.env.R2_ENDPOINT || (process.env.CLOUDFLARE_ACCOUNT_ID ? `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com` : undefined),
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});

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

export const rasterizePlanTask = task({
  id: "plan.rasterize",
  maxDuration: 60 * 15,
  run: async (payload: { planSetId: string; orgId: string }) => {
    const { planSetId, orgId } = payload;
    console.log(`Starting rasterization for planSetId: ${planSetId}`);
    const supabase = getSupabase();
    const s3 = getS3();

    // Update job to processing
    const { data: jobs } = await supabase
      .from("plan_raster_jobs")
      .select("id")
      .eq("plan_set_id", planSetId)
      .eq("org_id", orgId)
      .eq("status", "queued");
      
    if (jobs && jobs.length > 0) {
      await supabase
        .from("plan_raster_jobs")
        .update({ status: "processing" })
        .in("id", jobs.map(j => j.id));
    }

    try {
      const { data: planSet, error: setError } = await supabase
        .from("site_walk_plan_sets")
        .select("id, org_id, project_id, source_s3_key")
        .eq("id", planSetId)
        .single();
        
      if (setError || !planSet?.source_s3_key) {
        throw new Error(`Plan set not found or missing key: ${setError?.message}`);
      }

      const { data: sheets } = await supabase
        .from("site_walk_plan_sheets")
        .select("id, sheet_number")
        .eq("plan_set_id", planSet.id)
        .is("rasterized_key", null);

      if (!sheets || sheets.length === 0) {
        console.log("No sheets to rasterize.");
        if (jobs && jobs.length > 0) {
          await supabase.from("plan_raster_jobs").update({ status: "completed" }).in("id", jobs.map(j=>j.id));
        }
        return { success: true, count: 0 };
      }

      const getCommand = new GetObjectCommand({ Bucket: BUCKET, Key: planSet.source_s3_key });
      const presignedUrl = await getSignedUrl(s3, getCommand, { expiresIn: 3600 });
      const pdfResponse = await fetch(presignedUrl);
      if (!pdfResponse.ok) {
        throw new Error(`Failed to download PDF from S3: ${pdfResponse.status}`);
      }
      
      const pdfArrayBuffer = await pdfResponse.arrayBuffer();

      const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");

      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(pdfArrayBuffer),
        standardFontDataUrl: "node_modules/pdfjs-dist/standard_fonts/",
        ...( { canvasFactory: new NodeCanvasFactory() } as any )
      });
      const pdfDoc = await loadingTask.promise;

      let count = 0;
      for (const sheet of sheets) {
        if (!sheet.sheet_number || sheet.sheet_number > pdfDoc.numPages) continue;

        const page = await pdfDoc.getPage(sheet.sheet_number);
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

        const rawImageData = canvasAndContext.context.getImageData(0, 0, viewport.width, viewport.height);
        
        const webpBuffer = await sharp(Buffer.from(rawImageData.data), {
          raw: { width: viewport.width, height: viewport.height, channels: 4 }
        })
          .webp({ quality: 85 })
          .toBuffer();

        const safeName = planSet.source_s3_key.split('/').pop()?.replace('.pdf', '') || 'plan';
        const rasterizedKey = `orgs/${orgId}/site_walk/rasterized/${planSet.id}/sheet_${sheet.sheet_number}_${uuidv4()}.webp`;

        const putCommand = new PutObjectCommand({
          Bucket: BUCKET, Key: rasterizedKey, Body: webpBuffer, ContentType: "image/webp",
        });
        await s3.send(putCommand);

        await supabase
          .from("site_walk_plan_sheets")
          .update({
            rasterized_key: rasterizedKey,
            rasterized_width: Math.round(viewport.width),
            rasterized_height: Math.round(viewport.height),
          })
          .eq("id", sheet.id);

        count++;
        canvasFactory.destroy(canvasAndContext);
        page.cleanup();
      }

      await pdfDoc.destroy();

      if (jobs && jobs.length > 0) {
         await supabase.from("plan_raster_jobs").update({ status: "completed" }).in("id", jobs.map(j=>j.id));
      }
      return { success: true, count };

    } catch (e: any) {
        console.error("Rasterize error:", e);
        if (jobs && jobs.length > 0) {
           await supabase.from("plan_raster_jobs").update({ status: "failed", error_text: e.message }).in("id", jobs.map(j=>j.id));
        }
        throw e;
    }
  }
});
