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
import { uploadBuffer } from "@/lib/s3-utils";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3, BUCKET } from "@/lib/s3";
import { bridgePdfToSlateDrop } from "@/lib/site-walk/slatedrop-bridge";

/**
 * Loose union of what a deliverable's content array can hold — narrative
 * EditorBlocks (heading/text/callout/divider/image) AND the real ViewerItem
 * content (photo/photo_360/video/voice/note) the share viewer renders.
 */
type ExportItem = {
  type: string;
  content?: string;
  level?: 1 | 2 | 3;
  variant?: "info" | "warning" | "success";
  alt?: string;
  caption?: string;
  title?: string;
  notes?: string;
  mediaItemId?: string;
  transcript?: string;
};

export const POST = (req: NextRequest, ctx: IdRouteContext) =>
  withAppAuth("punchwalk", req, async ({ admin, user, orgId }) => {
    if (!orgId) return badRequest("Organization context required");
    const { id } = await ctx.params;

    // Fetch deliverable + session project_id
    const { data: del, error } = await admin
      .from("site_walk_deliverables")
      .select("id, title, deliverable_type, content, org_id, session_id, export_config")
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
      const blocks = (del.content ?? []) as ExportItem[];
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 50;
      const usable = pageWidth - margin * 2;
      let y = margin;

      // Capture metadata (date/GPS) is OPTIONAL on the PDF — OFF unless the user
      // opted in (export_config.show_metadata). Many reports must NOT show it.
      const showMeta = Boolean((del.export_config as { show_metadata?: boolean } | null)?.show_metadata);

      async function imageDataUrl(key: string): Promise<string | null> {
        try {
          const obj = await s3.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
          const body = obj.Body as { transformToByteArray: () => Promise<Uint8Array> } | undefined;
          if (!body) return null;
          const bytes = await body.transformToByteArray();
          return `data:image/*;base64,${Buffer.from(bytes).toString("base64")}`;
        } catch {
          return null;
        }
      }

      // Header: org branding logo (from the org's Slate360 profile) + name + date.
      if (org?.deliverable_logo_s3_key) {
        const logoUrl = await imageDataUrl(org.deliverable_logo_s3_key);
        if (logoUrl) {
          try {
            const lp = doc.getImageProperties(logoUrl);
            const lw = 100;
            const lh = lp.width && lp.height ? lw * (lp.height / lp.width) : 28;
            doc.addImage(logoUrl, lp.fileType || "PNG", margin, y, lw, Math.min(lh, 40));
          } catch { /* logo optional */ }
        }
      }
      doc.setFontSize(10);
      doc.setTextColor(120);
      doc.text(org?.name ?? "", pageWidth - margin, y + 10, { align: "right" });
      doc.text(new Date().toLocaleDateString(), pageWidth - margin, y + 24, { align: "right" });
      y += 56;

      // Title
      doc.setFontSize(22);
      doc.setTextColor(0);
      doc.text(del.title || "Untitled Report", margin, y);
      y += 28;

      // Plan page(s) — the walks-with-plans payoff: show WHERE every stop was,
      // not just a flat photo list. One page per sheet that actually has pins
      // from this walk; each numbered pin matches the same pin_number a stop
      // carries in the interactive link's plan view.
      let addedPlanPage = false;
      if (del.session_id) {
        const { data: pinRows } = await admin
          .from("site_walk_pins")
          .select("plan_sheet_id, x_pct, y_pct, pin_number")
          .eq("session_id", del.session_id)
          .not("plan_sheet_id", "is", null);

        const sheetIds = [...new Set((pinRows ?? []).map((p) => p.plan_sheet_id as string))];
        if (sheetIds.length > 0) {
          const { data: sheetRows } = await admin
            .from("site_walk_plan_sheets")
            .select("id, sheet_name, sheet_number, rasterized_key")
            .in("id", sheetIds)
            .not("rasterized_key", "is", null)
            .order("sheet_number", { ascending: true });

          for (const sheet of sheetRows ?? []) {
            const dataUrl = await imageDataUrl(sheet.rasterized_key as string);
            if (!dataUrl) continue;
            try {
              const props = doc.getImageProperties(dataUrl);
              if (!props.width || !props.height) continue;

              doc.addPage();
              addedPlanPage = true;
              y = margin;
              doc.setFontSize(14);
              doc.setTextColor(0);
              doc.text(
                `Plan — ${(sheet.sheet_name as string)?.trim() || `Sheet ${sheet.sheet_number}`}`,
                margin,
                y,
              );
              y += 18;

              const maxH = pageHeight - margin - y;
              let imgW = usable;
              let imgH = imgW * (props.height / props.width);
              if (imgH > maxH) {
                imgH = maxH;
                imgW = imgH * (props.width / props.height);
              }
              const imgX = margin + (usable - imgW) / 2;
              doc.addImage(dataUrl, props.fileType || "PNG", imgX, y, imgW, imgH);

              for (const pin of pinRows ?? []) {
                if (pin.plan_sheet_id !== sheet.id) continue;
                const px = imgX + (pin.x_pct / 100) * imgW;
                const py = y + (pin.y_pct / 100) * imgH;
                doc.setFillColor(0, 122, 82); // Site Walk 360 field green
                doc.circle(px, py, 8, "F");
                doc.setFontSize(8);
                doc.setTextColor(255, 255, 255);
                doc.text(
                  pin.pin_number != null ? String(pin.pin_number).padStart(2, "0") : "-",
                  px,
                  py + 2.8,
                  { align: "center" },
                );
              }
            } catch {
              /* plan page optional — a bad sheet image never blocks the report */
            }
          }
        }
      }

      if (addedPlanPage) {
        doc.addPage();
        y = margin;
      }

      // Resolve source items for real-image embedding + metadata burn-in.
      const mediaIds = Array.from(
        new Set(blocks.map((b) => b.mediaItemId).filter((v): v is string => typeof v === "string")),
      );
      const itemMap = new Map<string, { s3_key: string | null; lat: number | null; lng: number | null; capturedAt: string | null }>();
      if (mediaIds.length > 0) {
        const { data: itemRows } = await admin
          .from("site_walk_items")
          .select("id, s3_key, latitude, longitude, created_at")
          .in("id", mediaIds)
          .eq("org_id", orgId);
        for (const r of itemRows ?? []) {
          itemMap.set(r.id as string, {
            s3_key: (r.s3_key as string | null) ?? null,
            lat: (r.latitude as number | null) ?? null,
            lng: (r.longitude as number | null) ?? null,
            capturedAt: (r.created_at as string | null) ?? null,
          });
        }
      }

      const ensure = (need: number) => {
        if (y + need > pageHeight - margin) { doc.addPage(); y = margin; }
      };

      // Render content — handles narrative blocks AND real ViewerItem media.
      for (const block of blocks) {
        ensure(20);
        const type = block.type;

        if (type === "heading") {
          const level = (block.level ?? 2) as 1 | 2 | 3;
          const sizes = { 1: 18, 2: 15, 3: 13 } as const;
          doc.setFontSize(sizes[level]); doc.setTextColor(0); y += 10;
          const lines = doc.splitTextToSize(block.content ?? "", usable);
          doc.text(lines, margin, y); y += lines.length * (sizes[level] + 4) + 6;
        } else if (type === "text") {
          doc.setFontSize(11); doc.setTextColor(40);
          const lines = doc.splitTextToSize(block.content ?? "", usable);
          doc.text(lines, margin, y); y += lines.length * 15 + 8;
        } else if (type === "callout") {
          doc.setFontSize(10);
          const bgColors = { info: [235, 245, 255], warning: [255, 251, 235], success: [236, 253, 245] } as const;
          const bg = bgColors[(block.variant ?? "info") as keyof typeof bgColors] ?? bgColors.info;
          const lines = doc.splitTextToSize(block.content ?? "", usable - 20);
          const boxH = lines.length * 14 + 16;
          ensure(boxH);
          doc.setFillColor(bg[0], bg[1], bg[2]);
          doc.roundedRect(margin, y, usable, boxH, 4, 4, "F");
          doc.setTextColor(40); doc.text(lines, margin + 10, y + 14); y += boxH + 10;
        } else if (type === "divider") {
          doc.setDrawColor(200); doc.line(margin, y + 5, pageWidth - margin, y + 5); y += 15;
        } else if (type === "note") {
          if (block.title) {
            doc.setFontSize(13); doc.setTextColor(0); y += 8;
            const tl = doc.splitTextToSize(block.title, usable);
            doc.text(tl, margin, y); y += tl.length * 17 + 4;
          }
          if (block.notes) {
            doc.setFontSize(11); doc.setTextColor(40);
            const nl = doc.splitTextToSize(block.notes, usable);
            doc.text(nl, margin, y); y += nl.length * 15 + 8;
          }
        } else if (type === "photo" || type === "photo_360" || type === "video") {
          const meta = block.mediaItemId ? itemMap.get(block.mediaItemId) : undefined;
          const dataUrl = meta?.s3_key ? await imageDataUrl(meta.s3_key) : null;

          // Side-by-side: image on the LEFT, all notes/info on the RIGHT, so 2-3
          // stops fit per page. Capture metadata only when the user opted in.
          const colW = (usable - 20) / 2;
          const textX = margin + colW + 20;
          const textW = usable - colW - 20;

          let imgW = colW;
          let imgH = colW * 0.7;
          let fmt = "JPEG";
          if (dataUrl) {
            try {
              const props = doc.getImageProperties(dataUrl);
              fmt = props.fileType || "JPEG";
              if (props.width && props.height) {
                imgH = colW * (props.height / props.width);
                const maxH = 200;
                if (imgH > maxH) { imgH = maxH; imgW = maxH * (props.width / props.height); }
              }
            } catch { /* placeholder below */ }
          }

          const titleLines = block.title ? doc.splitTextToSize(block.title, textW) : [];
          const noteLines = block.notes ? doc.splitTextToSize(block.notes, textW) : [];
          const stamp = showMeta
            ? [
                meta?.capturedAt ? new Date(meta.capturedAt).toLocaleString() : null,
                meta?.lat != null && meta?.lng != null ? `${meta.lat.toFixed(5)}, ${meta.lng.toFixed(5)}` : null,
              ].filter(Boolean).join("   ·   ")
            : "";
          const textH = titleLines.length * 15 + (stamp ? 16 : 0) + noteLines.length * 13 + 8;

          const rowH = Math.max(imgH, textH);
          ensure(rowH + 14);
          const rowTop = y;

          if (dataUrl) {
            try { doc.addImage(dataUrl, fmt, margin, rowTop, imgW, imgH); }
            catch {
              doc.setDrawColor(210); doc.roundedRect(margin, rowTop, colW, 120, 4, 4, "S");
              doc.setFontSize(9); doc.setTextColor(150); doc.text(`[${type}]`, margin + 8, rowTop + 20);
            }
          } else {
            doc.setDrawColor(210); doc.roundedRect(margin, rowTop, colW, 120, 4, 4, "S");
            doc.setFontSize(9); doc.setTextColor(150);
            doc.text(`${type} — open the shared link`, margin + 8, rowTop + 20);
          }

          let ty = rowTop + 4;
          if (titleLines.length) { doc.setFontSize(11); doc.setTextColor(0); doc.text(titleLines, textX, ty + 8); ty += titleLines.length * 15 + 4; }
          if (stamp) { doc.setFontSize(8); doc.setTextColor(130); doc.text(stamp, textX, ty + 6); ty += 16; }
          if (noteLines.length) { doc.setFontSize(10); doc.setTextColor(60); doc.text(noteLines, textX, ty + 6); ty += noteLines.length * 13 + 4; }

          y = rowTop + rowH + 14;
          doc.setDrawColor(235); doc.line(margin, y - 7, pageWidth - margin, y - 7);
        } else if (type === "voice") {
          if (block.title) { doc.setFontSize(11); doc.setTextColor(0); doc.text(block.title, margin, y + 10); y += 16; }
          const vt = block.transcript ?? block.notes;
          if (vt) {
            doc.setFontSize(10); doc.setTextColor(60);
            const nl = doc.splitTextToSize(vt, usable);
            doc.text(nl, margin, y); y += nl.length * 13 + 4;
          }
          doc.setFontSize(8); doc.setTextColor(130);
          doc.text("Voice memo — audio available in the shared link", margin, y + 6); y += 14;
        } else if (type === "image") {
          doc.setFontSize(9); doc.setTextColor(100);
          doc.text(`[Image: ${block.alt || block.caption || "photo"}]`, margin, y + 10); y += 20;
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

      // ── SlateDrop bridge ─────────────────────────────────────────
      // Bridge the exported PDF into the project's Reports folder.
      // Only for snapshot/export artifacts (not drafts, per doctrine).
      const warnings: string[] = [];
      if (del.session_id) {
        const { data: session } = await admin
          .from("site_walk_sessions")
          .select("project_id")
          .eq("id", del.session_id)
          .single();

        if (session?.project_id) {
          const safeName = (del.title || "Report").replace(/[^a-zA-Z0-9 _-]/g, "").slice(0, 80);
          const dateStamp = new Date().toISOString().slice(0, 10);
          try {
            const bridgeId = await bridgePdfToSlateDrop(admin, {
              deliverableId: id,
              s3Key,
              fileName: `${safeName} ${dateStamp}.pdf`,
              fileSize: pdfBuffer.byteLength,
              projectId: session.project_id,
              orgId,
              userId: user.id,
            });
            if (!bridgeId) {
              warnings.push("PDF exported but not linked to project Deliverables folder.");
            }
          } catch {
            warnings.push("PDF exported but not linked to project Deliverables folder.");
          }
        }
      }

      // Short-lived download link so the caller can trigger a download
      // immediately without a second round trip to look up the s3 key.
      let downloadUrl: string | null = null;
      try {
        downloadUrl = await getSignedUrl(s3, new GetObjectCommand({ Bucket: BUCKET, Key: s3Key }), {
          expiresIn: 60 * 15,
        });
      } catch {
        // The PDF is still safely stored; the caller can re-request export to
        // get a fresh link if this presign step ever fails.
      }

      return ok({
        export_s3_key: s3Key,
        download_url: downloadUrl,
        size: pdfBuffer.byteLength,
        ...(warnings.length > 0 ? { warnings } : {}),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "PDF generation failed";
      return serverError(msg);
    }
  });
