import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User, UserRole, LanguageCode, UIMode } from '../types';
import { MOCK_USERS } from '../services/mockData';
import { authService } from '../services/auth/authService';
import type { UserProfile } from '../services/auth/authTypes';
import { supabase } from '../config/supabase';

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
  switchUserRole: (role: UserRole) => void;
  loginAs: (userKey: keyof typeof MOCK_USERS) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

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
            console.log('[AUTH] Authenticated user loaded:', mappedUser.email, '| Role:', mappedUser.role, '| Onboarding:', mappedUser.onboardingCompleted);
            setCurrentUser(mappedUser);
          }
        } catch (err) {
          console.warn('[AUTH] Error loading profile for session user:', err);
        } finally {
          if (isMounted) setIsLoading(false);
        }
      } else {
        console.log(`[AUTH] Session event '${eventName}': No user in session`);
        if (isMounted) {
          setCurrentUser(null);
          setIsLoading(false);
        }
      }
    };

    // 1. Restore initial session using getSession()
    const initAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.warn('[AUTH] getSession error:', error.message);
        }
        if (isMounted) {
          if (data?.session?.user) {
            console.log('[AUTH] Initial session restored via getSession()');
            await handleSession(data.session, 'GET_SESSION');
          } else {
            console.log('[AUTH] Initial getSession() returned no user. Waiting for auth state listener...');
            // Wait for onAuthStateChange (which handles hash detection) or resolve as unauthenticated after a short frame
            setTimeout(() => {
              if (isMounted && isLoading) {
                // If onAuthStateChange hasn't found a session yet, release loading state
                setIsLoading(false);
              }
            }, 500);
          }
        }
      } catch (err) {
        console.warn('[AUTH] Auth initialization error:', err);
        if (isMounted) setIsLoading(false);
      }
    };

    initAuth();

    // 2. Subscribe to Supabase auth state changes (OAuth callback, login, logout, token refresh)
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
            setCurrentUser(null);
            setIsLoading(false);
          }
        }
      }
    );

    return () => {
      isMounted = false;
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
      setCurrentUser(mapProfileToUser(res.user));
    }
    setIsLoading(false);
    return { error: res.error };
  };

  const registerWithEmail = async (fullName: string, email: string, pass: string) => {
    setIsLoading(true);
    const res = await authService.signUpWithEmail(fullName, email, pass);
    if (res.user) {
      setCurrentUser(mapProfileToUser(res.user));
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
      preferredLanguage: details.language,
      dob: details.dob,
      age: calculatedAge,
      preferredUIMode: details.uiMode,
      onboardingCompleted: true,
    };

    setCurrentUser(updatedUser);

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

  const switchUserRole = (role: UserRole) => {
    let mockKey: keyof typeof MOCK_USERS = 'citizen';
    if (role === 'employee') mockKey = 'employee';
    else if (role === 'admin') mockKey = 'admin';
    else if (role === 'superadmin') mockKey = 'superadmin';

    const targetUser = MOCK_USERS[mockKey];
    const userObj: User = {
      ...targetUser,
      onboardingCompleted: true,
    };
    setCurrentUser(userObj);

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
  };

  const loginAs = (userKey: keyof typeof MOCK_USERS) => {
    if (MOCK_USERS[userKey]) {
      const targetUser = MOCK_USERS[userKey];
      const userObj: User = {
        ...targetUser,
        onboardingCompleted: true,
      };
      setCurrentUser(userObj);

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
    }
  };

  const logout = async () => {
    setIsLoading(true);
    await authService.signOut();
    setCurrentUser(null);
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
