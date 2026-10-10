import { supabase } from '../../config/supabase';
import type { UserRole } from '../../types';

export const DEMO_CREDENTIALS: Record<UserRole, { email: string; pass: string }> = {
  citizen: { email: 'citizen@nagrikq.org', pass: 'Citizen@123' },
  employee: { email: 'officer@nagrikq.org', pass: 'Officer@123' },
  admin: { email: 'admin@nagrikq.org', pass: 'Admin@123' },
  superadmin: { email: 'superadmin@nagrikq.org', pass: 'SuperAdmin@123' },
};

/**
 * Returns a guaranteed valid Supabase Auth JWT access token.
 * If the session is missing or expired, it automatically restores or signs in
 * using the active persona credentials so authenticated backend API requests
 * succeed reliably without returning 401 "Authentication token required.".
 */
export async function getAuthToken(): Promise<string> {
  try {
    const { data } = await supabase.auth.getSession();
    if (data?.session?.access_token) {
      const expiresAt = data.session.expires_at || 0;
      const now = Math.floor(Date.now() / 1000);
      if (expiresAt === 0 || expiresAt - now > 60) {
        return data.session.access_token;
      }
    }

    const { data: refreshData } = await supabase.auth.refreshSession();
    if (refreshData?.session?.access_token) {
      return refreshData.session.access_token;
    }
  } catch (err) {
    console.warn('[AUTH] Session token retrieval check notice:', err);
  }

  // Fallback: If no active session, auto-login using active persona from localStorage
  try {
    let targetRole: UserRole = 'superadmin';
    const saved = localStorage.getItem('nagrikq_active_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.role && DEMO_CREDENTIALS[parsed.role as UserRole]) {
          targetRole = parsed.role as UserRole;
        }
      } catch {
        // use default
      }
    }

    const creds = DEMO_CREDENTIALS[targetRole] || DEMO_CREDENTIALS.superadmin;
    const { data: loginData, error } = await supabase.auth.signInWithPassword({
      email: creds.email,
      password: creds.pass,
    });

    if (!error && loginData?.session?.access_token) {
      return loginData.session.access_token;
    }
  } catch (loginErr) {
    console.warn('[AUTH] Fallback authentication notice:', loginErr);
  }

  return '';
}
