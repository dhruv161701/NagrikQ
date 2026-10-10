import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, UserRole, LanguageCode, UIMode } from '../types';
import { MOCK_USERS } from '../services/mockData';
import { authService } from '../services/auth/authService';
import type { UserProfile } from '../services/auth/authTypes';
import { supabase } from '../config/supabase';
import { DEMO_CREDENTIALS } from '../services/auth/authToken';

interface AuthContextType {
  currentUser: User | null;
  activeRole: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  loginWithGoogle: () => Promise<{ error?: string }>;
  loginWithEmail: (email: string, pass: string) => Promise<{ error?: string }>;
  registerWithEmail: (
    fullName: string,
    email: string,
    pass: string
  ) => Promise<{ error?: string; needVerification?: boolean }>;
  sendPasswordReset: (email: string) => Promise<{ error?: string }>;
  confirmPasswordReset: (newPassword: string) => Promise<{ error?: string }>;
  completeOnboarding: (details: {
    language: LanguageCode;
    dob: string;
    uiMode: UIMode;
  }) => void;
  switchUserRole: (role: UserRole) => void | Promise<void>;
  loginAs: (userKey: keyof typeof MOCK_USERS) => void | Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('nagrikq_active_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Sync currentUser with localStorage for persistent sessions
  const updateActiveUser = (user: User | null) => {
    setCurrentUser(user);
    if (user) {
      localStorage.setItem('nagrikq_active_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('nagrikq_active_user');
    }
  };

  // Convert internal UserProfile to application User
  const mapProfileToUser = (profile: UserProfile): User => {
    return {
      id: profile.id,
      name: profile.fullName,
      email: profile.email,
      phone: '+91 9876543210',
      role: profile.role,
      avatarUrl: profile.avatarUrl,
      dob: profile.dateOfBirth,
      age: profile.age,
      preferredLanguage: profile.preferredLanguage || 'en',
      preferredUIMode: profile.preferredUIMode || 'modern',
      onboardingCompleted: profile.onboardingCompleted,
    };
  };

  useEffect(() => {
    let isMounted = true;
    console.log('[AUTH] Initializing AuthProvider session check & listeners...');

    const handleSession = async (session: any, eventName: string) => {
      if (session?.user) {
        console.log(`[AUTH] Session event '${eventName}': User detected (${session.user.id})`);
        try {
          const profile = await authService.fetchProfileForUser(session.user);
          if (isMounted) {
            const mappedUser = mapProfileToUser(profile);
            console.log('[AUTH] Authenticated user loaded:', mappedUser.email, '| Role:', mappedUser.role);
            updateActiveUser(mappedUser);

            if (typeof window !== 'undefined' && window.location.hash && window.location.hash.includes('access_token')) {
              window.history.replaceState(null, '', window.location.pathname + window.location.search);
            }
          }
        } catch (err) {
          console.warn('[AUTH] Error loading profile for session user:', err);
        } finally {
          if (isMounted) setIsLoading(false);
        }
      } else {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    const initAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.warn('[AUTH] getSession error:', error.message);
        }
        if (isMounted) {
          if (data?.session?.user) {
            await handleSession(data.session, 'GET_SESSION');
          } else {
            // Restore Supabase Auth session if user persona is saved in localStorage
            const saved = localStorage.getItem('nagrikq_active_user');
            if (saved) {
              try {
                const parsed = JSON.parse(saved);
                if (parsed.role && DEMO_CREDENTIALS[parsed.role as UserRole]) {
                  const creds = DEMO_CREDENTIALS[parsed.role as UserRole];
                  const { data: loginData } = await supabase.auth.signInWithPassword({
                    email: creds.email,
                    password: creds.pass,
                  });
                  if (loginData?.session) {
                    await handleSession(loginData.session, 'RESTORED_SESSION');
                    return;
                  }
                }
              } catch {
                // fall through
              }
            }
            setIsLoading(false);
          }
        }
      } catch (err) {
        console.warn('[AUTH] Auth initialization error:', err);
        if (isMounted) setIsLoading(false);
      }
    };

    initAuth();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[AUTH] onAuthStateChange event received:', event);
        if (
          event === 'SIGNED_IN' ||
          event === 'INITIAL_SESSION' ||
          event === 'TOKEN_REFRESHED' ||
          event === 'USER_UPDATED'
        ) {
          if (session?.user) {
            await handleSession(session, event);
          } else if (event === 'INITIAL_SESSION') {
            if (isMounted) setIsLoading(false);
          }
        } else if (event === 'SIGNED_OUT') {
          console.log('[AUTH] User signed out');
          if (isMounted) {
            updateActiveUser(null);
            setIsLoading(false);
          }
        }
      }
    );

    // Proactive background session refresh heartbeat to keep super admin and officer sessions active (Fix 3)
    const refreshHeartbeat = setInterval(async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (data?.session) {
          const expiresAt = data.session.expires_at || 0;
          const nowSeconds = Math.floor(Date.now() / 1000);
          if (expiresAt - nowSeconds < 600) {
            await supabase.auth.refreshSession();
          }
        }
      } catch (err) {
        console.warn('[AUTH] Session refresh heartbeat notice:', err);
      }
    }, 60 * 1000);

    return () => {
      isMounted = false;
      clearInterval(refreshHeartbeat);
      authListener.subscription.unsubscribe();
    };
  }, []);

  const loginWithGoogle = async () => {
    setIsLoading(true);
    console.log('[AUTH] Initiating Google OAuth sign in...');
    const res = await authService.signInWithGoogle();
    if (res.error) {
      setIsLoading(false);
    }
    return res;
  };

  const loginWithEmail = async (email: string, pass: string) => {
    setIsLoading(true);
    const res = await authService.signInWithEmail(email, pass);
    if (res.user) {
      updateActiveUser(mapProfileToUser(res.user));
    }
    setIsLoading(false);
    return { error: res.error };
  };

  const registerWithEmail = async (fullName: string, email: string, pass: string) => {
    setIsLoading(true);
    const res = await authService.signUpWithEmail(fullName, email, pass);
    if (res.user) {
      updateActiveUser(mapProfileToUser(res.user));
    }
    setIsLoading(false);
    return { error: res.error, needVerification: res.needVerification };
  };

  const sendPasswordReset = async (email: string) => {
    return await authService.resetPasswordForEmail(email);
  };

  const confirmPasswordReset = async (newPassword: string) => {
    return await authService.updatePassword(newPassword);
  };

  const completeOnboarding = (details: {
    language: LanguageCode;
    dob: string;
    uiMode: UIMode;
  }) => {
    if (!currentUser) return;

    // Retrieve phone if saved during onboarding
    const onboardingPhone = sessionStorage.getItem('onboarding_phone');
    const formattedPhone = onboardingPhone ? `+91 ${onboardingPhone}` : currentUser.phone;

    // Calculate age from DOB string (DD/MM/YYYY or YYYY-MM-DD)
    let calculatedAge = 30;
    if (details.dob) {
      const parts = details.dob.includes('/')
        ? details.dob.split('/')
        : details.dob.split('-');
      let birthYear = 1995;
      if (parts.length === 3) {
        birthYear = parseInt(parts[parts.length - 1], 10) || 1995;
      }
      calculatedAge = new Date().getFullYear() - birthYear;
    }

    const updatedUser: User = {
      ...currentUser,
      phone: formattedPhone,
      preferredLanguage: details.language,
      dob: details.dob,
      age: calculatedAge,
      preferredUIMode: details.uiMode,
      onboardingCompleted: true,
    };

    updateActiveUser(updatedUser);

    const profile: UserProfile = {
      id: updatedUser.id,
      email: updatedUser.email,
      fullName: updatedUser.name,
      role: updatedUser.role,
      dateOfBirth: updatedUser.dob,
      age: updatedUser.age,
      preferredLanguage: updatedUser.preferredLanguage,
      preferredUIMode: updatedUser.preferredUIMode,
      onboardingCompleted: true,
      avatarUrl: updatedUser.avatarUrl,
    };

    authService.saveUpdatedProfile(profile);
  };

  const switchUserRole = async (role: UserRole) => {
    let mockKey: keyof typeof MOCK_USERS = 'citizen';
    if (role === 'employee') mockKey = 'employee';
    else if (role === 'admin') mockKey = 'admin';
    else if (role === 'superadmin') mockKey = 'superadmin';

    const targetUser = MOCK_USERS[mockKey];
    const userObj: User = {
      ...targetUser,
      onboardingCompleted: true,
    };
    updateActiveUser(userObj);

    authService.saveLocalProfile({
      id: userObj.id,
      email: userObj.email,
      fullName: userObj.name,
      role: userObj.role,
      dateOfBirth: userObj.dob,
      age: userObj.age,
      preferredLanguage: userObj.preferredLanguage,
      preferredUIMode: userObj.preferredUIMode,
      onboardingCompleted: true,
    });

    const creds = DEMO_CREDENTIALS[role];
    if (creds) {
      try {
        await supabase.auth.signInWithPassword({
          email: creds.email,
          password: creds.pass,
        });
      } catch (err) {
        console.warn('[AUTH] switchUserRole signInWithPassword notice:', err);
      }
    }
  };

  const loginAs = async (userKey: keyof typeof MOCK_USERS) => {
    if (MOCK_USERS[userKey]) {
      const targetUser = MOCK_USERS[userKey];
      const userObj: User = {
        ...targetUser,
        onboardingCompleted: true,
      };
      updateActiveUser(userObj);

      authService.saveLocalProfile({
        id: userObj.id,
        email: userObj.email,
        fullName: userObj.name,
        role: userObj.role,
        dateOfBirth: userObj.dob,
        age: userObj.age,
        preferredLanguage: userObj.preferredLanguage,
        preferredUIMode: userObj.preferredUIMode,
        onboardingCompleted: true,
      });

      const creds = DEMO_CREDENTIALS[targetUser.role];
      if (creds) {
        try {
          await supabase.auth.signInWithPassword({
            email: creds.email,
            password: creds.pass,
          });
        } catch (err) {
          console.warn('[AUTH] loginAs signInWithPassword notice:', err);
        }
      }
    }
  };

  const logout = async () => {
    setIsLoading(true);
    await authService.signOut();
    updateActiveUser(null);
    setIsLoading(false);
  };

  const activeRole: UserRole = currentUser ? currentUser.role : 'citizen';
  const isAuthenticated = currentUser !== null;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        activeRole,
        isAuthenticated,
        isLoading,
        loginWithGoogle,
        loginWithEmail,
        registerWithEmail,
        sendPasswordReset,
        confirmPasswordReset,
        completeOnboarding,
        switchUserRole,
        loginAs,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
