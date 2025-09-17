-- Create enum for print job status
CREATE TYPE public.print_job_status AS ENUM ('pending', 'queued', 'printing', 'completed', 'cancelled');

-- Create print_jobs table
CREATE TABLE public.print_jobs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    shop_owner_id UUID NOT NULL,
    customer_id UUID,
    customer_name TEXT,
    customer_email TEXT,
    file_name TEXT NOT NULL,
    file_url TEXT,
    file_size INTEGER,
    pages INTEGER DEFAULT 1,
    copies INTEGER DEFAULT 1,
    color_pages INTEGER DEFAULT 0,
    total_cost DECIMAL(10,2) DEFAULT 0.00,
    status print_job_status NOT NULL DEFAULT 'pending',
    priority INTEGER DEFAULT 0,
    estimated_duration INTEGER, -- in minutes
    actual_duration INTEGER, -- in minutes
    submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    print_settings JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.print_jobs ENABLE ROW LEVEL SECURITY;

-- Create policies for shop owners to manage their jobs
CREATE POLICY "Shop owners can view their jobs" 
ON public.print_jobs 
FOR SELECT 
USING (auth.uid() = shop_owner_id);

CREATE POLICY "Shop owners can insert jobs" 
ON public.print_jobs 
FOR INSERT 
WITH CHECK (auth.uid() = shop_owner_id);

CREATE POLICY "Shop owners can update their jobs" 
ON public.print_jobs 
FOR UPDATE 
USING (auth.uid() = shop_owner_id);

CREATE POLICY "Shop owners can delete their jobs" 
ON public.print_jobs 
FOR DELETE 
USING (auth.uid() = shop_owner_id);

-- Customers can view their own jobs
CREATE POLICY "Customers can view their own jobs" 
ON public.print_jobs 
FOR SELECT 
USING (auth.uid() = customer_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_print_job_timestamps()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    
    -- Set started_at when status changes to printing
    IF OLD.status != 'printing' AND NEW.status = 'printing' THEN
        NEW.started_at = now();
    END IF;
    
    -- Set completed_at when status changes to completed
    IF OLD.status != 'completed' AND NEW.status = 'completed' THEN
        NEW.completed_at = now();
        -- Calculate actual duration if started_at exists
        IF NEW.started_at IS NOT NULL THEN
            NEW.actual_duration = EXTRACT(EPOCH FROM (now() - NEW.started_at)) / 60;
        END IF;
    END IF;
    
    -- Set cancelled_at when status changes to cancelled
    IF OLD.status != 'cancelled' AND NEW.status = 'cancelled' THEN
        NEW.cancelled_at = now();
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_print_jobs_timestamps
BEFORE UPDATE ON public.print_jobs
FOR EACH ROW
EXECUTE FUNCTION public.update_print_job_timestamps();

-- Add table to realtime publication for real-time updates
ALTER TABLE public.print_jobs REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.print_jobs;