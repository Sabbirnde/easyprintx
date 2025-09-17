/**
 * JWT Utility functions for token validation and parsing
 */

export interface JWTPayload {
  exp: number;
  iat: number;
  sub: string;
  [key: string]: any;
}

/**
 * Decode JWT token without verification (client-side only)
 * @param token - JWT token string
 * @returns Decoded payload or null if invalid
 */
export const decodeJWT = (token: string): JWTPayload | null => {
  try {
    // JWT has 3 parts separated by dots: header.payload.signature
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    // Decode the payload (second part)
    const payload = parts[1];
    
    // Add padding if needed for base64 decoding
    const paddedPayload = payload + '='.repeat((4 - payload.length % 4) % 4);
    
    // Decode base64
    const decodedPayload = atob(paddedPayload.replace(/-/g, '+').replace(/_/g, '/'));
    
    // Parse JSON
    return JSON.parse(decodedPayload) as JWTPayload;
  } catch (error) {
    console.error('Error decoding JWT:', error);
    return null;
  }
};

/**
 * Check if JWT token is expired
 * @param token - JWT token string
 * @param bufferSeconds - Buffer time in seconds before considering token expired (default: 120 = 2 minutes)
 * @returns true if token is expired or invalid
 */
export const isTokenExpired = (token: string, bufferSeconds: number = 120): boolean => {
  const payload = decodeJWT(token);
  
  if (!payload || !payload.exp) {
    return true;
  }

  const currentTime = Math.floor(Date.now() / 1000);
  const expirationTime = payload.exp;
  
  // Consider token expired if it expires within the buffer time
  return (expirationTime - currentTime) <= bufferSeconds;
};

/**
 * Get time until token expires
 * @param token - JWT token string
 * @returns seconds until expiration, or 0 if expired/invalid
 */
export const getTokenTimeToExpiry = (token: string): number => {
  const payload = decodeJWT(token);
  
  if (!payload || !payload.exp) {
    return 0;
  }

  const currentTime = Math.floor(Date.now() / 1000);
  const expirationTime = payload.exp;
  
  return Math.max(0, expirationTime - currentTime);
};

/**
 * Extract user ID from JWT token
 * @param token - JWT token string
 * @returns user ID or null if not found
 */
export const getUserIdFromToken = (token: string): string | null => {
  const payload = decodeJWT(token);
  return payload?.sub || null;
};