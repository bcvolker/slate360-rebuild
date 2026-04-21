import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { DeliverablePdf, type DeliverablePdfBranding } from "./DeliverablePdf";
import type { ViewerDeliverable } from "@/lib/site-walk/viewer-types";

export async function renderDeliverablePdf(
  data: ViewerDeliverable,
  branding: DeliverablePdfBranding,
): Promise<Buffer> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const element = React.createElement(DeliverablePdf, { data, branding }) as any;
  return renderToBuffer(element);
}
