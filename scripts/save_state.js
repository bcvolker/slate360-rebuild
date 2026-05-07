const fs = require('fs');

// 1. Update SLATE360_MASTER_BUILD_PLAN.md
let plan = fs.readFileSync('SLATE360_MASTER_BUILD_PLAN.md', 'utf8');
plan = plan.replace(/## Phase 1: Foundation(.*?)\n/i, (match) => {
    return '## Phase 1: Foundation (COMPLETE ✅)\n\n**STATUS: OFFICIALLY COMPLETE**\n\nThe following modules have been completed and locked into the Core Rulebooks:\n- **App-Neutral Shell**\n- **Account/Team Hub**\n- **Site Walk 3-Tab Workspace**\n- **Plan Viewer Pinning Engine**\n- **Coordination Hub**\n\n';
});
// Handle if we couldn't match specifically
if (!plan.includes('OFFICIALLY COMPLETE')) {
    // try alternative replacement if it's "Phase 1 - " or similar
   plan = plan.replace(/### Phase 1[^\n]*\n/i, '### Phase 1: Foundation (COMPLETE ✅)\n\n**STATUS: OFFICIALLY COMPLETE**\n\nCompleted Modules:\n- App-Neutral Shell\n- Account/Team Hub\n- Site Walk 3-Tab Workspace\n- Plan Viewer Pinning Engine\n- Coordination Hub\n\n');
}
fs.writeFileSync('SLATE360_MASTER_BUILD_PLAN.md', plan);

// 2. Update SLATE360_PROJECT_MEMORY.md
let memory = fs.readFileSync('SLATE360_PROJECT_MEMORY.md', 'utf8');
if (!memory.includes('unified under the Dark Glass & Amber')) {
    // Find Architecture & Design section
    memory = memory.replace(/(## Architecture & Design\n)/, `$1\n**SAVE STATE - MAY 2026:**\n- The \`_legacy_v1\` tree has been completely purged.\n- The entire application is now strictly unified under the 'Dark Glass & Amber' design token system utilizing the isolated \`<GlassCard>\` component.\n\n`);
}
fs.writeFileSync('SLATE360_PROJECT_MEMORY.md', memory);

// 3. Update ONGOING_ISSUES.md
let issues = fs.readFileSync('ONGOING_ISSUES.md', 'utf8');
// remove lines having "legacy blue", "re-rendering lag", "shell bleed"
const lines = issues.split('\n');
const filteredLines = lines.filter(line => {
    const l = line.toLowerCase();
    return !(
        l.includes('legacy blue') || 
        l.includes('re-rendering lag') || 
        l.includes('shell bleed') ||
        l.includes('hardcoded blue') ||
        l.includes('capture screen') && l.includes('lag')
    );
});
fs.writeFileSync('ONGOING_ISSUES.md', filteredLines.join('\n'));

console.log('Save State completed via Node.');
