-- File Auto-Expiry System
-- Files and their database records are automatically deleted after 24 hours

-- Create index on created_at for efficient cleanup queries
CREATE INDEX IF NOT EXISTS idx_print_jobs_created_at ON public.print_jobs(created_at);

-- Create function to clean up expired print jobs and their associated files
CREATE OR REPLACE FUNCTION public.cleanup_expired_files()
RETURNS INTEGER AS $$
DECLARE
    expired_job RECORD;
    deleted_count INTEGER := 0;
    file_path TEXT;
BEGIN
    -- Log start of cleanup
    RAISE LOG 'Starting file cleanup for jobs older than 24 hours';
    
    -- Find all jobs older than 24 hours
    FOR expired_job IN 
        SELECT id, customer_id, file_name, file_url
        FROM public.print_jobs 
        WHERE created_at < NOW() - INTERVAL '24 hours'
    LOOP
        BEGIN
            -- Try to delete file from storage if it exists
            IF expired_job.file_name IS NOT NULL AND expired_job.customer_id IS NOT NULL THEN
                file_path := expired_job.customer_id || '/' || expired_job.file_name;
                
                -- Note: The actual file deletion from storage will be handled by the API endpoint
                -- This function only handles database cleanup
                RAISE LOG 'Marking for deletion: %', file_path;
            END IF;
            
            -- Delete the database record
            DELETE FROM public.print_jobs WHERE id = expired_job.id;
            deleted_count := deleted_count + 1;
            
        EXCEPTION WHEN OTHERS THEN
            -- Log error but continue with other records
            RAISE WARNING 'Failed to delete job %: %', expired_job.id, SQLERRM;
        END;
    END LOOP;
    
    RAISE LOG 'File cleanup completed. Deleted % records', deleted_count;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to get files that are about to expire (within 2 hours)
CREATE OR REPLACE FUNCTION public.get_expiring_files()
RETURNS TABLE (
    job_id UUID,
    customer_id UUID,
    file_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        pj.id,
        pj.customer_id,
        pj.file_name,
        pj.created_at,
        pj.created_at + INTERVAL '24 hours' as expires_at
    FROM public.print_jobs pj
    WHERE pj.created_at > NOW() - INTERVAL '24 hours'
    AND pj.created_at < NOW() - INTERVAL '22 hours'
    ORDER BY pj.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if a file is expired
CREATE OR REPLACE FUNCTION public.is_file_expired(job_created_at TIMESTAMP WITH TIME ZONE)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN job_created_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql;

-- Add computed column for file expiry status
-- This will help in the frontend to show expiry warnings
ALTER TABLE public.print_jobs ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE 
GENERATED ALWAYS AS (created_at + INTERVAL '24 hours') STORED;

-- Create index on expires_at for efficient expiry queries
CREATE INDEX IF NOT EXISTS idx_print_jobs_expires_at ON public.print_jobs(expires_at);

-- Add RLS policies for the cleanup function (allow service role to execute)
-- The cleanup function should be called by a scheduled job or API endpoint

-- Grant execute permission to service role for cleanup functions
-- Note: This will be handled by the API endpoint with proper authentication

-- Create view for expired files (helpful for monitoring)
CREATE OR REPLACE VIEW public.expired_files_view AS
SELECT 
    id,
    customer_id,
    customer_name,
    file_name,
    file_size,
    created_at,
    expires_at,
    NOW() - created_at as age,
    status
FROM public.print_jobs
WHERE created_at < NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;

-- Create view for files expiring soon (within 2 hours)
CREATE OR REPLACE VIEW public.expiring_soon_view AS
SELECT 
    id,
    customer_id,
    customer_name,
    file_name,
    file_size,
    created_at,
    expires_at,
    expires_at - NOW() as time_until_expiry,
    status
FROM public.print_jobs
WHERE created_at > NOW() - INTERVAL '24 hours'
AND created_at < NOW() - INTERVAL '22 hours'
ORDER BY created_at ASC;

-- Add comments for documentation
COMMENT ON FUNCTION public.cleanup_expired_files() IS 'Removes print jobs and associated files older than 24 hours';
COMMENT ON FUNCTION public.get_expiring_files() IS 'Returns files that will expire within 2 hours';
COMMENT ON FUNCTION public.is_file_expired(TIMESTAMP WITH TIME ZONE) IS 'Checks if a file has expired based on creation time';
COMMENT ON COLUMN public.print_jobs.expires_at IS 'Computed field showing when the file will be automatically deleted (24 hours after creation)';
COMMENT ON VIEW public.expired_files_view IS 'View showing all files that have exceeded the 24-hour retention period';
COMMENT ON VIEW public.expiring_soon_view IS 'View showing files that will expire within 2 hours';