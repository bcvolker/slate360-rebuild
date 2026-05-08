const fs = require('fs');
const file = 'ops/bug-registry.json';
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
data.push({
  "id": "BUG-079",
  "status": "resolved",
  "severity": "high",
  "title": "Desktop swipe-up overlaps view and Save & Next fails to advance",
  "description": "On desktop screens, the mobile swipe-up drawer covers the camera/plan view. Save & Next button hangs with a spinner because programmatic file input clicks are blocked by await flushCurrentDraft().",
  "location": "components/site-walk/capture/CaptureDataBottomSheet.tsx",
  "resolution": "Implemented Split-Pane Layout. Mobile uses swipe-up; Desktop displays as strict right sidebar. Removed await flush() before firing capture click to satisfy Safari/browser user gesture token.",
  "date_logged": new Date().toISOString()
});
fs.writeFileSync(file, JSON.stringify(data, null, 2));
