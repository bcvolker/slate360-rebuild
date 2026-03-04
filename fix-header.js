const fs = require('fs');

let content = fs.readFileSync('app/(dashboard)/project-hub/ClientPage.tsx', 'utf-8');

const startTag = '<header className="sticky top-0 z-50 border-b border-gray-100 bg-white/95 backdrop-blur-md">';
const startIdx = content.indexOf(startTag);
if (startIdx === -1) throw new Error("Could not find start index");
const endTag = '</header>';
const endIdx = content.indexOf(endTag, startIdx) + endTag.length;

if (endIdx === -1) throw new Error("Could not find end index");

const replacement = `      <DashboardHeader
        user={user}
        tier={tier}
        isCeo={isCeo}
        showBackLink
        onCustomizeOpen={() => setCustomizeOpen(true)}
      />`;

content = content.substring(0, startIdx) + replacement + content.substring(endIdx);
fs.writeFileSync('app/(dashboard)/project-hub/ClientPage.tsx', content);

console.log("Replacement successful!");
