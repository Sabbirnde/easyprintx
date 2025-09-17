-- Add RLS policy to allow customers to create their own print jobs
CREATE POLICY "Customers can create their own jobs" 
ON print_jobs 
FOR INSERT 
WITH CHECK (auth.uid() = customer_id);