const fs = require('fs');

// 2. Update SLATE360_PROJECT_MEMORY.md properly this time
let memory = fs.readFileSync('SLATE360_PROJECT_MEMORY.md', 'utf8');

if (!memory.includes('Save State - Architecture & Design')) {
    const newAddition = `\n## Save State - Architecture & Design (May 2026)\n- The \`_legacy_v1\` tree has been explicitly purged and removed from the active routing.\n- The entire application is strictly unified under the 'Dark Glass & Amber' design token system utilizing the \`<GlassCard>\` component.\n\n`;
    
    // Instead of replacing, just add it right after the main header or at the top
    memory = memory.replace(/^# .*\n/m, `$&${newAddition}`);
    fs.writeFileSync('SLATE360_PROJECT_MEMORY.md', memory);
}

