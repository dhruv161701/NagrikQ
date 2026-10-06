import { supabaseAdmin } from '../config/supabase';

export const ensureSuperAdminExists = async (): Promise<void> => {
  const superAdminEmail = 'superadmin@nagrikq.org';
  const superAdminPassword = 'SuperAdmin@123';

  try {
    console.log('[BOOTSTRAP] Checking Super Admin account status...');

    // 1. Check if user exists in Auth
    const { data: usersData, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    let userId: string | null = null;

    if (!listError && usersData?.users) {
      const existingUser = usersData.users.find((u) => u.email === superAdminEmail);
      if (existingUser) {
        userId = existingUser.id;
        // Update password to ensure known credentials work
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          password: superAdminPassword,
          email_confirm: true,
          user_metadata: { full_name: 'State Super Administrator', role: 'superadmin' },
        });
        console.log(`[BOOTSTRAP] Super Admin Auth user found (${userId}). Credentials updated.`);
      }
    }

    // 2. If Auth user does not exist, create it via Auth Admin API
    if (!userId) {
      const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: superAdminEmail,
        password: superAdminPassword,
        email_confirm: true,
        user_metadata: {
          full_name: 'State Super Administrator',
          role: 'superadmin',
        },
      });

      if (createError || !createData.user) {
        console.error('[BOOTSTRAP] Failed to create Super Admin Auth user:', createError?.message);
        return;
      }

      userId = createData.user.id;
      console.log(`[BOOTSTRAP] Created new Super Admin Auth user (${userId}).`);
    }

    // 3. Upsert profiles table with role = 'superadmin'
    const { error: profileError } = await supabaseAdmin.from('profiles').upsert(
      {
        id: userId,
        full_name: 'State Super Administrator',
        email: superAdminEmail,
        phone: '+91 9876543210',
        role: 'superadmin',
        state: 'Gujarat',
        district: 'Gandhinagar',
        onboarding_completed: true,
        tour_completed: true,
      },
      { onConflict: 'id' }
    );

    if (profileError) {
      console.error('[BOOTSTRAP] Profile upsert error:', profileError.message);
    }

    // 4. Upsert staff_profiles table with role = 'superadmin'
    const { error: staffError } = await supabaseAdmin.from('staff_profiles').upsert(
      {
        id: userId,
        user_id: userId,
        employee_id: 'EMP-SUPERADMIN-001',
        designation: 'Chief Digital Officer / Super Admin',
        department: 'General Administration Department',
        state: 'Gujarat',
        district: 'Gandhinagar',
        role: 'superadmin',
        status: 'ACTIVE',
      },
      { onConflict: 'id' }
    );

    if (staffError) {
      console.error('[BOOTSTRAP] Staff profile upsert error:', staffError.message);
    }

    console.log('✅ [BOOTSTRAP] Super Admin system account ready:');
    console.log(`   Email: ${superAdminEmail}`);
    console.log(`   Password: ${superAdminPassword}`);
    console.log('   Role: superadmin -> Route: /super-admin/dashboard');
  } catch (err: any) {
    console.error('[BOOTSTRAP] Exception during Super Admin setup:', err.message);
  }
};
