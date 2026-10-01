import type { ExportPin } from "./export-package";

export async function buildWalkthroughSummaryPdf(args: {
  logoDataUrl?: string | null;
  title: string;
  projectName: string;
  capturedAt: string;
  stillDataUrl?: string | null;
  pins: ExportPin[];
  shareUrl: string | null;
}): Promise<Uint8Array> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const margin = 48;
  let y = margin;

  if (args.logoDataUrl) {
    try {
      doc.addImage(args.logoDataUrl, "PNG", margin, y, 96, 32);
    } catch {
      // logo is optional
    }
  }
  y += 48;
  doc.setFontSize(18);
  doc.text("Spatial Walkthrough Summary", margin, y);
  y += 22;
  doc.setFontSize(12);
  doc.text(args.title, margin, y);
  y += 16;
  doc.setFontSize(10);
  doc.text(`Project: ${args.projectName}`, margin, y);
  y += 14;
  doc.text(`Captured: ${args.capturedAt}`, margin, y);
  y += 20;

  if (args.stillDataUrl) {
    try {
      doc.addImage(args.stillDataUrl, "JPEG", margin, y, 500, 180);
      y += 196;
    } catch {
      y += 8;
    }
  }

  doc.setFontSize(12);
  doc.text("Pins", margin, y);
  y += 16;
  doc.setFontSize(9);
  for (const pin of args.pins.slice(0, 24)) {
    if (y > 720) {
      doc.addPage();
      y = margin;
    }
    const t = pin.tSeconds == null ? "" : `${Number(pin.tSeconds).toFixed(1)}s`;
    doc.text(`${pin.label} · ${pin.pinType} · ${t}`, margin, y);
    y += 12;
  }

  y += 16;
  doc.setFontSize(10);
  if (args.shareUrl) {
    doc.text("Secure viewer:", margin, y);
    y += 14;
    doc.setFontSize(9);
    doc.text(args.shareUrl, margin, y, { maxWidth: 500 });
  }

  const buf = doc.output("arraybuffer") as ArrayBuffer;
  return new Uint8Array(buf);
}
