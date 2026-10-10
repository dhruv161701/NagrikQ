import { supabaseAdmin } from '../src/config/supabase';

async function checkCountersColumns() {
  
  // Try selecting specific common columns
  const candidateCols = ['id', 'counter_number', 'name', 'status', 'office_id', 'assigned_officer_id', 'assigned_employee_id', 'created_at', 'updated_at'];
  for (const c of candidateCols) {
    const { error: cErr } = await supabaseAdmin.from('counters').select(c).limit(0);
    console.log(`Column "${c}":`, cErr ? `NO (${cErr.message})` : 'EXISTS');
  }
}

checkCountersColumns().catch(console.error);
