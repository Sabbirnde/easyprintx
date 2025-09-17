import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { 
  FileText, 
  DollarSign, 
  Users, 
  Clock, 
  Printer, 
  Settings, 
  BarChart3, 
  Calendar,
  RefreshCw,
  Search,
  CheckCircle,
  XCircle,
  X,
  PlayCircle,
  PauseCircle,
  AlertCircle,
  Download,
  PrinterIcon,
  Timer,
  Trash2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { FileCleanupService } from "@/services/fileCleanupService";
import { useAuthToken } from "@/hooks/useAuthToken";
import ShopHeader from "@/components/ShopHeader";

type PrintJobStatus = 'pending' | 'queued' | 'printing' | 'completed' | 'cancelled';

interface PrintJob {
  id: string;
  shop_owner_id: string;
  customer_id?: string;
  customer_name?: string;
  customer_email?: string;
  customer_phone?: string;
  file_name: string;
  file_url?: string;
  file_size?: number;
  pages: number;
  copies: number;
  color_pages: number;
  total_cost: number;
  status: PrintJobStatus;
  priority: number;
  estimated_duration?: number;
  actual_duration?: number;
  submitted_at: string;
  started_at?: string;
  completed_at?: string;
  cancelled_at?: string;
  notes?: string;
  print_settings?: any;
  created_at: string;
  updated_at: string;
}

const PrintQueue = () => {
  const { user } = useAuth();
  const { getValidToken } = useAuthToken();

  // Component-level error protection
  if (!user) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Authentication Required</h3>
              <p className="text-gray-600">Please log in to access the Print Queue.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const [printJobs, setPrintJobs] = useState<PrintJob[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('submit_time');
  const [initialLoad, setInitialLoad] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  // Network connectivity monitoring
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast.success('Connection restored', { description: 'Real-time updates resumed' });
      // Refresh data when coming back online
      fetchPrintJobs();
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('Connection lost', { 
        description: 'Working in offline mode. Data may be outdated.',
        duration: 6000
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // File expiry helper functions
  const getFileExpiryInfo = (createdAt: string) => {
    return FileCleanupService.getTimeUntilExpiry(createdAt);
  };

  const isFileExpired = (createdAt: string) => {
    return FileCleanupService.isFileExpired(createdAt);
  };

  const getExpiryBadgeVariant = (expiryInfo: ReturnType<typeof getFileExpiryInfo>) => {
    if (expiryInfo.expired) return 'destructive';
    if (expiryInfo.hoursLeft <= 2) return 'destructive';
    if (expiryInfo.hoursLeft <= 6) return 'outline';
    return 'secondary';
  };

  const getExpiryBadgeText = (expiryInfo: ReturnType<typeof getFileExpiryInfo>) => {
    if (expiryInfo.expired) return 'Expired';
    return `Expires in ${expiryInfo.timeLeft}`;
  };

  // Statistics calculations - all from database
  const totalJobs = printJobs.length;
  const activeJobs = printJobs.filter(job => ['pending', 'queued', 'printing'].includes(job.status)).length;
  const queueLength = printJobs.filter(job => job.status === 'queued').length;
  
  // Today's completed jobs from database
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);
  
  const completedToday = printJobs.filter(job => {
    if (job.status !== 'completed' || !job.completed_at) return false;
    const completedDate = new Date(job.completed_at);
    return completedDate >= todayStart && completedDate <= todayEnd;
  }).length;
  
  // Calculate total pages accurately (pages × copies) from database
  const totalPagesToday = printJobs
    .filter(job => {
      if (job.status !== 'completed' || !job.completed_at) return false;
      const completedDate = new Date(job.completed_at);
      return completedDate >= todayStart && completedDate <= todayEnd;
    })
    .reduce((sum, job) => sum + (job.pages * job.copies), 0);
  
  const activeTotalPages = printJobs
    .filter(job => ['pending', 'queued', 'printing'].includes(job.status))
    .reduce((sum, job) => sum + (job.pages * job.copies), 0);
  
  // Revenue calculation from database
  const todayRevenue = printJobs
    .filter(job => {
      if (job.status !== 'completed' || !job.completed_at) return false;
      const completedDate = new Date(job.completed_at);
      return completedDate >= todayStart && completedDate <= todayEnd;
    })
    .reduce((sum, job) => sum + Number(job.total_cost), 0);

  // Average time from database
  const completedJobsWithDuration = printJobs.filter(job => job.actual_duration && job.status === 'completed');
  const avgTime = completedJobsWithDuration.length > 0 
    ? completedJobsWithDuration.reduce((sum, job) => sum + (job.actual_duration || 0), 0) / completedJobsWithDuration.length
    : 0;

  const fetchPrintJobs = async (silent: boolean = false) => {
    if (!user?.id) {
      console.warn('No user ID available for fetching print jobs');
      return;
    }
    
    try {
      // Get authenticated client with valid JWT
      const client = await getAuthenticatedClient();

      const { data: jobsData, error: jobsError } = await client
        .from('print_jobs')
        .select('*')
        .eq('shop_owner_id', user.id)
        .order('submitted_at', { ascending: false });

      if (jobsError) {
        console.error('Database error:', jobsError);
        if (!silent) {
          throw new Error(`Failed to fetch print jobs: ${jobsError.message}`);
        }
        return;
      }
      
      if (jobsData && jobsData.length > 0) {
        // Get unique customer IDs safely
        const customerIds = [...new Set(
          jobsData
            .map(job => job.customer_id)
            .filter((id): id is string => Boolean(id))
        )];
        
        // Fetch customer phone numbers if we have customer IDs
        let customerPhones: Record<string, string> = {};
        if (customerIds.length > 0) {
          try {
            const { data: profilesData, error: profilesError } = await client
              .from('profiles')
              .select('user_id, phone')
              .in('user_id', customerIds);
            
            if (profilesError) {
              console.warn('Failed to fetch customer profiles:', profilesError);
            } else if (profilesData) {
              customerPhones = profilesData.reduce((acc, profile) => {
                if (profile.phone && profile.user_id) {
                  acc[profile.user_id] = profile.phone;
                }
                return acc;
              }, {} as Record<string, string>);
            }
          } catch (profileError) {
            console.warn('Error fetching customer profiles:', profileError);
            // Continue without phone numbers
          }
        }
        
        // Map jobs with phone numbers safely
        const jobsWithPhone = jobsData.map(job => ({
          ...job,
          customer_phone: job.customer_id ? customerPhones[job.customer_id] : undefined
        }));
        
        setPrintJobs(jobsWithPhone);
      } else {
        setPrintJobs([]);
      }
      
      // Mark initial load as complete
      if (initialLoad) {
        setInitialLoad(false);
      }
    } catch (error) {
      console.error('Error fetching print jobs:', error);
      
      if (!silent) {
        let errorMessage = 'Failed to load print jobs';
        let errorDescription = 'Please try again or refresh the page';
        
        if (error instanceof Error) {
          if (error.message.includes('InvalidJWT') || error.message.includes('token')) {
            errorMessage = 'Authentication error';
            errorDescription = 'Please log in again';
          } else if (error.message.includes('Failed to set session')) {
            errorMessage = 'Session error';
            errorDescription = 'Please refresh the page and try again';
          } else {
            errorMessage = error.message;
          }
        }
        
        toast.error(errorMessage, {
          description: errorDescription,
          duration: 5000
        });
      }
      
      // Mark initial load as complete even on error
      if (initialLoad) {
        setInitialLoad(false);
      }
    }
  };

  useEffect(() => {
    // Only set up subscription if user is available
    if (!user?.id) {
      console.warn('No user ID available for real-time subscription');
      return;
    }

    // Initial data fetch
    fetchPrintJobs();

    // Set up real-time subscription for immediate updates
    const channel = supabase
      .channel(`print-jobs-realtime-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'print_jobs',
          filter: `shop_owner_id=eq.${user.id}`
        },
        (payload) => {
          try {
            console.log('Real-time update received:', payload);
            
            // Validate payload
            if (!payload || !payload.eventType) {
              console.warn('Invalid real-time payload received:', payload);
              return;
            }
            
            // Handle different types of changes
            switch (payload.eventType) {
              case 'INSERT':
                // Add new job to the list
                setPrintJobs(prevJobs => {
                  const newJob = payload.new as PrintJob;
                  if (!newJob || !newJob.id) {
                    console.warn('Invalid new job data:', newJob);
                    return prevJobs;
                  }
                  
                  // Check if job already exists to prevent duplicates
                  const exists = prevJobs.some(job => job.id === newJob.id);
                  if (!exists) {
                    return [newJob, ...prevJobs];
                  }
                  return prevJobs;
                });
                break;
                
              case 'UPDATE':
                // Update existing job
                setPrintJobs(prevJobs => {
                  const updatedJob = payload.new as PrintJob;
                  if (!updatedJob || !updatedJob.id) {
                    console.warn('Invalid updated job data:', updatedJob);
                    return prevJobs;
                  }
                  
                  return prevJobs.map(job => 
                    job.id === updatedJob.id 
                      ? { ...job, ...updatedJob }
                      : job
                  );
                });
                break;
                
              case 'DELETE':
                // Remove deleted job
                setPrintJobs(prevJobs => {
                  const deletedJob = payload.old;
                  if (!deletedJob || !deletedJob.id) {
                    console.warn('Invalid deleted job data:', deletedJob);
                    return prevJobs;
                  }
                  
                  return prevJobs.filter(job => job.id !== deletedJob.id);
                });
                break;
                
              default:
                console.log('Unknown event type, refreshing data:', (payload as any).eventType);
                // For any other events, silently refresh data
                fetchPrintJobs(true);
                break;
            }
          } catch (error) {
            console.error('Error handling real-time update:', error);
            // Fallback: refresh data silently
            fetchPrintJobs(true);
          }
        }
      )
      .subscribe((status) => {
        console.log('Real-time subscription status:', status);
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Real-time subscription active for print jobs');
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Real-time subscription error, setting up fallback polling');
          
          // Fallback: refresh data every 30 seconds if real-time fails
          const fallbackInterval = setInterval(() => {
            console.log('Fallback: polling for updates');
            fetchPrintJobs(true);
          }, 30000);
          
          // Store interval reference for cleanup
          (channel as any).fallbackInterval = fallbackInterval;
        } else if (status === 'TIMED_OUT') {
          console.warn('⚠️ Real-time subscription timed out, retrying...');
          // The subscription will automatically retry
        } else if (status === 'CLOSED') {
          console.log('🔌 Real-time subscription closed');
        }
      });

    return () => {
      try {
        console.log('🔌 Cleaning up real-time subscription');
        
        // Clear fallback interval if it exists
        if ((channel as any).fallbackInterval) {
          clearInterval((channel as any).fallbackInterval);
        }
        
        // Remove the channel
        supabase.removeChannel(channel);
      } catch (error) {
        console.error('Error cleaning up subscription:', error);
      }
    };
  }, [user?.id]); // Re-run when user ID changes

  /**
   * Create authenticated Supabase client with valid JWT
   */
  const getAuthenticatedClient = async () => {
    try {
      const token = await getValidToken();
      if (!token) {
        throw new Error('Unable to get valid authentication token');
      }
      
      // Get current session to preserve refresh token
      const { data: sessionData } = await supabase.auth.getSession();
      const refreshToken = sessionData.session?.refresh_token;
      
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }
      
      // Set the session with the fresh token
      const { error } = await supabase.auth.setSession({
        access_token: token,
        refresh_token: refreshToken
      });
      
      if (error) {
        console.error('Session setting error:', error);
        throw new Error(`Failed to set session: ${error.message}`);
      }
      
      return supabase;
    } catch (error) {
      console.error('Authentication client creation failed:', error);
      throw error;
    }
  };

  const handleDirectPrint = async (job: PrintJob) => {
    if (!job) {
      toast.error('Invalid job data', { description: 'Job information is missing' });
      return;
    }

    try {
      // Show loading toast
      toast.loading('Opening file for printing...', { id: `print-${job.id}` });

      // Get authenticated client with valid JWT
      const client = await getAuthenticatedClient();

      if (!job.file_url) {
        const possibleFilePath = `${job.customer_id}/${job.file_name}`;
        const { data: urlData, error } = await client.storage
          .from('user-uploads')
          .createSignedUrl(possibleFilePath, 3600);
        
        if (error) {
          console.error('Storage error:', error);
          throw new Error(`Failed to access file: ${error.message}`);
        }
        
        if (urlData?.signedUrl) {
          const printWindow = window.open(urlData.signedUrl, '_blank');
          if (printWindow) {
            printWindow.onload = () => {
              printWindow.focus();
              setTimeout(() => printWindow.print(), 1000);
            };
          }
          
          // Update job status to completed
          await updateJobStatus(job.id, 'completed');
          
          toast.success('Print job completed!', { 
            id: `print-${job.id}`,
            description: `${job.file_name} • File opened for printing`,
            duration: 4000
          });
        } else {
          throw new Error('No signed URL received');
        }
      } else {
        // Use existing file URL
        const printWindow = window.open(job.file_url, '_blank');
        if (printWindow) {
          printWindow.onload = () => {
            printWindow.focus();
            setTimeout(() => printWindow.print(), 1000);
          };
          
          // Update job status to completed
          await updateJobStatus(job.id, 'completed');
          
          toast.success('Print job completed!', { 
            id: `print-${job.id}`,
            description: `${job.file_name} • File opened for printing`,
            duration: 4000
          });
        } else {
          throw new Error('Failed to open print window');
        }
      }
    } catch (error) {
      console.error('Error processing direct print:', error);
      
      let errorMessage = 'Failed to process print job';
      let errorDescription = 'Please try again or contact support';
      
      if (error instanceof Error) {
        if (error.message.includes('InvalidJWT') || error.message.includes('token')) {
          errorMessage = 'Authentication error';
          errorDescription = 'Please refresh the page and try again';
        } else if (error.message.includes('popup') || error.message.includes('blocked')) {
          errorMessage = 'Popup blocked';
          errorDescription = 'Please allow popups for this site and try again';
        } else if (error.message.includes('file') || error.message.includes('storage')) {
          errorMessage = 'File access error';
          errorDescription = 'The file may be unavailable or expired';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast.error(errorMessage, { 
        id: `print-${job.id}`,
        description: errorDescription,
        duration: 6000
      });
    }
  };

  const handleCancelJob = async (jobId: string, fileName?: string) => {
    if (!jobId) {
      toast.error('Invalid job ID', { description: 'Cannot cancel job without valid ID' });
      return;
    }

    try {
      // Show loading state
      toast.loading('Cancelling job...', { id: `cancel-${jobId}` });
      
      await updateJobStatus(jobId, 'cancelled');
      
      toast.success('Job cancelled!', { 
        id: `cancel-${jobId}`,
        description: fileName ? `${fileName} has been cancelled` : 'Print job cancelled successfully',
        duration: 3000
      });
    } catch (error) {
      console.error('Error cancelling job:', error);
      
      let errorMessage = 'Failed to cancel job';
      let errorDescription = 'Please try again';
      
      if (error instanceof Error) {
        if (error.message.includes('InvalidJWT') || error.message.includes('token')) {
          errorMessage = 'Authentication error';
          errorDescription = 'Please refresh the page and try again';
        } else if (error.message.includes('network') || error.message.includes('timeout')) {
          errorMessage = 'Network error';
          errorDescription = 'Check your connection and try again';
        } else {
          errorDescription = error.message || errorDescription;
        }
      }
      
      toast.error(errorMessage, { 
        id: `cancel-${jobId}`,
        description: errorDescription,
        duration: 5000
      });
    }
  };

  const handleViewFile = async (job: PrintJob) => {
    try {
      // Show loading toast
      toast.loading('Opening file...', { id: `view-${job.id}` });

      // Get authenticated client with valid JWT
      const client = await getAuthenticatedClient();

      if (!job.file_url) {
        const possibleFilePath = `${job.customer_id}/${job.file_name}`;
        const { data: urlData, error } = await client.storage
          .from('user-uploads')
          .createSignedUrl(possibleFilePath, 3600);
        
        if (error) {
          console.error('Storage error:', error);
          throw new Error(`Failed to access file: ${error.message}`);
        }
        
        if (urlData?.signedUrl) {
          window.open(urlData.signedUrl, '_blank');
          toast.success('File opened!', { 
            id: `view-${job.id}`,
            description: job.file_name
          });
        } else {
          throw new Error('No signed URL received');
        }
      } else {
        window.open(job.file_url, '_blank');
        toast.success('File opened!', { 
          id: `view-${job.id}`,
          description: job.file_name
        });
      }
    } catch (error) {
      console.error('Error viewing file:', error);
      
      let errorMessage = 'Failed to open file';
      if (error instanceof Error) {
        if (error.message.includes('InvalidJWT') || error.message.includes('token')) {
          errorMessage = 'Authentication error - please try again';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast.error(errorMessage, { 
        id: `view-${job.id}`,
        description: 'Please try again or contact support'
      });
    }
  };

  const handlePrintMultiple = async (jobs: PrintJob[]) => {
    if (!jobs || jobs.length === 0) {
      toast.error('No jobs selected', { description: 'Please select jobs to print' });
      return;
    }

    try {
      toast.loading(`Printing ${jobs.length} jobs...`, { id: 'bulk-print' });
      
      let successCount = 0;
      let failureCount = 0;
      
      for (const job of jobs) {
        try {
          await handleDirectPrint(job);
          successCount++;
          await new Promise(resolve => setTimeout(resolve, 500)); // Delay between prints
        } catch (error) {
          console.error(`Failed to print job ${job.id}:`, error);
          failureCount++;
        }
      }
      
      if (failureCount === 0) {
        toast.success(`All ${successCount} jobs printed successfully!`, { 
          id: 'bulk-print',
          duration: 4000
        });
      } else if (successCount > 0) {
        toast.warning(`${successCount} jobs printed, ${failureCount} failed`, { 
          id: 'bulk-print',
          description: 'Check individual job statuses for details',
          duration: 5000
        });
      } else {
        toast.error(`Failed to print all ${failureCount} jobs`, { 
          id: 'bulk-print',
          description: 'Please try again or check individual jobs',
          duration: 6000
        });
      }
    } catch (error) {
      console.error('Error in bulk print operation:', error);
      toast.error('Bulk print operation failed', { 
        id: 'bulk-print',
        description: 'Please try printing jobs individually',
        duration: 6000
      });
    }
  };

  const updateJobStatus = async (jobId: string, newStatus: PrintJobStatus) => {
    try {
      // Get authenticated client with valid JWT
      const client = await getAuthenticatedClient();

      // Add timestamp based on status
      const updateData: any = { status: newStatus };
      
      if (newStatus === 'completed') {
        updateData.completed_at = new Date().toISOString();
      } else if (newStatus === 'cancelled') {
        updateData.cancelled_at = new Date().toISOString();
      } else if (newStatus === 'printing') {
        updateData.started_at = new Date().toISOString();
      }

      const { error } = await client
        .from('print_jobs')
        .update(updateData)
        .eq('id', jobId);

      if (error) {
        console.error('Database error:', error);
        throw new Error(`Failed to update job status: ${error.message}`);
      }

      // Update local state immediately for optimistic updates
      setPrintJobs(prevJobs => 
        prevJobs.map(job => 
          job.id === jobId 
            ? { ...job, ...updateData }
            : job
        )
      );

      const statusMessages = {
        'queued': 'Job queued',
        'printing': 'Job started printing',
        'completed': 'Job completed',
        'cancelled': 'Job cancelled'
      };

      toast.success(statusMessages[newStatus] || 'Job status updated', {
        description: `Job ID: ${jobId.slice(0, 6)}`,
        duration: 3000
      });

    } catch (error) {
      console.error('Error updating job status:', error);
      
      let errorMessage = 'Failed to update job status';
      if (error instanceof Error) {
        if (error.message.includes('InvalidJWT') || error.message.includes('token')) {
          errorMessage = 'Authentication error - please try again';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast.error(errorMessage, {
        description: 'Please try again or contact support'
      });
    }
  };

  const filteredJobs = printJobs.filter(job => {
    const query = searchQuery.toLowerCase();
    
    // Check if query is 2 digits for phone number search
    const isPhoneSearch = /^\d{2}$/.test(searchQuery);
    const phoneMatch = isPhoneSearch && job.customer_phone ? 
      job.customer_phone.slice(-2) === searchQuery : false;
    
    const matchesSearch = 
      job.file_name.toLowerCase().includes(query) ||
      job.customer_name?.toLowerCase().includes(query) ||
      job.customer_email?.toLowerCase().includes(query) ||
      job.id.slice(0, 6).toLowerCase().includes(query) ||
      job.notes?.toLowerCase().includes(query) ||
      phoneMatch;
    
    if (activeTab === 'all') return matchesSearch;
    return matchesSearch && job.status === activeTab;
  });

  const getStatusIcon = (status: PrintJobStatus) => {
    switch (status) {
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'queued': return <AlertCircle className="w-4 h-4 text-blue-500" />;
      case 'printing': return <PlayCircle className="w-4 h-4 text-green-500" />;
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'cancelled': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: PrintJobStatus) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'queued': return 'bg-blue-100 text-blue-800';
      case 'printing': return 'bg-green-100 text-green-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Status counts from database data
  const statusCounts = {
    all: totalJobs,
    pending: printJobs.filter(job => job.status === 'pending').length,
    queued: printJobs.filter(job => job.status === 'queued').length,
    printing: printJobs.filter(job => job.status === 'printing').length,
    completed: printJobs.filter(job => job.status === 'completed').length,
    cancelled: printJobs.filter(job => job.status === 'cancelled').length,
  };

  return (
    <div className="min-h-screen bg-background">
      <ShopHeader currentPage="Print Queue" />

      <main className="container mx-auto px-6 py-8">
        {/* Network status indicator */}
        {!isOnline && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
            <div className="flex items-center">
              <AlertCircle className="w-5 h-5 text-yellow-600 mr-2" />
              <span className="text-sm text-yellow-800">
                You're currently offline. Data may not be up to date.
              </span>
            </div>
          </div>
        )}

        {/* Show subtle loading indicator only on initial load */}
        {initialLoad && (
          <div className="text-center py-4 mb-4">
            <div className="inline-flex items-center text-sm text-muted-foreground">
              <RefreshCw className="w-4 h-4 animate-spin mr-2" />
              Loading print queue...
            </div>
          </div>
        )}
        
        {/* Header Section */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Print Queue Management
            </h1>
            <p className="text-muted-foreground">
              Monitor and manage your print queue in real-time
            </p>
          </div>
          <Button onClick={() => fetchPrintJobs()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        {/* Sticky Stats and Tabs Section */}
        <div className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border pb-4">
          {/* Statistics */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-4 mb-6 pt-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Jobs</p>
                    <p className="text-2xl font-bold">{totalJobs}</p>
                  </div>
                  <FileText className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Active Pages</p>
                    <p className="text-2xl font-bold">{activeTotalPages}</p>
                  </div>
                  <Printer className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Queue Length</p>
                    <p className="text-2xl font-bold">{queueLength}</p>
                  </div>
                  <Clock className="w-8 h-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Pages Today</p>
                    <p className="text-2xl font-bold">{totalPagesToday}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Today's Revenue</p>
                    <p className="text-2xl font-bold">৳{todayRevenue.toFixed(2)}</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Avg Time</p>
                    <p className="text-2xl font-bold">{Math.round(avgTime)}m</p>
                  </div>
                  <Clock className="w-8 h-8 text-purple-600" />
                </div>
              </CardContent>
            </Card>

            {/* File Cleanup Card */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground">File Cleanup</p>
                      <p className="text-sm font-bold text-orange-600">24h Auto</p>
                    </div>
                    <Timer className="w-6 h-6 text-orange-600" />
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={async () => {
                      toast.loading('Running cleanup...', { id: 'manual-cleanup' });
                      try {
                        // Import and use cleanup service
                        const { triggerCleanup } = await import('@/api/fileCleanup');
                        const result = await triggerCleanup();
                        
                        if (result.success) {
                          toast.success(result.message, { 
                            id: 'manual-cleanup',
                            description: result.data?.errors.length ? `${result.data.errors.length} errors occurred` : undefined
                          });
                          // Refresh the print jobs to remove cleaned up files
                          fetchPrintJobs();
                        } else {
                          toast.error(result.message, { 
                            id: 'manual-cleanup',
                            description: result.error 
                          });
                        }
                      } catch (error) {
                        toast.error('Cleanup failed', { 
                          id: 'manual-cleanup',
                          description: error instanceof Error ? error.message : 'Unknown error'
                        });
                      }
                    }}
                    className="w-full text-xs"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Clean Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs and Controls */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="all">All Jobs ({statusCounts.all})</TabsTrigger>
                <TabsTrigger value="pending">Pending ({statusCounts.pending})</TabsTrigger>
                <TabsTrigger value="queued">Queued ({statusCounts.queued})</TabsTrigger>
                <TabsTrigger value="printing">Printing ({statusCounts.printing})</TabsTrigger>
                <TabsTrigger value="completed">Completed ({statusCounts.completed})</TabsTrigger>
                <TabsTrigger value="cancelled">Cancelled ({statusCounts.cancelled})</TabsTrigger>
              </TabsList>

              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                  <Input
                    placeholder="Search by name, file, ID, or last 2 digits of phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-96"
                  />
                </div>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="submit_time">Sort by Submit Time</SelectItem>
                    <SelectItem value="priority">Sort by Priority</SelectItem>
                    <SelectItem value="customer">Sort by Customer</SelectItem>
                    <SelectItem value="cost">Sort by Cost</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Tabs>
        </div>

        {/* Job List Content */}
        <div className="mt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsContent value={activeTab} className="mt-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Current Queue ({filteredJobs.length} jobs)</h3>
                  
                  {/* Bulk Actions */}
                  {filteredJobs.length > 0 && (
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handlePrintMultiple(filteredJobs.filter(job => ['queued', 'printing'].includes(job.status)))}
                      disabled={!filteredJobs.some(job => ['queued', 'printing'].includes(job.status))}
                    >
                      <PrinterIcon className="w-4 h-4 mr-2" />
                      Print All Ready Jobs
                    </Button>
                  )}
                </div>
                
                {filteredJobs.length === 0 ? (
                  <Card className="text-center py-12">
                    <CardContent>
                      <div className="text-muted-foreground">
                        <Printer className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <h3 className="text-lg font-medium mb-2">No jobs found</h3>
                        <p>New print jobs will appear here automatically.</p>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-2">
                    {filteredJobs.map((job) => (
                      <Card key={job.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              {getStatusIcon(job.status)}
                              <div>
                                <h4 className="font-medium">{job.file_name}</h4>
                                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                                  <span>{job.customer_name || job.customer_email || 'Unknown Customer'}</span>
                                  <span>•</span>
                                  <span>ID: {job.id.slice(0, 6)}</span>
                                  <span>•</span>
                                  <span>{job.pages} pages</span>
                                  <span>•</span>
                                  <span>{job.copies} copies</span>
                                  <span>•</span>
                                  <span className="font-medium text-foreground">Total: {job.pages * job.copies} pages</span>
                                  <span>•</span>
                                  <span>৳{job.total_cost.toFixed(2)}</span>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-3">
                              <Badge className={getStatusColor(job.status)}>
                                {job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                              </Badge>
                              
                              {/* File Expiry Badge */}
                              {(() => {
                                const expiryInfo = getFileExpiryInfo(job.created_at);
                                return (
                                  <Badge 
                                    variant={getExpiryBadgeVariant(expiryInfo)}
                                    className="flex items-center space-x-1"
                                  >
                                    <Timer className="w-3 h-3" />
                                    <span>{getExpiryBadgeText(expiryInfo)}</span>
                                  </Badge>
                                );
                              })()}
                              
                              {/* File Actions */}
                              <div className="flex items-center space-x-1">
                                {/* View File - Available for all job statuses but warn for expired files */}
                                {(() => {
                                  const expired = isFileExpired(job.created_at);
                                  return (
                                    <Button 
                                      size="sm" 
                                      variant={expired ? "destructive" : "outline"}
                                      onClick={() => {
                                        if (expired) {
                                          toast.error('File has expired', { 
                                            description: 'This file was automatically deleted after 24 hours' 
                                          });
                                        } else {
                                          handleViewFile(job);
                                        }
                                      }}
                                      title={expired ? "File has expired and may no longer be available" : "View or download file"}
                                    >
                                      {expired ? <Trash2 className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                                    </Button>
                                  );
                                })()}
                                
                                {/* Print Directly - Only for non-completed/non-expired jobs */}
                                {(() => {
                                  const expired = isFileExpired(job.created_at);
                                  const canPrint = !['completed', 'cancelled'].includes(job.status) && !expired;
                                  
                                  if (!canPrint) return null;
                                  
                                  return (
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => handleDirectPrint(job)}
                                      title="Print directly and mark as completed (notifies customer)"
                                    >
                                      🖨️
                                    </Button>
                                  );
                                })()}
                              </div>
                              
                              {/* Status Actions - Only for active, non-expired jobs */}
                              {(() => {
                                const expired = isFileExpired(job.created_at);
                                const isActive = !['completed', 'cancelled'].includes(job.status);
                                
                                if (!isActive || expired) return null;
                                
                                return (
                                  <div className="flex items-center space-x-1">
                                    {job.status === 'queued' && (
                                      <Button 
                                        size="sm" 
                                        onClick={() => updateJobStatus(job.id, 'printing')}
                                        title="Start printing process"
                                      >
                                        Start Printing
                                      </Button>
                                    )}
                                    
                                    {job.status === 'printing' && (
                                      <Button 
                                        size="sm" 
                                        variant="outline"
                                        onClick={() => updateJobStatus(job.id, 'completed')}
                                        title="Mark job as completed (notifies customer)"
                                      >
                                        Mark Complete
                                      </Button>
                                    )}
                                    
                                    {['pending', 'queued', 'printing'].includes(job.status) && (
                                      <Button 
                                        size="sm" 
                                        variant="destructive"
                                        onClick={() => handleCancelJob(job.id, job.file_name)}
                                        title="Cancel job and notify customer"
                                      >
                                        <X className="w-4 h-4" />
                                      </Button>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default PrintQueue;