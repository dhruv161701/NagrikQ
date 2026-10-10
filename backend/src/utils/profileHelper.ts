import { supabaseAdmin } from '../config/supabase';

export interface EnsureProfileInput {
  email?: string;
  fullName?: string;
  phone?: string;
  role?: string;
}

/**
 * Guarantees that a user row exists in the `profiles` table to prevent
 * PostgreSQL foreign key violations (code 23503) on applications, queue_tokens, documents, etc.
 */
export async function ensureUserProfileExists(
  userId: string,
  meta?: EnsureProfileInput
): Promise<boolean> {
  if (!userId) return false;

  try {
    // 1. Fast check if profile already exists
    const { data: existing } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, role')
      .eq('id', userId)
      .maybeSingle();

    if (existing) {
      return true;
    }

    // 2. Fetch auth user from Supabase Auth admin if metadata is missing
    let email = meta?.email;
    let fullName = meta?.fullName;
    let phone = meta?.phone;
    let role = meta?.role || 'citizen';

    if (!email || !fullName) {
      try {
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId);
        if (authUser?.user) {
          email = email || authUser.user.email || `${userId}@nagrikq.local`;
          fullName =
            fullName ||
            authUser.user.user_metadata?.full_name ||
            authUser.user.user_metadata?.name ||
            email.split('@')[0];
          phone =
            phone ||
            authUser.user.phone ||
            authUser.user.user_metadata?.phone ||
            '+91 9876543210';
          role = role || authUser.user.user_metadata?.role || 'citizen';
        }
      } catch {
        // Fallback defaults below
      }
    }

    email = email || `${userId.slice(0, 8)}@nagrikq.local`;
    fullName = fullName || 'Nagrik User';
    phone = phone || '+91 9876543210';

    // 3. Upsert into public.profiles
    const { error: upsertErr } = await supabaseAdmin.from('profiles').upsert(
      {
        id: userId,
        full_name: fullName,
        email: email,
        phone: phone,
        role: role as any,
        onboarding_completed: true,
        tour_completed: true,
        state: 'Gujarat',
        district: 'Rajkot',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'id' }
    );

    if (upsertErr) {
      console.warn(`[PROFILE_HELPER] Profile upsert notice for user ${userId}:`, upsertErr.message);
      return false;
    }

    console.log(`[PROFILE_HELPER] Successfully ensured profile exists for user ${userId} (${email})`);
    return true;
  } catch (err: any) {
    console.warn(`[PROFILE_HELPER] Error ensuring profile for ${userId}:`, err?.message || err);
    return false;
  }
}
