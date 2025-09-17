# File Auto-Expiry System Documentation

## Overview

The File Auto-Expiry System automatically manages uploaded files in the Print Queue to prevent storage overflow and maintain system performance. Files are automatically deleted after 24 hours from both the database and storage system.

## Features

### 🔹 **Automatic Cleanup**
- Files older than 24 hours are automatically deleted
- Runs every hour to check for expired files
- Removes files from both database records and storage bucket
- Maintains print job history while removing file references

### 🔹 **Visual Indicators**
- Expiry badges show time remaining for each file
- Color-coded warnings (red for expired/expiring soon)
- Disabled actions for expired files
- User-friendly error messages

### 🔹 **Manual Controls**
- Manual cleanup button in Print Queue dashboard
- Real-time cleanup statistics
- Cleanup API endpoints for external triggers

### 🔹 **Graceful Handling**
- Expired files show appropriate error messages
- Actions are disabled for expired files
- System continues to function normally

## File Lifecycle

```
File Upload → Active (24 hours) → Expired → Auto-Deletion
     ↓             ↓                 ↓           ↓
  Available    Expiry Warning    Actions      Complete
   for all      (2 hours left)   Disabled     Removal
   actions                                        
```

## Components

### 1. Database Migration
**File:** `supabase/migrations/20250914200437_file_auto_expiry_system.sql`

- Adds cleanup functions and indexes
- Creates expiry views for monitoring
- Implements efficient queries for expired files

### 2. Cleanup Service
**File:** `src/services/fileCleanupService.ts`

- Main cleanup logic and file management
- Automatic and manual cleanup operations
- Statistics and monitoring functions

### 3. API Layer
**File:** `src/api/fileCleanup.ts`

- REST API endpoints for cleanup operations
- External system integration support
- Monitoring and statistics endpoints

### 4. React Hook
**File:** `src/hooks/useFileAutoExpiry.ts`

- Application initialization
- Helper functions for components
- Auto-start cleanup service

### 5. UI Integration
**File:** `src/pages/PrintQueue.tsx`

- Visual expiry indicators
- Manual cleanup controls
- Expired file handling

## Configuration

### Cleanup Interval
Default: 60 minutes (configurable in service)

```typescript
fileCleanupService.startAutomaticCleanup(60); // Run every 60 minutes
```

### File Retention Period
Fixed: 24 hours from upload time

### Storage Optimization
- Automatic removal prevents storage overflow
- Maintains database performance
- Keeps system lightweight

## Usage

### For Shop Owners

1. **Monitor File Expiry**
   - Check expiry badges on print jobs
   - Files show countdown timer
   - Red badges indicate expiring/expired files

2. **Manual Cleanup**
   - Use "Clean Now" button in dashboard
   - Removes expired files immediately
   - Shows cleanup results

3. **File Access**
   - Access files normally within 24 hours
   - Expired files show error messages
   - Complete print jobs before expiry

### For Developers

1. **API Endpoints**
   ```typescript
   import { triggerCleanup, getCleanupStats } from '@/api/fileCleanup';
   
   // Manual cleanup
   const result = await triggerCleanup();
   
   // Get statistics
   const stats = await getCleanupStats();
   ```

2. **Service Integration**
   ```typescript
   import { fileCleanupService } from '@/services/fileCleanupService';
   
   // Start automatic cleanup
   fileCleanupService.startAutomaticCleanup(60);
   
   // Manual cleanup
   await fileCleanupService.performCleanup();
   ```

3. **Component Helpers**
   ```typescript
   import { useFileAutoExpiry } from '@/hooks/useFileAutoExpiry';
   
   const { isFileExpired, getTimeUntilExpiry } = useFileAutoExpiry();
   ```

## Database Schema

### New Columns
- `expires_at` (computed): Shows exact expiry time
- Enhanced indexes for efficient cleanup queries

### New Functions
- `cleanup_expired_files()`: Main cleanup function
- `get_expiring_files()`: Files expiring soon
- `is_file_expired()`: Check if file is expired

### New Views
- `expired_files_view`: All expired files
- `expiring_soon_view`: Files expiring within 2 hours

## Monitoring

### Cleanup Statistics
- Total files in system
- Number of expired files
- Files expiring soon
- Cleanup success/error rates

### Logging
- Cleanup operations logged to console
- Error tracking for failed deletions
- Performance metrics

## Error Handling

### Common Scenarios
1. **Storage deletion fails**: Database cleanup continues
2. **Database deletion fails**: Logged as warning, continues with other files
3. **Network issues**: Cleanup retries automatically
4. **File access errors**: Graceful error messages to users

### Recovery
- Failed cleanups are retried on next cycle
- Manual cleanup available as fallback
- System remains functional during errors

## Best Practices

### For Users
- Complete print jobs promptly (within 24 hours)
- Download important files before expiry
- Monitor expiry warnings

### For Administrators
- Monitor cleanup logs for issues
- Set up external monitoring if needed
- Consider backup strategies for important files

### For Developers
- Handle expired file states gracefully
- Provide clear user feedback
- Test cleanup functionality thoroughly

## Migration Guide

### Existing Systems
1. Run the database migration
2. Initialize cleanup service in application
3. Update UI components for expiry indicators
4. Test cleanup functionality

### Rollback
- Stop automatic cleanup service
- Remove migration (optional)
- Files remain accessible

## Troubleshooting

### Common Issues
1. **Cleanup not running**: Check service initialization
2. **Files not deleting**: Check storage permissions
3. **UI not updating**: Verify real-time subscriptions

### Debug Commands
```typescript
// Check if cleanup is running
fileCleanupService.getCleanupStats()

// Manual cleanup with detailed logging
fileCleanupService.performCleanup()
```

## Future Enhancements

### Potential Features
- Configurable retention periods
- File backup before deletion
- Bulk operations for admin
- Advanced monitoring dashboard
- Integration with external storage

### Performance Optimizations
- Batch deletion operations
- Improved indexing strategies
- Background cleanup workers
- Caching for expiry calculations

---

## Summary

The File Auto-Expiry System provides comprehensive file lifecycle management with:
- ✅ Automatic 24-hour file deletion
- ✅ Visual expiry indicators
- ✅ Manual cleanup controls
- ✅ Graceful error handling
- ✅ Storage optimization
- ✅ Real-time monitoring

This system ensures optimal storage usage while maintaining a smooth user experience for print job management.