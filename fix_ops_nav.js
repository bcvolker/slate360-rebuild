const fs = require('fs');
let code = fs.readFileSync('components/dashboard/operations-console/OperationsConsoleNav.tsx', 'utf8');

code = code.replace(/sky-400/g, 'amber-400');
code = code.replace(/sky-200/g, 'amber-200');

fs.writeFileSync('components/dashboard/operations-console/OperationsConsoleNav.tsx', code);
