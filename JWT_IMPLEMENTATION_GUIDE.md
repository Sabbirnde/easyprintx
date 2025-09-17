# JWT Token Management Implementation

## Overview
This implementation provides a robust JWT token validation and refresh system for React + TypeScript applications using Supabase authentication.

## Files Created/Modified

### 1. `src/utils/jwtUtils.ts`
Utility functions for JWT token handling:
- `decodeJWT()` - Safely decode JWT tokens client-side
- `isTokenExpired()` - Check if token is expired (with configurable buffer)
- `getTokenTimeToExpiry()` - Get remaining time until expiration
- `getUserIdFromToken()` - Extract user ID from token

### 2. `src/hooks/useAuthToken.tsx`
React hook for managing JWT authentication:
- `getValidToken()` - Returns a valid JWT, refreshing if necessary
- `isTokenValid()` - Check if current token is valid
- `refreshToken()` - Manually refresh the token
- Prevents multiple simultaneous refresh attempts
- Handles all error scenarios gracefully

### 3. `src/pages/PrintQueue.tsx` (Modified)
Updated to use the authentication system:
- All API calls now use validated JWT tokens
- Automatic token refresh before each request
- Comprehensive error handling for auth failures
- User-friendly error messages and loading states

## Key Features

### Automatic Token Refresh
- Tokens are checked before each API call
- 5-minute buffer before expiration (configurable)
- Automatic refresh when needed
- Prevents duplicate refresh requests

### Error Handling
- Graceful handling of expired tokens
- Clear user feedback for auth issues
- Fallback to login prompt when refresh fails
- Distinguishes between auth and other errors

### Production Ready
- TypeScript for type safety
- Comprehensive error logging
- Toast notifications for user feedback
- Compatible with shadcn/ui components

## Usage Example

```typescript
import { useAuthToken } from '@/hooks/useAuthToken';

const MyComponent = () => {
  const { getValidToken } = useAuthToken();

  const makeAPICall = async () => {
    try {
      // This will automatically handle token validation/refresh
      const client = await getAuthenticatedClient();
      
      const { data, error } = await client
        .from('your_table')
        .select('*');
        
      if (error) throw error;
      // Handle success
    } catch (error) {
      // Handle error - auth errors are already handled
      console.error('API call failed:', error);
    }
  };
};
```

## Testing the Implementation

### 1. Test Expired Token Handling
- Wait for token to expire naturally
- Or manually set a short expiration time
- Verify automatic refresh works

### 2. Test Error Scenarios
- Simulate network failures during refresh
- Test invalid refresh tokens
- Verify user gets appropriate error messages

### 3. Test Multiple Simultaneous Requests
- Make multiple API calls at once
- Verify only one refresh request is made
- Ensure all calls complete successfully

## Configuration

### Token Buffer Time
Adjust the buffer time in `jwtUtils.ts`:
```typescript
export const isTokenExpired = (token: string, bufferSeconds: number = 300)
```

### Error Messages
Customize error messages in `useAuthToken.tsx` for your application needs.

## Security Considerations

1. **Client-side token decoding**: Only for expiration checking, not verification
2. **Token storage**: Uses Supabase's secure session management
3. **Refresh handling**: Prevents token exposure in logs
4. **Error information**: Minimal exposure of sensitive auth details

## Troubleshooting

### Common Issues

1. **"Authentication error - please try again"**
   - Token refresh failed
   - Check network connectivity
   - Verify Supabase configuration

2. **"Session expired. Please log in again."**
   - Refresh token is invalid/expired
   - User needs to log in again
   - Check session timeout settings

3. **Multiple refresh attempts**
   - Should be prevented by the implementation
   - Check for duplicate useAuthToken hooks
   - Verify proper cleanup in useEffect

### Debug Mode
Enable debug logging by uncommenting console.log statements in the hook for development debugging.