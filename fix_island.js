const fs = require('fs');
let code = fs.readFileSync('app/site-walk/(act-2-inputs)/capture/_components/CaptureClientIsland.tsx', 'utf8');

// Replace conditional camera render
code = code.replace(
  /\{viewMode === "camera" && \(\s*<CameraViewfinder/g,
  `{(viewMode === "camera" || viewMode === "data") && (\n        <div className="absolute inset-0 z-0 bg-black">\n          <CameraViewfinder`
);

// Close the div tag added above
code = code.replace(
  /setCameraType=\{setCameraType\}\s*\/>\s*\)}/g,
  `setCameraType={setCameraType}\n          />\n        </div>\n      )}`
);

// We need to enclose DataContextView in a bottom sheet
code = code.replace(
  /\{viewMode === "data" && \(\s*<DataContextView/g,
  `{viewMode === "data" && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end pointer-events-none">
          <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm pointer-events-auto" onClick={() => setViewMode("camera")}></div>
          <div className="relative flex h-[85dvh] w-full flex-col overflow-hidden rounded-t-[32px] bg-slate-950 shadow-2xl pointer-events-auto ring-1 ring-white/10 animate-in slide-in-from-bottom-full duration-300 ease-out">
            <DataContextView`
);

// Close the bottom sheet divs
code = code.replace(
  /onSaveFinishWalk=\{\(\) => \{\s*saveDraft\(\);\s*router\.push\("\/site-walk"\);\s*\}\}\s*\/>\s*\)}/g,
  `onSaveFinishWalk={() => {
              saveDraft();
              router.push("/site-walk");
            }}
          />
          </div>
        </div>
      )}`
);

fs.writeFileSync('app/site-walk/(act-2-inputs)/capture/_components/CaptureClientIsland.tsx', code);
