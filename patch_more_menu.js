const fs = require('fs');
let code = fs.readFileSync('components/site-walk/v1/SiteWalkV1Header.tsx', 'utf8');

code = code.replace(
  '        <DropdownMenuItem className="gap-2 text-zinc-300 min-[400px]:hidden">\n          <Share2 className="size-4" /> Share / Invite\n        </DropdownMenuItem>',
  '        <DropdownMenuItem className="gap-2 text-zinc-300 min-[400px]:hidden">\n          <Share2 className="size-4" /> Share / Invite\n        </DropdownMenuItem>\n        <DropdownMenuItem asChild className="gap-2 text-zinc-300 cursor-pointer">\n          <Link href="/app"><ArrowLeft className="size-4" /> Back to Slate360</Link>\n        </DropdownMenuItem>'
);

fs.writeFileSync('components/site-walk/v1/SiteWalkV1Header.tsx', code);
console.log("Patched More menu");
