const fs = require('fs');
let code = fs.readFileSync('app/(dashboard)/operations-console/[section]/page.tsx', 'utf8');

code = code.replace(/sky-400/g, 'amber-400');
code = code.replace(/sky-200/g, 'amber-200');

if (!code.includes('GlassCard')) {
  code = code.replace(/import \{ OperationsConsoleNav \}/, 'import { GlassCard } from "@/components/shared/GlassCard";\nimport { OperationsConsoleNav }');
  code = code.replace(/<section className="rounded-3xl border border-white\/10 bg-white\/5 p-6 shadow-lg backdrop-blur-md">/g, '<GlassCard className="p-6">');
  code = code.replace(/<section className="rounded-3xl border border-amber-400\/20 bg-amber-400\/10 p-6 shadow-lg backdrop-blur-md">/g, '<GlassCard className="p-6 border-amber-400/20 bg-amber-400/10">');
  code = code.replace(/<\/section>/g, '</GlassCard>');
}
fs.writeFileSync('app/(dashboard)/operations-console/[section]/page.tsx', code);
