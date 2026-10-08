import { supabase } from '../../config/supabase';
import type { UserProfile, AuthResponse } from './authTypes';
import type { UserRole } from '../../types';

const LOCAL_STORAGE_PROFILE_KEY = 'nagrikq_user_profile';

export const authService = {
  /**
   * Initiate Google OAuth login via Supabase
   */
  async signInWithGoogle(): Promise<AuthResponse> {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/login`,
        },
      });

      if (error) {
        return { error: error.message };
      }
      return {};
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Google authentication failed.';
      return { error: message };
    }
  },

  /**
   * Sign in with Email and Password via Supabase Auth
   */
  async signInWithEmail(email: string, pass: string): Promise<AuthResponse> {
    try {
      // First attempt Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: pass,
      });

      if (!error && data.user) {
        const profile = await this.fetchProfileForUser(data.user);
        this.saveLocalProfile(profile);
        return { user: profile };
      }

      return { error: error?.message || 'Email or password is incorrect. Please try again.' };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred during sign in.';
      return { error: message };
    }
  },

  /**
   * Register a new user with Email and Password
   */
  async signUpWithEmail(fullName: string, email: string, pass: string): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: pass,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        return { error: error.message };
      }

      if (data.user) {
        const profile: UserProfile = {
          id: data.user.id,
          email: data.user.email || email,
          fullName: fullName || data.user.user_metadata?.full_name || 'Citizen User',
          role: 'citizen',
          onboardingCompleted: false, // New citizen needs onboarding!
        };

        this.saveLocalProfile(profile);

        // If email confirmation is required by Supabase setup
        if (data.session === null) {
          return { user: profile, needVerification: true };
        }

        return { user: profile };
      }

      return { error: 'Failed to create user account.' };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An error occurred during registration.';
      return { error: message };
    }
  },

  /**
   * Request password reset link via Supabase Auth
   */
  async resetPasswordForEmail(email: string): Promise<AuthResponse> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        return { error: error.message };
      }
      return {};
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send password reset link.';
      return { error: message };
    }
  },

  /**
   * Update password for currently authenticated user
   */
  async updatePassword(newPassword: string): Promise<AuthResponse> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        return { error: error.message };
      }
      return {};
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update password.';
      return { error: message };
    }
  },

  /**
   * Sign out user
   */
  async signOut(): Promise<void> {
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore cleanup error
    } finally {
      localStorage.removeItem(LOCAL_STORAGE_PROFILE_KEY);
    }
  },

  /**
   * Fetch current session & profile state
   */
  async getCurrentProfile(): Promise<UserProfile | null> {
    try {
      const { data } = await supabase.auth.getSession();
      if (data?.session?.user) {
        console.log('[AUTH] Session restored from getSession() for user:', data.session.user.id);
        return await this.fetchProfileForUser(data.session.user);
      } else {
        console.log('[AUTH] No active session found in getSession()');
      }
    } catch (err) {
      console.warn('[AUTH] Error in getCurrentProfile getSession:', err);
    }

    return null;
  },

  /**
   * Fetch user profile from Supabase DB or build initial profile for user
   */
  async fetchProfileForUser(sbUser: any): Promise<UserProfile> {
    console.log('[AUTH] Fetching profile for user ID:', sbUser.id);

    const userEmail = sbUser.email || '';
    const userId = sbUser.id;

    // Check persistent user-keyed onboarding flags
    const hasLocalCompletedOnboarding =
      localStorage.getItem(`nagrikq_onboarding_${userId}`) === 'true' ||
      (userEmail && localStorage.getItem(`nagrikq_onboarding_${userEmail}`) === 'true');

    // 1. First attempt to fetch from backend API /api/profile (bypasses RLS issues)
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (token) {
        const res = await fetch('/api/profile', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            const dbProf = json.data;
            const isCompleted = dbProf.onboarding_completed || hasLocalCompletedOnboarding || false;
            if (isCompleted) {
              localStorage.setItem(`nagrikq_onboarding_${userId}`, 'true');
              if (userEmail) localStorage.setItem(`nagrikq_onboarding_${userEmail}`, 'true');
            }

            const profile: UserProfile = {
              id: dbProf.id,
              email: dbProf.email || userEmail,
              fullName: dbProf.full_name || sbUser.user_metadata?.full_name || 'Citizen User',
              role: (dbProf.role as UserRole) || 'citizen',
              dateOfBirth: dbProf.date_of_birth,
              age: dbProf.age,
              preferredLanguage: dbProf.preferred_language || 'en',
              preferredUIMode: dbProf.ui_mode || 'modern',
              onboardingCompleted: isCompleted,
              avatarUrl: dbProf.avatar_url || sbUser.user_metadata?.avatar_url,
            };
            this.saveLocalProfile(profile);
            return profile;
          }
        }
      }
    } catch (apiErr) {
      console.warn('[AUTH] /api/profile fetch warning:', apiErr);
    }

    // 2. Direct Supabase query fallback (with recursion guard)
    try {
      const { data: dbProfile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sbUser.id)
        .maybeSingle();

      if (!error && dbProfile) {
        console.log('[AUTH] Found existing profile in Supabase DB for user:', sbUser.id);
        const isCompleted = dbProfile.onboarding_completed || hasLocalCompletedOnboarding || false;
        if (isCompleted) {
          localStorage.setItem(`nagrikq_onboarding_${userId}`, 'true');
          if (userEmail) localStorage.setItem(`nagrikq_onboarding_${userEmail}`, 'true');
        }

        const profile: UserProfile = {
          id: dbProfile.id,
          email: dbProfile.email || userEmail,
          fullName: dbProfile.full_name || sbUser.user_metadata?.full_name || 'Citizen User',
          role: (dbProfile.role as UserRole) || 'citizen',
          dateOfBirth: dbProfile.date_of_birth,
          age: dbProfile.age,
          preferredLanguage: dbProfile.preferred_language || 'en',
          preferredUIMode: dbProfile.ui_mode || 'modern',
          onboardingCompleted: isCompleted,
          avatarUrl: dbProfile.avatar_url || sbUser.user_metadata?.avatar_url,
        };
        this.saveLocalProfile(profile);
        return profile;
      }
    } catch (err) {
      console.warn('[AUTH] Database profile query failed or skipped:', err);
    }

    // 3. Fallback: build initial profile
    console.log('[AUTH] Creating initial profile structure for user:', sbUser.id);
    const local = this.getLocalProfile();
    const fullName =
      sbUser.user_metadata?.full_name ||
      sbUser.user_metadata?.name ||
      local?.fullName ||
      userEmail.split('@')[0] ||
      'Citizen User';

    const role: UserRole = sbUser.user_metadata?.role || local?.role || 'citizen';
    const onboardingCompleted = hasLocalCompletedOnboarding || (local && local.id === sbUser.id ? (local.onboardingCompleted ?? false) : false);

    const newProfile: UserProfile = {
      id: sbUser.id,
      email: userEmail,
      fullName,
      role,
      dateOfBirth: local?.dateOfBirth,
      age: local?.age,
      preferredLanguage: local?.preferredLanguage || 'en',
      preferredUIMode: local?.preferredUIMode || 'modern',
      onboardingCompleted,
      avatarUrl: sbUser.user_metadata?.avatar_url || local?.avatarUrl,
    };

    this.saveLocalProfile(newProfile);
    return newProfile;
  },

  /**
   * Update current profile data (language, DOB, UI mode, onboarding)
   */
  async saveUpdatedProfile(profile: UserProfile): Promise<UserProfile> {
    this.saveLocalProfile(profile);

    // Save persistent user-keyed onboarding flags
    if (profile.onboardingCompleted) {
      localStorage.setItem(`nagrikq_onboarding_${profile.id}`, 'true');
      if (profile.email) {
        localStorage.setItem(`nagrikq_onboarding_${profile.email}`, 'true');
      }
    }

    // 1. Sync via backend API /api/profile/onboarding
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (token) {
        await fetch('/api/profile/onboarding', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            fullName: profile.fullName,
            dateOfBirth: profile.dateOfBirth,
            age: profile.age,
            preferredLanguage: profile.preferredLanguage,
            preferredUIMode: profile.preferredUIMode,
            onboardingCompleted: profile.onboardingCompleted,
          }),
        });
        console.log('[AUTH] Updated profile synced via /api/profile/onboarding');
      }
    } catch (apiErr) {
      console.warn('[AUTH] Error syncing profile to backend API:', apiErr);
    }

    // 2. Also attempt direct DB update
    try {
      await supabase.from('profiles').upsert({
        id: profile.id,
        email: profile.email,
        full_name: profile.fullName,
        role: profile.role,
        date_of_birth: profile.dateOfBirth,
        age: profile.age,
        preferred_language: profile.preferredLanguage,
        ui_mode: profile.preferredUIMode,
        onboarding_completed: profile.onboardingCompleted,
        avatar_url: profile.avatarUrl,
        updated_at: new Date().toISOString(),
      });
      console.log('[AUTH] Updated profile synced to Supabase DB for user:', profile.id);
    } catch (err) {
      console.warn('[AUTH] Direct Supabase profile sync warning (handled):', err);
    }

    return profile;
  },

  // Helper methods
  buildProfileFromSupabaseUser(sbUser: any): UserProfile {
    const local = this.getLocalProfile();
    const fullName =
      sbUser.user_metadata?.full_name ||
      sbUser.user_metadata?.name ||
      local?.fullName ||
      sbUser.email?.split('@')[0] ||
      'Citizen User';

    const role: UserRole = sbUser.user_metadata?.role || local?.role || 'citizen';
    const onboardingCompleted =
      local && local.id === sbUser.id ? (local.onboardingCompleted ?? false) : false;

    return {
      id: sbUser.id,
      email: sbUser.email || '',
      fullName,
      role,
      dateOfBirth: local?.dateOfBirth,
      age: local?.age,
      preferredLanguage: local?.preferredLanguage || 'en',
      preferredUIMode: local?.preferredUIMode || 'modern',
      onboardingCompleted,
      avatarUrl: sbUser.user_metadata?.avatar_url || local?.avatarUrl,
    };
  },

  getLocalProfile(): UserProfile | null {
    try {
      const data = localStorage.getItem(LOCAL_STORAGE_PROFILE_KEY);
      if (data) {
        return JSON.parse(data) as UserProfile;
      }
    } catch {
      // Ignore
    }
    return null;
  },

  saveLocalProfile(profile: UserProfile): void {
    try {
      localStorage.setItem(LOCAL_STORAGE_PROFILE_KEY, JSON.stringify(profile));
    } catch {
      // Ignore
    }
  },
};
