/**
 * File Cleanup Service
 * Handles automatic deletion of files and records after 24 hours
 */

import { supabase } from '@/integrations/supabase/client';

export interface ExpiredFile {
  id: string;
  customer_id: string | null;
  file_name: string | null;
  file_url: string | null;
  created_at: string;
  expires_at: string;
}

export interface ExpiringFile extends ExpiredFile {
  time_until_expiry: string;
}

export class FileCleanupService {
  private static instance: FileCleanupService;
  private cleanupInterval: NodeJS.Timeout | null = null;
  
  private constructor() {}
  
  public static getInstance(): FileCleanupService {
    if (!FileCleanupService.instance) {
      FileCleanupService.instance = new FileCleanupService();
    }
    return FileCleanupService.instance;
  }

  /**
   * Start automatic cleanup with specified interval
   * @param intervalMinutes - How often to run cleanup (default: 60 minutes)
   */
  public startAutomaticCleanup(intervalMinutes: number = 60): void {
    if (this.cleanupInterval) {
      console.log('Cleanup service already running');
      return;
    }

    console.log(`Starting automatic file cleanup every ${intervalMinutes} minutes`);
    
    // Run cleanup immediately
    this.performCleanup().catch(error => {
      console.error('Initial cleanup failed:', error);
    });

    // Set up recurring cleanup
    this.cleanupInterval = setInterval(() => {
      this.performCleanup().catch(error => {
        console.error('Scheduled cleanup failed:', error);
      });
    }, intervalMinutes * 60 * 1000);
  }

