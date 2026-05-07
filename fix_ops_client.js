const fs = require('fs');
let code = fs.readFileSync('components/dashboard/OperationsConsoleClient.tsx', 'utf8');

// Insert GlassCard import
if (!code.includes('GlassCard')) {
  code = code.replace(/import \{ OperationsConsoleNav \}/, 'import { GlassCard } from "@/components/shared/GlassCard";\nimport { OperationsConsoleNav }');
}

// Replace Light Mode colors to dark glass aesthetic
code = code.replace(/bg-white/g, 'bg-slate-950');
code = code.replace(/bg-gray-50/g, 'bg-slate-900');
code = code.replace(/border-gray-200/g, 'border-white/10');
code = code.replace(/text-gray-900/g, 'text-slate-50');
code = code.replace(/text-gray-700/g, 'text-slate-300');
code = code.replace(/text-gray-500/g, 'text-slate-400');
code = code.replace(/text-gray-600/g, 'text-slate-400');
code = code.replace(/bg-gray-200/g, 'bg-slate-700');
code = code.replace(/text-gray-400/g, 'text-slate-500');

// Replace Blue to Amber
code = code.replace(/text-blue-600/g, 'text-amber-400');
code = code.replace(/text-blue-700/g, 'text-amber-500');
code = code.replace(/bg-blue-50/g, 'bg-amber-400/10');
code = code.replace(/bg-blue-100/g, 'bg-amber-400/20');
code = code.replace(/bg-blue-600/g, 'bg-amber-500');
code = code.replace(/hover:bg-blue-700/g, 'hover:bg-amber-400');
code = code.replace(/hover:text-blue-800/g, 'hover:text-amber-300');
code = code.replace(/border-blue-200/g, 'border-amber-400/20');
code = code.replace(/ring-blue-500/g, 'ring-amber-500');

// Replace hardcoded shadows and rounded
code = code.replace(/shadow-sm/g, ''); // Reduce messy shadow
code = code.replace(/sm:rounded-lg/g, '');

// Convert main sections wrapping to GlassCard
// Instead of replacing blindly, we can transform `div.bg-slate-950.shadow` to `GlassCard`
code = code.replace(/<div className="overflow-hidden bg-slate-950 shadow ">(.*?)<\/div>/gs, '<GlassCard className="overflow-hidden mb-6">$1</GlassCard>');
code = code.replace(/<div className="bg-slate-950  shadow">/g, '<GlassCard className="mb-6 overflow-hidden">');

// Specific replacement for exact structure
code = code.replace(/<div className="overflow-hidden bg-slate-950  shadow overflow-x-auto">/g, '<GlassCard className="overflow-hidden overflow-x-auto mb-6">');
code = code.replace(/<div className="bg-slate-950 p-6  shadow">/g, '<GlassCard className="p-6 mb-6">');
code = code.replace(/<div className="overflow-hidden bg-slate-950 shadow">/g, '<GlassCard className="overflow-hidden mb-6">');

fs.writeFileSync('components/dashboard/OperationsConsoleClient.tsx', code);
