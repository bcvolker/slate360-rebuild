const fs = require('fs');
let code = fs.readFileSync('components/shared/MobileTopBar.tsx', 'utf8');

code = code.replace(
  'aria-label="Invite and Share"',
  'aria-label="Invite to Slate360"\n            title="Invite to Slate360"'
);

fs.writeFileSync('components/shared/MobileTopBar.tsx', code);
console.log("Patched MobileTopBar");
