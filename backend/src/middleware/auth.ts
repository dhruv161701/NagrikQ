import { Response, NextFunction } from 'express';
import { AuthenticatedRequest, UserRole } from '../types';
import { supabaseAdmin } from '../config/supabase';

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication token required.' },
    });
    return;
  }

  try {
    const { data, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !data.user) {
      res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'Invalid or expired session.' },
      });
      return;
    }

    // Fetch user profile from database to obtain authoritative role
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    req.user = {
      id: data.user.id,
      email: data.user.email || '',
      fullName: profile?.full_name || data.user.user_metadata?.full_name || 'Nagrik User',
      role: (profile?.role as UserRole) || 'citizen',
      onboardingCompleted: profile?.onboarding_completed ?? true,
    };

    next();
  } catch (err) {
    res.status(401).json({
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'Authentication error.' },
    });
  }
};
