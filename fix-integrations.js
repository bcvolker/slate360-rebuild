const fs = require('fs');

let content = fs.readFileSync('app/(dashboard)/integrations/ClientPage.tsx', 'utf-8');

// Insert import if absent
if (!content.includes('DashboardHeader')) {
  content = content.replace('import { useState } from "react";', 'import { useState } from "react";\nimport DashboardHeader from "@/components/shared/DashboardHeader";');
}

const startTag = '<header className="sticky top-0 z-40 border-b border-gray-100 bg-white/95 backdrop-blur-md">';
const startIdx = content.indexOf(startTag);
if (startIdx !== -1) {
  const endTag = '</header>';
  // There are two headers in this file... the first one is the navigation duplicated one!
  // Wait, let's find the first </header> after startIdx
  const endIdx = content.indexOf(endTag, startIdx) + endTag.length;
  
  if (endIdx !== -1) {
    const replacement = `      <DashboardHeader
        user={user}
        tier={tier}
        isCeo={isCeo}
        showBackLink
      />`;

    content = content.substring(0, startIdx) + replacement + content.substring(endIdx);
    fs.writeFileSync('app/(dashboard)/integrations/ClientPage.tsx', content);
    console.log("Replacement successful!");
  }
} else {
  console.log("Not found.");
}
