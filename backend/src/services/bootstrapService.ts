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

    // 5. Automatically seed RAG knowledge chunks if empty
    await ensureKnowledgeBaseSeeded();
  } catch (err: any) {
    console.error('[BOOTSTRAP] Exception during Super Admin setup:', err.message);
  }
};

/**
 * Automatically index active services and document requirements into pgvector knowledge chunks
 */
export const ensureKnowledgeBaseSeeded = async (): Promise<void> => {
  try {
    const { count, error } = await supabaseAdmin
      .from('knowledge_chunks')
      .select('*', { count: 'exact', head: true });

    const { syncServiceKnowledgeChunks } = await import('./embeddingService');

    const { data: services, error: srvErr } = await supabaseAdmin.from('services').select('id, name');
    if (srvErr || !services || services.length === 0) {
      console.log('[BOOTSTRAP] No services found to index in RAG knowledge base.');
      return;
    }

    const { data: indexedChunks, error: chunkErr } = await supabaseAdmin
      .from('knowledge_chunks')
      .select('service_id');

    if (chunkErr) {
      console.warn('[BOOTSTRAP] Error querying knowledge_chunks:', chunkErr.message);
    }

    const indexedServiceIds = new Set((indexedChunks || []).map((c) => c.service_id));
    const unindexedServices = services.filter((s) => !indexedServiceIds.has(s.id));

    if (unindexedServices.length > 0) {
      console.log(`[BOOTSTRAP] Found ${unindexedServices.length} service(s) missing knowledge chunks. Initializing embeddings...`);
      for (const srv of unindexedServices) {
        await syncServiceKnowledgeChunks(srv.id);
      }
      console.log('✅ [BOOTSTRAP] RAG Knowledge Base successfully populated with service embeddings.');
    } else {
      console.log(`[BOOTSTRAP] RAG Knowledge Base is up to date (${services.length} services indexed).`);
    }
  } catch (err: any) {
    console.error('[BOOTSTRAP] Error seeding knowledge base:', err.message);
  }
};
