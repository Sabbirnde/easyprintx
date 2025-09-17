import { useCallback, useRef } from 'react';
import { useAuth } from './useAuth';
import { isTokenExpired, decodeJWT } from '../utils/jwtUtils';
import { supabase } from '../integrations/supabase/client';
import { toast } from 'sonner';

interface UseAuthTokenReturn {
  getValidToken: () => Promise<string | null>;
  isTokenValid: (token: string) => boolean;
  refreshToken: () => Promise<string | null>;
}

/**
 * Custom hook for managing JWT token validation and refresh
 * Automatically handles token expiration and refresh logic with controlled refresh timing
 */
export const useAuthToken = (): UseAuthTokenReturn => {
  const { user } = useAuth();
  const refreshPromiseRef = useRef<Promise<string | null> | null>(null);
  const lastRefreshTimeRef = useRef<number>(0);
  const refreshedTokensRef = useRef<Set<string>>(new Set());

  /**
   * Check if a token is valid (not expired with 2-minute buffer)
   */
  const isTokenValid = useCallback((token: string): boolean => {
    if (!token) return false;
    return !isTokenExpired(token, 120); // 2 minutes buffer
  }, []);

  /**
   * Check if we should allow refresh (prevent continuous refreshing)
   * Only allow refresh once per token and with minimum 30-second intervals
   */
  const shouldAllowRefresh = useCallback((currentToken: string): boolean => {
    const now = Date.now();
    const timeSinceLastRefresh = now - lastRefreshTimeRef.current;
    const hasBeenRefreshed = refreshedTokensRef.current.has(currentToken);
    
    // Allow refresh if:
    // 1. This token hasn't been refreshed before, AND
    // 2. At least 30 seconds have passed since last refresh attempt
    return !hasBeenRefreshed && timeSinceLastRefresh > 30000;
  }, []);

  /**
   * Refresh the JWT token using Supabase auth
   */
  const refreshToken = useCallback(async (): Promise<string | null> => {
    try {
      console.log('Refreshing JWT token...');
      lastRefreshTimeRef.current = Date.now();
      
      const { data, error } = await supabase.auth.refreshSession();
      
      if (error) {
        console.error('Token refresh failed:', error);
        toast.error('Session expired. Please log in again.');
        return null;
      }

      if (!data.session?.access_token) {
        console.error('No access token received after refresh');
        toast.error('Session refresh failed. Please log in again.');
        return null;
      }

      console.log('JWT token refreshed successfully');
      return data.session.access_token;
    } catch (error) {
      console.error('Error during token refresh:', error);
      toast.error('Failed to refresh session. Please log in again.');
      return null;
    }
  }, []);

  /**
   * Get a valid JWT token, refreshing if necessary (but only once per token)
   * Returns null if unable to get a valid token
   */
  const getValidToken = useCallback(async (): Promise<string | null> => {
    try {
      // Get current session
      const { data: { session }, error } = await supabase.auth.getSession();
      
      if (error) {
        console.error('Error getting session:', error);
        toast.error('Authentication error. Please log in again.');
        return null;
      }

      if (!session) {
        console.error('No active session');
        toast.error('No active session. Please log in.');
        return null;
      }

      const currentToken = session.access_token;

      // Check if current token is valid (2-minute buffer)
      if (isTokenValid(currentToken)) {
        return currentToken;
      }

      // Token is near expiration or expired
      console.log('Token near expiration or expired, checking if refresh is allowed...');

      // Check if we should refresh this token
      if (!shouldAllowRefresh(currentToken)) {
        console.log('Refresh not allowed for this token (already refreshed or too recent)');
        // Token is expired but we've already tried to refresh it, return null
        toast.error('Session expired. Please log in again.');
        return null;
      }

      // Mark this token as being refreshed
      refreshedTokensRef.current.add(currentToken);

      // Prevent multiple simultaneous refresh attempts
      if (refreshPromiseRef.current) {
        console.log('Refresh already in progress, waiting...');
        return await refreshPromiseRef.current;
      }

      // Start refresh process
      console.log('Starting token refresh...');
      refreshPromiseRef.current = refreshToken();
      
      try {
        const newToken = await refreshPromiseRef.current;
        
        if (newToken) {
          // Clean up old tokens from tracking (keep only last 5)
          if (refreshedTokensRef.current.size > 5) {
            const tokensArray = Array.from(refreshedTokensRef.current);
            refreshedTokensRef.current = new Set(tokensArray.slice(-5));
          }
        }
        
        return newToken;
      } finally {
        // Clear the refresh promise
        refreshPromiseRef.current = null;
      }
    } catch (error) {
      console.error('Error in getValidToken:', error);
      toast.error('Authentication error. Please try again.');
      return null;
    }
  }, [isTokenValid, refreshToken, shouldAllowRefresh]);

  return {
    getValidToken,
    isTokenValid,
    refreshToken
  };
};