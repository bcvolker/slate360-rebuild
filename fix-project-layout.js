const fs = require('fs');

let content = fs.readFileSync('app/(dashboard)/project-hub/[projectId]/layout.tsx', 'utf-8');

const importStr = `import DashboardHeader from "@/components/shared/DashboardHeader";
import { resolveServerOrgContext } from "@/lib/server/org-context";
`;

content = content.replace('import Link from "next/link";', importStr + 'import Link from "next/link";');

// Also remove QuickNav import
content = content.replace('import QuickNav from "@/components/shared/QuickNav";\n', '');

// We need to fetch resolveServerOrgContext
const oldAuth = `  const {
    data: { user },
  } = await supabase.auth.getUser();`;

const newAuth = `  const { user, tier, isSlateCeo } = await resolveServerOrgContext();`;

content = content.replace(oldAuth, newAuth);

// Now replace the top row
const oldTopRow = `          {/* Top row: logo + back button + quick nav */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="shrink-0">
                <img src="/logo.svg" alt="Slate360" className="h-7 w-auto" />
              </Link>
              <Link
                href="/project-hub"
                className="hidden sm:flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-[#FF4D00] transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                Project Hub
              </Link>
            </div>
            <QuickNav />
          </div>`;

content = content.replace(oldTopRow, '');

// Also, the <header> should be updated. We want to put DashboardHeader OUTSIDE the project header.
content = content.replace('<header className="sticky top-0 z-30 border-b border-gray-100 bg-white/95 backdrop-blur-md">', `
      <DashboardHeader
        user={{
          name: user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "User",
          email: user.email ?? "",
          avatar: user.user_metadata?.avatar_url ?? undefined,
        }}
        tier={tier}
        isCeo={isSlateCeo}
        showBackLink
      />\n      <div className="sticky top-0 z-30 border-b border-gray-100 bg-white/95 backdrop-blur-md">`);
      
content = content.replace('</header>', '</div>');

fs.writeFileSync('app/(dashboard)/project-hub/[projectId]/layout.tsx', content);
console.log("Replaced layout successfully!");
