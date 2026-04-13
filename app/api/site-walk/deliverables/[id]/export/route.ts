/**
 * POST /api/site-walk/deliverables/[id]/export — generate PDF and upload to S3
 *
 * Renders block content to a PDF via jsPDF, uploads to S3,
 * and stores the key in export_s3_key.
 */
import { NextRequest } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { ok, badRequest, notFound, serverError } from "@/lib/server/api-response";
import type { IdRouteContext } from "@/lib/types/api";
import type { EditorBlock } from "@/lib/types/blocks";
import { uploadBuffer } from "@/lib/s3-utils";

export const POST = (req: NextRequest, ctx: IdRouteContext) =>
  withAppAuth("punchwalk", req, async ({ admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");
    const { id } = await ctx.params;

    // Fetch deliverable + org logo
    const { data: del, error } = await admin
      .from("site_walk_deliverables")
      .select("id, title, deliverable_type, content, org_id")
      .eq("id", id)
      .eq("org_id", orgId)
      .single();

    if (error || !del) return notFound("Deliverable not found");

    const { data: org } = await admin
      .from("organizations")
      .select("name, deliverable_logo_s3_key")
      .eq("id", orgId)
      .single();

    try {
      const { jsPDF } = await import("jspdf");
      const doc = new jsPDF({ unit: "pt", format: "letter" });
      const blocks = (del.content ?? []) as EditorBlock[];
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 50;
      const usable = pageWidth - margin * 2;
      let y = margin;

      // Header: org name + date
      doc.setFontSize(10);
      doc.setTextColor(120);
      doc.text(org?.name ?? "", margin, y);
      doc.text(new Date().toLocaleDateString(), pageWidth - margin, y, { align: "right" });
      y += 30;

      // Title
      doc.setFontSize(22);
      doc.setTextColor(0);
      doc.text(del.title || "Untitled Report", margin, y);
      y += 30;

      // Render blocks
      for (const block of blocks) {
        if (y > doc.internal.pageSize.getHeight() - margin) {
          doc.addPage();
          y = margin;
        }

        switch (block.type) {
          case "heading": {
            const sizes = { 1: 18, 2: 15, 3: 13 } as const;
            doc.setFontSize(sizes[block.level]);
            doc.setTextColor(0);
            y += 10;
            const lines = doc.splitTextToSize(block.content, usable);
            doc.text(lines, margin, y);
            y += lines.length * (sizes[block.level] + 4) + 6;
            break;
          }
          case "text": {
            doc.setFontSize(11);
            doc.setTextColor(40);
            const lines = doc.splitTextToSize(block.content, usable);
            doc.text(lines, margin, y);
            y += lines.length * 15 + 8;
            break;
          }
          case "callout": {
            doc.setFontSize(10);
            const bgColors = { info: [235, 245, 255], warning: [255, 251, 235], success: [236, 253, 245] } as const;
            const bg = bgColors[block.variant] ?? bgColors.info;
            const lines = doc.splitTextToSize(block.content, usable - 20);
            const boxH = lines.length * 14 + 16;
            doc.setFillColor(bg[0], bg[1], bg[2]);
            doc.roundedRect(margin, y, usable, boxH, 4, 4, "F");
            doc.setTextColor(40);
            doc.text(lines, margin + 10, y + 14);
            y += boxH + 10;
            break;
          }
          case "divider":
            doc.setDrawColor(200);
            doc.line(margin, y + 5, pageWidth - margin, y + 5);
            y += 15;
            break;
          case "image":
            // Image reference (actual image embedding requires fetch + base64)
            doc.setFontSize(9);
            doc.setTextColor(100);
            doc.text(`[Image: ${block.alt || block.caption || "photo"}]`, margin, y + 10);
            y += 20;
            break;
        }
      }

      const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
      const s3Key = `site-walk/exports/${orgId}/${id}.pdf`;

      await uploadBuffer(s3Key, pdfBuffer, "application/pdf");

      // Save key to DB
      await admin
        .from("site_walk_deliverables")
        .update({ export_s3_key: s3Key })
        .eq("id", id);

      return ok({ export_s3_key: s3Key, size: pdfBuffer.byteLength });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "PDF generation failed";
      return serverError(msg);
    }
  });
