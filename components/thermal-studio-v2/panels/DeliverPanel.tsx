"use client";

import { useState } from "react";
import { V2PanelFrame } from "@/components/thermal-studio-v2/V2PanelFrame";
import { DeliverSectionNav, type DeliverSection } from "@/components/thermal-studio-v2/panels/deliver/DeliverSectionNav";
import { DeliverShareHome } from "@/components/thermal-studio-v2/panels/deliver/DeliverShareHome";
import { DeliverExports } from "@/components/thermal-studio-v2/panels/deliver/DeliverExports";
import { DeliverQA } from "@/components/thermal-studio-v2/panels/deliver/DeliverQA";

/** Tab 5 — Deliver (doc §1, S7.5): saved-deliverables home + composer, reusing the real share/report/export/Q&A backend. */
export function DeliverPanel({ sessionId }: { sessionId: string }) {
  const [section, setSection] = useState<DeliverSection>("share");

  return (
    <V2PanelFrame
      left={{
        title: "Sections",
        content: <DeliverSectionNav active={section} onChange={setSection} />,
      }}
      center={
        <div className="h-full overflow-y-auto p-3">
          {section === "share" ? <DeliverShareHome sessionId={sessionId} /> : null}
          {section === "reports" ? <DeliverExports sessionId={sessionId} mode="reports" /> : null}
          {section === "exports" ? <DeliverExports sessionId={sessionId} mode="exports" /> : null}
          {section === "qa" ? <DeliverQA sessionId={sessionId} /> : null}
        </div>
      }
    />
  );
}
