const fs = require('fs');
let code = fs.readFileSync('components/dashboard/command-center/AppsGrid.tsx', 'utf8');

// Filter out without access
code = code.replace(
  `const visible = APPS.filter((app) => !shouldHideInAppStoreMode(app.comingSoon));`,
  `const visible = APPS.filter((app) => {
    if (shouldHideInAppStoreMode(app.comingSoon)) return false;
    const hasAccess = !app.entitlement || (entitlements?.[app.entitlement] ?? false);
    return hasAccess;
  });`
);

fs.writeFileSync('components/dashboard/command-center/AppsGrid.tsx', code);
