const fs = require('fs');

// Fix DashboardClient.tsx
let path = './components/dashboard/DashboardClient.tsx';
let content = fs.readFileSync(path, 'utf8');
content = content.replace('import LocationMap from "./LocationMap";\nimport LocationMap from "./LocationMap";', 'import LocationMap from "./LocationMap";');
fs.writeFileSync(path, content);

// Fix buy route
path = './app/api/market/buy/route.ts';
content = fs.readFileSync(path, 'utf8');
content = content.replace('import { createAdminClient } from "@/lib/supabase/admin";\nimport { createAdminClient } from "@/lib/supabase/admin";', 'import { createAdminClient } from "@/lib/supabase/admin";');
fs.writeFileSync(path, content);

console.log('Fixed imports');
