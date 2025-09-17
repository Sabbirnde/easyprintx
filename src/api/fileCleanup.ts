/**
 * File Cleanup API
 * Provides endpoints for manual cleanup triggers and monitoring
 */

import { fileCleanupService } from '@/services/fileCleanupService';

export interface CleanupResponse {
  success: boolean;
  message: string;
  data?: {
    deletedCount: number;
    errors: string[];
    stats?: {
      totalFiles: number;
      expiredFiles: number;
      expiringFiles: number;
    };
  };
  error?: string;
}

/**
 * Trigger manual cleanup of expired files
 */
export async function triggerCleanup(): Promise<CleanupResponse> {
  try {
    console.log('🚀 Manual cleanup triggered');
    
    const result = await fileCleanupService.performCleanup();
    
    return {
      success: true,
      message: `Cleanup completed successfully. Deleted ${result.deletedCount} files.`,
      data: {
        deletedCount: result.deletedCount,
        errors: result.errors
      }
    };
  } catch (error) {
    console.error('Manual cleanup failed:', error);
    
    return {
      success: false,
      message: 'Cleanup failed',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Get cleanup statistics
 */
export async function getCleanupStats(): Promise<CleanupResponse> {
  try {
    const stats = await fileCleanupService.getCleanupStats();
    
    return {
      success: true,
      message: 'Stats retrieved successfully',
      data: {
        deletedCount: 0,
        errors: [],
        stats
      }
    };
  } catch (error) {
    console.error('Failed to get cleanup stats:', error);
    
    return {
      success: false,
      message: 'Failed to retrieve stats',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Get list of expired files
 */
export async function getExpiredFiles(): Promise<CleanupResponse> {
  try {
    const expiredFiles = await fileCleanupService.getExpiredFiles();
    
    return {
      success: true,
      message: `Found ${expiredFiles.length} expired files`,
      data: {
        deletedCount: 0,
        errors: [],
        stats: {
          totalFiles: 0,
          expiredFiles: expiredFiles.length,
          expiringFiles: 0
        }
      }
    };
  } catch (error) {
    console.error('Failed to get expired files:', error);
    
    return {
      success: false,
      message: 'Failed to retrieve expired files',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Get list of files expiring soon
 */
export async function getExpiringFiles(): Promise<CleanupResponse> {
  try {
    const expiringFiles = await fileCleanupService.getExpiringFiles();
    
    return {
      success: true,
      message: `Found ${expiringFiles.length} files expiring soon`,
      data: {
        deletedCount: 0,
        errors: [],
        stats: {
          totalFiles: 0,
          expiredFiles: 0,
          expiringFiles: expiringFiles.length
        }
      }
    };
  } catch (error) {
    console.error('Failed to get expiring files:', error);
    
    return {
      success: false,
      message: 'Failed to retrieve expiring files',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Start automatic cleanup with specified interval
 */
export async function startAutomaticCleanup(intervalMinutes: number = 60): Promise<CleanupResponse> {
  try {
    fileCleanupService.startAutomaticCleanup(intervalMinutes);
    
    return {
      success: true,
      message: `Automatic cleanup started with ${intervalMinutes} minute interval`,
      data: {
        deletedCount: 0,
        errors: []
      }
    };
  } catch (error) {
    console.error('Failed to start automatic cleanup:', error);
    
    return {
      success: false,
      message: 'Failed to start automatic cleanup',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Stop automatic cleanup
 */
export async function stopAutomaticCleanup(): Promise<CleanupResponse> {
  try {
    fileCleanupService.stopAutomaticCleanup();
    
    return {
      success: true,
      message: 'Automatic cleanup stopped',
      data: {
        deletedCount: 0,
        errors: []
      }
    };
  } catch (error) {
    console.error('Failed to stop automatic cleanup:', error);
    
    return {
      success: false,
      message: 'Failed to stop automatic cleanup',
      error: error instanceof Error ? error.message : String(error)
    };
  }
}