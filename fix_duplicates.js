const fs = require('fs');

// Fix DashboardClient.tsx
let path = './components/dashboard/DashboardClient.tsx';
let content = fs.readFileSync(path, 'utf8');
content = content.replace('const [slateDropFiles, setSlateDropFiles] = useState<any[]>([]);\n  const [slateDropFiles, setSlateDropFiles] = useState<any[]>([]);', 'const [slateDropFiles, setSlateDropFiles] = useState<any[]>([]);');
fs.writeFileSync(path, content);

// Fix buy route
path = './app/api/market/buy/route.ts';
content = fs.readFileSync(path, 'utf8');
content = content.replace('const admin = createAdminClient();\n    const admin = createAdminClient();', 'const admin = createAdminClient();');
fs.writeFileSync(path, content);

console.log('Fixed duplicates');
