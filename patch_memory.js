const fs = require('fs');

function addNote(file, note) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    if (!content.includes('Graphite Glass')) {
      content = content + '\n' + note + '\n';
      fs.writeFileSync(file, content);
    }
  }
}

const uiNote = `
### UI / Design System Status (May 2026)
1. Dashboard V3 is live desktop.
2. \`/app\` is the mobile/PWA Slate360 shell.
3. \`/site-walk\` is the Site Walk shell.
4. Slate360 Graphite Glass design system is now the UI source of truth (\`docs/SLATE360_GRAPHITE_GLASS_DESIGN_SYSTEM.md\`).
5. Future UI pages must follow the design-system contract.
6. Avoid navy/brown drift and excessive amber fills.
7. Track A owns app-shell/Site Walk UI.
8. Track B owns Digital Twin and must align visually without touching Track A UI files.
`;

addNote('SLATE360_PROJECT_MEMORY.md', uiNote);
addNote('docs/CONCURRENT_DEVELOPMENT_TRACKS.md', uiNote);
addNote('SLATE360_MASTER_BUILD_PLAN.md', uiNote);

console.log("Docs updated with UI notes");
