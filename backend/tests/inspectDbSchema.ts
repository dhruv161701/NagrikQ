import { supabaseAdmin } from '../src/config/supabase';

async function inspectSchema() {
  console.log('=== INSPECTING SUPABASE TABLES ===');

  // Check tables: staff_profiles, officers, counters, applications, queue_tokens
  const tables = ['staff_profiles', 'officers', 'counters', 'applications', 'queue_tokens'];

  for (const table of tables) {
    try {
      const { data, error } = await supabaseAdmin.from(table).select('*').limit(2);
      if (error) {
        console.log(`Table "${table}": Error:`, error.message);
      } else {
        const columns = data && data[0] ? Object.keys(data[0]) : 'empty table';
        console.log(`Table "${table}":`, columns);
        if (data && data[0]) {
          console.log(`   Sample row:`, JSON.stringify(data[0], null, 2));
        }
      }
    } catch (e: any) {
      console.log(`Table "${table}" exception:`, e.message);
    }
  }

  // Check em2 or recent employee in profiles / staff_profiles / officers
  console.log('\n=== CHECKING EMPLOYEE em2 OR RECENT EMPLOYEES ===');
  const { data: emps } = await supabaseAdmin
    .from('profiles')
    .select('id, full_name, email, role')
    .eq('role', 'employee')
    .limit(10);
  console.log('Employees in profiles:', emps);

  if (emps && emps.length > 0) {
    for (const emp of emps) {
      const { data: staff } = await supabaseAdmin.from('staff_profiles').select('*').eq('id', emp.id).maybeSingle();
      const { data: officer } = await supabaseAdmin.from('officers').select('*').eq('user_id', emp.id).maybeSingle();
      console.log(`Employee ${emp.email} (${emp.id}):`);
      console.log('  staff_profile:', staff);
      console.log('  officer:', officer);
    }
  }

  // Check recent duplicate applications in applications table
  console.log('\n=== RECENT APPLICATIONS ===');
  const { data: recentApps } = await supabaseAdmin
    .from('applications')
    .select('id, application_number, user_id, service_id, status, submitted_at')
    .order('submitted_at', { ascending: false })
    .limit(5);
  console.log('Recent Applications:', recentApps);

  // Check recent queue tokens
  console.log('\n=== RECENT QUEUE TOKENS ===');
  const { data: recentTokens } = await supabaseAdmin
    .from('queue_tokens')
    .select('id, token_number, user_id, service_id, application_id, status, counter_number, current_counter, queue_date')
    .order('created_at', { ascending: false })
    .limit(5);
  console.log('Recent Tokens:', recentTokens);
}

inspectSchema().catch(console.error);
