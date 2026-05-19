const fs = require('fs');

let header = fs.readFileSync('components/site-walk/v1/SiteWalkV1Header.tsx', 'utf8');
header = header.replace('bg-zinc-900/80', 'bg-[#0B0F15]/88');
header = header.replace(/bg-zinc-900/g, 'bg-[#0B0F15]');
fs.writeFileSync('components/site-walk/v1/SiteWalkV1Header.tsx', header);

let shell = fs.readFileSync('components/site-walk/v1/SiteWalkV1Shell.tsx', 'utf8');
shell = shell.replace('bg-zinc-950', 'bg-[#0B0F15]');
fs.writeFileSync('components/site-walk/v1/SiteWalkV1Shell.tsx', shell);

console.log("Patched backgrounds");