  /**
   * Stop automatic cleanup
   */
  public stopAutomaticCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('Automatic file cleanup stopped');
    }
  }

  /**
   * Manually trigger cleanup process
   */
  public async performCleanup(): Promise<{ deletedCount: number; errors: string[] }> {
    console.log('🧹 Starting file cleanup process...');
    
    const errors: string[] = [];
    let deletedCount = 0;

    try {
      // Get expired files
      const expiredFiles = await this.getExpiredFiles();
      console.log(`Found ${expiredFiles.length} expired files to clean up`);

      if (expiredFiles.length === 0) {
        console.log('✅ No expired files found');
        return { deletedCount: 0, errors: [] };
      }

      // Process each expired file
      for (const file of expiredFiles) {
        try {
          await this.deleteExpiredFile(file);
          deletedCount++;
          console.log(`🗑️ Deleted: ${file.file_name} (${file.id})`);
        } catch (error) {
          const errorMsg = `Failed to delete ${file.file_name}: ${error instanceof Error ? error.message : String(error)}`;
          errors.push(errorMsg);
          console.error('❌', errorMsg);
        }
      }

      console.log(`✅ Cleanup completed: ${deletedCount} files deleted, ${errors.length} errors`);
      return { deletedCount, errors };

    } catch (error) {
      const errorMsg = `Cleanup process failed: ${error instanceof Error ? error.message : String(error)}`;
      console.error('❌ Cleanup process failed:', error);
      errors.push(errorMsg);
      return { deletedCount, errors };
    }
  }

  /**
   * Get list of files that have expired (older than 24 hours)
   */
  public async getExpiredFiles(): Promise<ExpiredFile[]> {
    try {
      // Calculate 24 hours ago
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      const { data, error } = await supabase
        .from('print_jobs')
        .select('id, customer_id, file_name, file_url, created_at')
        .lt('created_at', twentyFourHoursAgo.toISOString());

      if (error) {
        throw new Error(`Failed to fetch expired files: ${error.message}`);
      }

      return (data || []).map(job => ({
        id: job.id,
        customer_id: job.customer_id,
        file_name: job.file_name,
        file_url: job.file_url,
        created_at: job.created_at,
        expires_at: new Date(new Date(job.created_at).getTime() + 24 * 60 * 60 * 1000).toISOString()
      }));
    } catch (error) {
      console.error('Error fetching expired files:', error);
      throw error;
    }
  }

  /**
   * Get list of files that will expire soon (within 2 hours)
   */
  public async getExpiringFiles(): Promise<ExpiringFile[]> {
    try {
      // Calculate time range: 22-24 hours ago (files that will expire in 0-2 hours)
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
      
      const twentyTwoHoursAgo = new Date();
      twentyTwoHoursAgo.setHours(twentyTwoHoursAgo.getHours() - 22);

      const { data, error } = await supabase
        .from('print_jobs')
        .select('id, customer_id, file_name, file_url, created_at')
        .gte('created_at', twentyFourHoursAgo.toISOString())
        .lt('created_at', twentyTwoHoursAgo.toISOString());

      if (error) {
        throw new Error(`Failed to fetch expiring files: ${error.message}`);
      }

      return (data || []).map(job => {
        const expiresAt = new Date(new Date(job.created_at).getTime() + 24 * 60 * 60 * 1000).toISOString();
        const timeUntilExpiryMs = new Date(expiresAt).getTime() - new Date().getTime();
        const hoursLeft = Math.max(0, Math.floor(timeUntilExpiryMs / (1000 * 60 * 60)));
        const minutesLeft = Math.max(0, Math.floor((timeUntilExpiryMs % (1000 * 60 * 60)) / (1000 * 60)));
        
        let timeUntilExpiry = '';
        if (timeUntilExpiryMs <= 0) {
          timeUntilExpiry = 'Expired';
        } else if (hoursLeft > 0) {
          timeUntilExpiry = `${hoursLeft}h ${minutesLeft}m`;
        } else {
          timeUntilExpiry = `${minutesLeft}m`;
        }

        return {
          id: job.id,
          customer_id: job.customer_id,
          file_name: job.file_name,
          file_url: job.file_url,
          created_at: job.created_at,
          expires_at: expiresAt,
          time_until_expiry: timeUntilExpiry
        };
      });
    } catch (error) {
      console.error('Error fetching expiring files:', error);
      throw error;
    }
  }

  /**
   * Delete an expired file from both storage and database
   */
  private async deleteExpiredFile(file: ExpiredFile): Promise<void> {
    // Delete from storage if file path exists
    if (file.customer_id && file.file_name) {
      const filePath = `${file.customer_id}/${file.file_name}`;
      
      try {
        const { error: storageError } = await supabase.storage
          .from('user-uploads')
          .remove([filePath]);

        if (storageError) {
          console.warn(`Storage deletion warning for ${filePath}:`, storageError.message);
          // Continue with database deletion even if storage deletion fails
        } else {
          console.log(`📁 Storage file deleted: ${filePath}`);
        }
      } catch (error) {
        console.warn(`Storage deletion error for ${filePath}:`, error);
        // Continue with database deletion even if storage deletion fails
      }
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('print_jobs')
      .delete()
      .eq('id', file.id);

    if (dbError) {
      throw new Error(`Database deletion failed: ${dbError.message}`);
    }

    console.log(`🗄️ Database record deleted: ${file.id}`);
  }

  /**
   * Check if a file is expired based on its creation time
   */
  public static isFileExpired(createdAt: string): boolean {
    const created = new Date(createdAt);
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    return created < twentyFourHoursAgo;
  }

  /**
   * Get time until expiry for a file
   */
  public static getTimeUntilExpiry(createdAt: string): {
    expired: boolean;
    timeLeft: string;
    hoursLeft: number;
  } {
    const created = new Date(createdAt);
    const expiresAt = new Date(created.getTime() + 24 * 60 * 60 * 1000);
    const now = new Date();
    const timeLeftMs = expiresAt.getTime() - now.getTime();

    if (timeLeftMs <= 0) {
      return {
        expired: true,
        timeLeft: 'Expired',
        hoursLeft: 0
      };
    }

    const hoursLeft = Math.floor(timeLeftMs / (1000 * 60 * 60));
    const minutesLeft = Math.floor((timeLeftMs % (1000 * 60 * 60)) / (1000 * 60));

    let timeLeft = '';
    if (hoursLeft > 0) {
      timeLeft = `${hoursLeft}h ${minutesLeft}m`;
    } else {
      timeLeft = `${minutesLeft}m`;
    }

    return {
      expired: false,
      timeLeft,
      hoursLeft: Math.max(0, hoursLeft)
    };
  }

  /**
   * Get cleanup statistics
   */
  public async getCleanupStats(): Promise<{
    totalFiles: number;
    expiredFiles: number;
    expiringFiles: number;
    nextCleanupIn?: string;
  }> {
    try {
      // Get total files
      const { count: totalFiles, error: totalError } = await supabase
        .from('print_jobs')
        .select('*', { count: 'exact', head: true });

      if (totalError) {
        throw new Error(`Failed to count total files: ${totalError.message}`);
      }

      // Get expired files count
      const expiredFiles = await this.getExpiredFiles();
      
      // Get expiring files count
      const expiringFiles = await this.getExpiringFiles();

      return {
        totalFiles: totalFiles || 0,
        expiredFiles: expiredFiles.length,
        expiringFiles: expiringFiles.length,
      };
    } catch (error) {
      console.error('Error getting cleanup stats:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const fileCleanupService = FileCleanupService.getInstance();