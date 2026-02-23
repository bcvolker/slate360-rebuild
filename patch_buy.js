const fs = require('fs');
const path = './app/api/market/buy/route.ts';
let content = fs.readFileSync(path, 'utf8');

const importMarker = 'import { createClient } from "@/lib/supabase/server";';
const newImport = 'import { createClient } from "@/lib/supabase/server";\nimport { createAdminClient } from "@/lib/supabase/admin";';
content = content.replace(importMarker, newImport);

const supabaseMarker = 'const supabase = await createClient();';
const newSupabase = 'const supabase = await createClient();\n    const admin = createAdminClient();';
content = content.replace(supabaseMarker, newSupabase);

const insertMarker = 'const { data: trade, error } = await supabase';
const newInsert = 'const { data: trade, error } = await admin';
content = content.replace(new RegExp(insertMarker, 'g'), newInsert);

fs.writeFileSync(path, content);
console.log('Patched Buy API');
