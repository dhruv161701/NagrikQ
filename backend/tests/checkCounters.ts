import { supabaseAdmin } from '../src/config/supabase';

async function checkCountersTable() {
  const { data, error } = await supabaseAdmin.from('counters').select('*').limit(1);
  console.log('Counters select:', data, error);

  // Check columns via information_schema or insert a test row and rollback
  const testCounter = {
    counter_number: 'C-01',
    name: 'Counter 1',
    counter_type: 'VERIFICATION',
    status: 'ACTIVE',
  };
  const { data: ins, error: insErr } = await supabaseAdmin.from('counters').insert(testCounter).select('*');
  console.log('Test counter insert:', ins, insErr);
}

checkCountersTable().catch(console.error);
