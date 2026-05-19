const fs = require('fs');
let code = fs.readFileSync('components/dashboard/command-center/CommandCenterContent.tsx', 'utf8');

// Update text-[11px] to text-[12px]
code = code.replace(
  'py-2 text-[11px] font-medium text-zinc-500',
  'py-2 text-[12px] font-medium text-zinc-500'
);

// Update px-4 py-6 to px-3 pt-2 pb-6
code = code.replace(
  'className="min-h-0 flex-1 overflow-y-auto px-4 py-6"',
  'className="min-h-0 flex-1 overflow-y-auto px-3 pt-2 pb-6"'
);

fs.writeFileSync('components/dashboard/command-center/CommandCenterContent.tsx', code);
console.log("Patched CommandCenterContent");
