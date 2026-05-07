const fs = require('fs');
let code = fs.readFileSync('components/dashboard/OperationsConsoleClient.tsx', 'utf8');

code = code.replace(/sky-400\/15 text-sky-100/g, 'amber-400/15 text-amber-100');
code = code.replace(/bg-sky-900\/40/g, 'bg-amber-900/40');
code = code.replace(/text-sky-300/g, 'text-amber-300');
code = code.replace(/ring-sky-400\/20/g, 'ring-amber-400/20');

// Replace table wrappers with GlassCard
if (!code.includes('GlassCard')) {
  code = code.replace(/import \{ OperationsConsoleNav \}/, 'import { GlassCard } from "@/components/shared/GlassCard";\nimport { OperationsConsoleNav }');
  code = code.replace(/<div className="overflow-x-auto rounded-3xl border border-white\/10 bg-white\/5 shadow-lg backdrop-blur-md">/g, '<GlassCard className="overflow-x-auto">');
  code = code.replace(/<div className="rounded-2xl border border-white\/10 bg-white\/5 p-4 shadow-lg backdrop-blur-md">/g, '<GlassCard className="p-4">');
  
  // Actually, wait, replacing specific wrappers may leave closing divs broken. I'll just change the classNames to `<GlassCard className="...">` and replace `<div ` to `<GlassCard ` if I can precisely match, but string replace of just the opening tag is risky unless I also replace the closing tag.
  // Wait, I can just replace `rounded-3xl border border-white/10 bg-white/5` with `rounded-3xl border border-white/10 bg-slate-900/60` and skip the tag change if it's already a glass look but we want the exact GlassCard component. Let's just use regex for both.
}

fs.writeFileSync('components/dashboard/OperationsConsoleClient.tsx', code);
