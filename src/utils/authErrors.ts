export type AuthErrorCode =
  | 'invalid_credentials'
  | 'email_not_confirmed'
  | 'duplicate_account'
  | 'weak_password'
  | 'rate_limited'
  | 'network_error'
  | 'invalid_reset_token'
  | 'not_configured'
  | 'unknown';

export interface MappedAuthError {
  code: AuthErrorCode;
  message: string;
  canResendVerification?: boolean;
}

export function mapAuthError(err: unknown): MappedAuthError {
  const rawMessage =
    err instanceof Error
      ? err.message
      : typeof err === 'object' && err !== null && 'message' in err
      ? String((err as { message?: unknown }).message ?? '')
      : typeof err === 'string'
      ? err
      : '';

  const normalized = rawMessage.toLowerCase().trim();

  if (!normalized) {
    return {
      code: 'unknown',
      message: 'Something went wrong while authenticating. Please try again.',
    };
  }

  if (normalized.includes('not configured')) {
    return {
      code: 'not_configured',
      message: 'Supabase authentication is not configured yet. Connect your Supabase project URL and anon key below.',
    };
  }

  if (normalized.includes('email not confirmed') || normalized.includes('not confirmed')) {
    return {
      code: 'email_not_confirmed',
      message: 'Your email address is not verified yet. Check your inbox or resend the verification email.',
      canResendVerification: true,
    };
  }

  if (normalized.includes('invalid login credentials') || normalized.includes('invalid email or password')) {
    return {
      code: 'invalid_credentials',
      message: 'Incorrect email or password. Double-check your credentials or reset your password.',
    };
  }

  if (
    normalized.includes('already registered') ||
    normalized.includes('already exists') ||
    normalized.includes('user already') ||
    normalized.includes('duplicate')
  ) {
    return {
      code: 'duplicate_account',
      message: 'An account with this email already exists. Try signing in or resetting your password.',
    };
  }

  if (normalized.includes('password should be at least') || normalized.includes('weak password')) {
    return {
      code: 'weak_password',
      message: 'Password must be at least 6 characters long.',
    };
  }

  if (normalized.includes('rate limit') || normalized.includes('too many requests') || normalized.includes('email rate limit')) {
    return {
      code: 'rate_limited',
      message: 'Too many authentication attempts. Please wait a minute before trying again.',
    };
  }

  if (
    normalized.includes('failed to fetch') ||
    normalized.includes('networkerror') ||
    normalized.includes('network request failed') ||
    normalized.includes('load failed') ||
    normalized.includes('timeout')
  ) {
    return {
      code: 'network_error',
      message: 'Network connection error. Please check your internet connection and try again.',
    };
  }

  if (
    normalized.includes('otp expired') ||
    normalized.includes('token has expired') ||
    normalized.includes('invalid recovery') ||
    normalized.includes('auth session missing')
  ) {
    return {
      code: 'invalid_reset_token',
      message: 'Your password reset link is invalid or expired. Request a new reset link below.',
    };
  }

  return {
    code: 'unknown',
    message: rawMessage,
  };
}

/**
 * Supabase Auth returns user.identities = [] (no error) when signing up with an existing email
 * while email confirmation / enumeration protection is enabled.
 */
export function isDuplicateSignupResponse(data: {
  user?: { identities?: unknown[] | null } | null;
  session?: unknown;
}): boolean {
  if (!data?.user || data.session) return false;
  if (Array.isArray(data.user.identities) && data.user.identities.length === 0) {
    return true;
  }
  return false;
}
