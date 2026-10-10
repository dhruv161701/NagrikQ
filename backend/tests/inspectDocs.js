require('dotenv').config();
const ws = require('ws');
if (typeof globalThis.WebSocket === 'undefined') {
  globalThis.WebSocket = ws;
}
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false },
  realtime: { transport: ws }
});

async function main() {
  const { data, error } = await supabase.from('documents').select('*');
  if (error) {
    console.error('Error:', error);
    return;
  }
  console.log('Docs count:', data?.length);
  if (data && data.length > 0) {
    console.log('Columns:', Object.keys(data[0]));
    console.log('Sample docs:', JSON.stringify(data, null, 2));
  }
}

main().catch(console.error);
