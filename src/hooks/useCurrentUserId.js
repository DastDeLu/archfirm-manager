import { useAuth } from '@/lib/AuthContext';

/**
 * Returns the current user's ID for use in user-scoped query keys.
 * This ensures that query cache is isolated per user and prevents
 * data leaks between sessions after login/logout transitions.
 */
export function useCurrentUserId() {
  const { user } = useAuth();
  return user?.id || null;
}