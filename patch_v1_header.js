const fs = require('fs');
let code = fs.readFileSync('components/site-walk/v1/SiteWalkV1Header.tsx', 'utf8');

// The instructions say: "Site Walk title should become more prominent. Left: back arrow to /app. Center/left text: Site Walk. Optional subtitle: Field capture & deliverables"

code = code.replace(
  'import { SlateLogo } from "@/components/shared/SlateLogo";',
  'import { SlateLogo } from "@/components/shared/SlateLogo";\nimport Link from "next/link";'
);

const oldBrand = `{/* Brand or title */}
      {showBranding ? (
        <div className="flex min-w-0 flex-1 items-center">
          <SlateLogo size="md" />
        </div>
      ) : (
        <h1 className="min-w-0 flex-1 truncate text-base font-semibold text-white">
          {title}
        </h1>
      )}`;

const newBrand = `{/* Brand or title */}
      {showBranding ? (
        <div className="flex min-w-0 flex-1 items-center gap-1">
          <Link
            href="/app"
            aria-label="Back to Slate360"
            className="flex size-9 items-center justify-center rounded-lg text-zinc-400 hover:bg-white/10 hover:text-white transition-colors mr-1"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div className="flex flex-col min-w-0">
            <h1 className="truncate text-[15px] font-black tracking-tight text-white leading-tight">
              Site Walk
            </h1>
            <p className="truncate text-[10px] uppercase tracking-[0.1em] text-amber-500/90 font-bold leading-tight">
              Field Capture
            </p>
          </div>
        </div>
      ) : (
        <h1 className="min-w-0 flex-1 truncate text-base font-semibold text-white">
          {title}
        </h1>
      )}`;

code = code.replace(oldBrand, newBrand);

fs.writeFileSync('components/site-walk/v1/SiteWalkV1Header.tsx', code);
console.log("Patched SiteWalkV1Header");
