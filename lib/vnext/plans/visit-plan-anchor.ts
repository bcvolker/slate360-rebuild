import type { VisitPlanAnchor } from "./plan-types";

type SheetRef = {
  id: string;
  planSetId: string;
  projectId: string;
};

type SessionLink = {
  sessionId: string;
  planSheetId: string;
};

type SheetPin = {
  sessionId: string | null;
  planSheetId: string | null;
  projectId: string | null;
  xPct: number;
  yPct: number;
};

/**
 * Builds visit anchors from session-to-sheet links and pins.
 * A sheet that is not in this project is dropped. Two sessions may share one sheet.
 */
export function visitPlanAnchors(
  projectId: string,
  sheets: SheetRef[],
  links: SessionLink[],
  pins: SheetPin[],
): VisitPlanAnchor[] {
  const sheetsById = new Map(
    sheets.filter((sheet) => sheet.projectId === projectId).map((sheet) => [sheet.id, sheet]),
  );
  const anchors: VisitPlanAnchor[] = [];
  for (const link of links) {
    const sheet = sheetsById.get(link.planSheetId);
    if (!sheet) continue;
    const pin = pins.find(
      (entry) =>
        entry.sessionId === link.sessionId &&
        entry.planSheetId === link.planSheetId &&
        (entry.projectId === null || entry.projectId === projectId),
    );
    anchors.push({
      sessionId: link.sessionId,
      planSetId: sheet.planSetId,
      planSheetId: sheet.id,
      xPct: pin ? pin.xPct : null,
      yPct: pin ? pin.yPct : null,
    });
  }
  return anchors;
}
