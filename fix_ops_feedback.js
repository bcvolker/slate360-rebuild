const fs = require('fs');
let code = fs.readFileSync('app/(dashboard)/operations-console/feedback/page.tsx', 'utf8');

code = code.replace(/sky-400/g, 'amber-400');
code = code.replace(/sky-200/g, 'amber-200');

// Add GlassCard to feedback if requested
if (!code.includes('GlassCard')) {
  code = code.replace(/import \{ OperationsConsoleNav \}/, 'import { GlassCard } from "@/components/shared/GlassCard";\nimport { OperationsConsoleNav }');
  code = code.replace(/<article className="rounded-3xl border border-white\/10 bg-white\/5 p-5 shadow-lg backdrop-blur-md">/g, '<GlassCard className="p-5">');
  code = code.replace(/<\/article>/g, '</GlassCard>');
}
fs.writeFileSync('app/(dashboard)/operations-console/feedback/page.tsx', code);
