/**
 * File Auto-Expiry Initialization Hook
 * Sets up the automatic file cleanup system
 */

import { useEffect } from 'react';
import { fileCleanupService } from '@/services/fileCleanupService';
import { toast } from 'sonner';

export const useFileAutoExpiry = (enabled: boolean = true) => {
  useEffect(() => {
    if (!enabled) return;

    // Start automatic cleanup when the app loads
    // This will run cleanup every hour
    fileCleanupService.startAutomaticCleanup(60);

    // Show initialization message
    console.log('📅 File auto-expiry system initialized (24-hour retention policy)');
    
    // Optional: Show a subtle notification about the auto-expiry system
    const showExpiryNotification = localStorage.getItem('file-expiry-notified') !== 'true';
    
    if (showExpiryNotification) {
      setTimeout(() => {
        toast.info('File Auto-Expiry Active', {
          description: 'Files are automatically deleted after 24 hours to keep storage optimized',
          duration: 8000,
        });
        localStorage.setItem('file-expiry-notified', 'true');
      }, 2000);
    }

    return () => {
      // Cleanup will continue running in the background
      // No need to stop it when component unmounts
      console.log('📅 File auto-expiry system remains active');
    };
  }, [enabled]);

  return {
    // Utility functions that components can use
    isFileExpired: (createdAt: string) => {
      const created = new Date(createdAt);
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      return created < twentyFourHoursAgo;
    },
    
    getTimeUntilExpiry: (createdAt: string) => {
      const created = new Date(createdAt);
      const expiresAt = new Date(created.getTime() + 24 * 60 * 60 * 1000);
      const now = new Date();
      const timeLeftMs = expiresAt.getTime() - now.getTime();

      if (timeLeftMs <= 0) {
        return { expired: true, timeLeft: 'Expired', hoursLeft: 0 };
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
    },

    // Manual cleanup trigger
    triggerManualCleanup: async () => {
      try {
        const result = await fileCleanupService.performCleanup();
        return {
          success: true,
          deletedCount: result.deletedCount,
          errors: result.errors
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
      }
    }
  };
};