const fs = require('fs');

// 1. Update HomeView on SiteWalk
let homeView = fs.readFileSync('components/site-walk/v1/views/HomeView.tsx', 'utf8');
// remove justify-center to move it up, add pt-4 to match command center
homeView = homeView.replace(
  'className="flex min-h-0 flex-col justify-center gap-y-5"',
  'className="flex min-h-0 flex-col justify-start gap-y-5 pt-4"'
);
fs.writeFileSync('components/site-walk/v1/views/HomeView.tsx', homeView);

// 2. Update CommandCenterContent
let commandCenter = fs.readFileSync('components/dashboard/command-center/CommandCenterContent.tsx', 'utf8');

// Replace the Twin block with actual tile
const oldTwinBlock = `{/*
           * Slate360 Twin tile intentionally omitted.
           * Track B must provide a real route (e.g. /ceo/twin) before this tile
           * can be wired. Once Track B ships:
           *   1. Add a real href here (e.g. href="/ceo/twin").
           *   2. Gate with isSlateCeo (already passed as prop).
           *   3. Remove this comment block.
           * Do NOT add a placeholder or Coming Soon tile.
           */}`;

const newTwinBlock = `{isSlateCeo && (
            <AppTile
              href="#"
              name="Slate360 Twin"
              tagline="Owner Preview"
              icon={Box}
            />
          )}`;

commandCenter = commandCenter.replace(oldTwinBlock, newTwinBlock);

// Grid layout for Your Apps to be symmetrical if both exist
// Actually by default it's `grid gap-3`. If CEO has both, let's make it `grid gap-3 sm:grid-cols-2`
commandCenter = commandCenter.replace(
  '<div className="grid gap-3">',
  '<div className="grid gap-3 sm:grid-cols-2">'
);

// We need Box icon for Twin if not already imported
// It IS already imported because we added Box for Deliverables in the previous prompt.
fs.writeFileSync('components/dashboard/command-center/CommandCenterContent.tsx', commandCenter);

// Update bottom-fades to use graphite token for safety
let listPanel = fs.readFileSync('components/site-walk/v1/SiteWalkV1ListPanel.tsx', 'utf8');
listPanel = listPanel.replace('from-zinc-900/90', 'from-[#0B0F15]/90');
listPanel = listPanel.replace('bg-zinc-900/40', 'bg-white/[0.03]');
fs.writeFileSync('components/site-walk/v1/SiteWalkV1ListPanel.tsx', listPanel);

let ccContent = fs.readFileSync('components/dashboard/command-center/CommandCenterContent.tsx', 'utf8');
ccContent = ccContent.replace('from-zinc-900/90', 'from-[#0B0F15]/90');
ccContent = ccContent.replace('bg-zinc-900/40', 'bg-white/[0.03]');
fs.writeFileSync('components/dashboard/command-center/CommandCenterContent.tsx', ccContent);

console.log("Patched layout files");
