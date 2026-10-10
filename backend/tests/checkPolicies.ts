import { supabaseAdmin } from '../src/config/supabase';

async function checkPolicies() {
  console.log('=== CHECKING RLS POLICIES ===');
  
  // Test what an authenticated user sees when querying officers and staff_profiles
  const { data: emUser } = await supabaseAdmin.from('profiles').select('*').eq('email', 'em@gmail.com').maybeSingle();
  console.log('User em@gmail.com:', emUser);

  if (emUser) {
    const { data: off, error: offErr } = await supabaseAdmin.from('officers').select('*').eq('user_id', emUser.id);
    console.log('Officer via admin:', off, offErr);

    const { data: staff, error: staffErr } = await supabaseAdmin.from('staff_profiles').select('*').eq('id', emUser.id);
    console.log('Staff via admin:', staff, staffErr);
  }
}

checkPolicies().catch(console.error);
