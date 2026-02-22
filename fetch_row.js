const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
  const { data, error } = await supabase
    .from('slatedrop_uploads')
    .select('org_id, folder_id, status, s3_key')
    .order('created_at', { ascending: false })
    .limit(1);
  console.log(JSON.stringify(data, null, 2));
  process.exit(0);
}
run();
