const fs = require('fs');

// Patch 1: PlanToolbar.tsx - Remove position from the card so it floats normally defined by parents
let toolbar = fs.readFileSync('components/site-walk/capture/PlanToolbar.tsx', 'utf8');
toolbar = toolbar.replace(
  '    <GlassCard className="absolute inset-x-3 top-16 z-50 flex flex-col gap-2 bg-slate-950/75 p-2 backdrop-blur-xl">',
  '    <GlassCard className="flex flex-col gap-2 bg-slate-950/75 p-2 backdrop-blur-xl max-h-[40vh] overflow-y-auto w-full pointer-events-auto shadow-2xl">'
);
fs.writeFileSync('components/site-walk/capture/PlanToolbar.tsx', toolbar);

// Patch 2: CaptureClientIsland.tsx
let island = fs.readFileSync('app/site-walk/(act-2-inputs)/capture/_components/CaptureClientIsland.tsx', 'utf8');
island = island.replace(
  '    if (shouldReturnToPlan) {',
  '    if (shouldReturnToPlan) {\n      setWalkMode("plan");'
);
fs.writeFileSync('app/site-walk/(act-2-inputs)/capture/_components/CaptureClientIsland.tsx', island);
