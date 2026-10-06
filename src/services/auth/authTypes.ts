import type { UserRole, UIMode, LanguageCode } from '../../types';

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  dateOfBirth?: string;
  age?: number;
  preferredLanguage?: LanguageCode;
  preferredUIMode?: UIMode;
  onboardingCompleted: boolean;
  avatarUrl?: string;
}

export interface AuthResponse {
  error?: string;
  user?: UserProfile;
  needVerification?: boolean;
}
