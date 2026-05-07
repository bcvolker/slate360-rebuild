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

replaceInFile('components/dashboard/command-center/QuickActionsCard.tsx', [
    [/<Link\s*href="\/site-walk">\s*<MapPin[^>]*>\s*<span[^>]*>Start Site Walk<\/span>\s*<\/Link>/is,
     '<Link href="/slatedrop/upload">\n              <FileUp className="h-5 w-5" />\n              <span className="text-xs">Upload File</span>\n            </Link>'],
    [/FolderPlus,\s*FileUp,\s*MapPin/, 'FolderPlus, FileUp'],
    [/import \{ [^\}]*\} from "lucide-react";/, (m) => m.replace(/,\s*MapPin/, '')]
]);

