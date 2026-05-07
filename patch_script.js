const fs = require('fs');

const files = [
  'components/dashboard/my-account/AccountBillingTab.tsx',
  'components/dashboard/my-account/AccountProfileTab.tsx',
  'components/dashboard/my-account/AccountSecurityTab.tsx',
  'components/slatedrop/ProjectFileExplorer.tsx',
  'components/slatedrop/SlateDropFileArea.tsx'
];

function convertToGlassCard(filePath) {
  let lines = fs.readFileSync(filePath, 'utf8').split('\n');
  
  if (!lines.find(l => l.includes('GlassCard'))) {
    const importIdx = lines.findIndex(l => l.startsWith('import '));
    lines.splice(importIdx, 0, 'import GlassCard from "@/components/shared/GlassCard";');
  }

  const stack = [];
  for (let i = 0; i < lines.length; i++) {
    // 1. apply visual style sweeps on EVERY line
    lines[i] = lines[i]
      .replace(/bg-app-card/g, '')
      .replace(/bg-white\/\[0\.04\]/g, 'bg-amber-500/5 hover:bg-amber-500/10')
      .replace(/bg-white\/\[0\.06\]/g, 'bg-amber-500/10 hover:bg-amber-500/15')
      .replace(/text-zinc-100/g, 'text-slate-100')
      .replace(/text-zinc-200/g, 'text-slate-200')
      .replace(/text-zinc-300/g, 'text-slate-300')
      .replace(/text-zinc-400/g, 'text-slate-400')
      .replace(/text-zinc-500/g, 'text-slate-500')
      .replace(/text-zinc-600/g, 'text-slate-600')
      .replace(/text-zinc-700/g, 'text-slate-700')
      .replace(/border-app/g, 'border-white/10')
      .replace(/text-blue-500/g, 'text-amber-500')
      .replace(/bg-blue-600/g, 'bg-amber-500')
      .replace(/bg-blue-500/g, 'bg-amber-500')
      .replace(/bg-blue-50/g, 'bg-amber-50')
      .replace(/bg-zinc-700/g, 'bg-slate-700')
      .replace(/hover:bg-blue-700/g, 'hover:bg-amber-600')
      .replace(/shadow-app-blue-glow/g, 'shadow-amber-glow');

    // 2. Identify target `<div className="rounded-2xl...` opening tags
    const match = lines[i].match(/^(\s*)<div className="(?:rounded-2xl border|rounded-2xl bg-amber-500\/5|rounded-2xl).*?">/);
    if (match) {
        // we'll push the expected indent to the stack
        stack.push(match[1]);
        lines[i] = lines[i].replace(/<div className="rounded-2xl border border-white\/10\s*p-6">/, '<GlassCard className="p-6">');
        lines[i] = lines[i].replace(/<div className="rounded-2xl border border-amber-500\/30 bg-amber-500\/5 p-6">/, '<GlassCard className="p-6 border-amber-500/30 bg-amber-500/5">');
        lines[i] = lines[i].replace(/<div className="rounded-2xl bg-amber-500\/5 border border-white\/10 p-4">/, '<GlassCard className="p-4 bg-amber-500/5">');
        
        lines[i] = lines[i].replace(/<div className="rounded-2xl border border-white\/10 bg-\[\#151A23\] h-full flex flex-col">/, '<GlassCard className="h-full flex flex-col">');

        // Note: ProjectFileExplorer has some different wrappers, but let's blanket replace `rounded-2xl border` with `<GlassCard` but leave inner classes
        if (lines[i].includes('rounded-2xl')) {
            lines[i] = lines[i].replace(/<div className="rounded-2xl border border-white\/10 (.*?)">/, '<GlassCard className="$1">');
            lines[i] = lines[i].replace(/<div className="rounded-2xl (.*?)">/, '<GlassCard className="$1">');
        }
    }

    // 3. Match closing tags
    if (lines[i].match(/^(\s*)<\/div>/)) {
        const indent = lines[i].match(/^(\s*)<\/div>/)[1];
        if (stack.length > 0 && stack[stack.length - 1] === indent) {
            lines[i] = indent + '</GlassCard>';
            stack.pop();
        }
    }
  }

  fs.writeFileSync(filePath, lines.join('\n'));
}

files.forEach(convertToGlassCard);
