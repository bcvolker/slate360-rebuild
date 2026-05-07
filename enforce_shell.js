const fs = require('fs');

function replaceInFile(filePath, replacements) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    for (const [search, replace] of replacements) {
        content = content.replace(search, replace);
    }
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${filePath}`);
}

// 1. QuickActionsCard.tsx
replaceInFile('components/dashboard/command-center/QuickActionsCard.tsx', [
    [
        /<Link\s*href="\/site-walk"\s*className="flex[^>]*>\s*<MapPin[^>]*>\s*<span[^>]*>Start Site Walk<\/span>\s*<\/Link>/i,
        `<Link
            href="/projects?new=1"
            className="flex items-center gap-2 rounded-xl bg-amber-500/10 px-4 py-2 font-semibold text-amber-500 hover:bg-amber-500/20 transition-colors"
          >
            <FolderPlus size={16} />
            <span className="text-xs">New Project</span>
          </Link>
          <Link
            href="/slatedrop/upload"
            className="flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 font-semibold text-slate-300 hover:bg-slate-700 transition-colors"
          >
            <FileUp size={16} />
            <span className="text-xs">Upload File</span>
          </Link>`
    ],
    [
        /import\s*\{\s*(.*?)MapPin(.*?)(\s*\}\s*from\s*"lucide-react")/,
        (m, p1, p2, p3) => `import { ${p1}FolderPlus, FileUp${p2 ? ',' + p2 : ''}${p3}`
    ],
    // Clean up MapPin if it wasn't caught by the above neatly
    [
        /MapPin,\s*/g,
        ''
    ],
    [
        /,\s*MapPin/g,
        ''
    ]
]);

// 2. QuickNav.tsx
replaceInFile('components/shared/QuickNav.tsx', [
    [
        /\{\s*label:\s*"Site Walk",\s*href:\s*"\/site-walk",\s*icon:\s*MapPin\s*\},?\n?/g,
        ''
    ],
    [
        /import\s*\{\s*(.*?)MapPin(.*?)(\s*\}\s*from\s*"lucide-react")/,
        (m, p1, p2, p3) => `import { ${p1}${p2 ? p2.replace(/^\,\s*/, '') : ''}${p3}`
    ]
]);

// 3. DashboardSidebar.tsx
replaceInFile('components/dashboard/command-center/DashboardSidebar.tsx', [
    [
        /\{\s*label:\s*"Site Walk",\s*icon:\s*MapPin,\s*href:\s*"\/site-walk\/walks",\s*matchPrefix:\s*"\/site-walk"\s*\},?\n?/g,
        ''
    ],
    [
        /import\s*\{\s*(.*?)MapPin(.*?)(\s*\}\s*from\s*"lucide-react")/,
        (m, p1, p2, p3) => `import { ${p1}${p2 ? p2.replace(/^\,\s*/, '') : ''}${p3}`
    ]
]);

// 4. CommandPalette.tsx
replaceInFile('components/shared/CommandPalette.tsx', [
    [
        /\{\s*id:\s*"new-walk"[^\}]*"\/site-walk\?new=1"[^\}]*\},?\n?/g,
        ''
    ] // keep the app launcher shortcut if wanted, but remove new-walk
]);

