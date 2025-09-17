-- Create print_queue_settings table
CREATE TABLE IF NOT EXISTS print_queue_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  auto_accept_orders BOOLEAN DEFAULT TRUE,
  priority_queue_enabled BOOLEAN DEFAULT FALSE,
  maximum_queue_size INTEGER DEFAULT 50,
  estimated_time_per_page INTEGER DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  -- Ensure only one set of settings per shop owner
  CONSTRAINT print_queue_settings_shop_owner_unique UNIQUE (shop_owner_id)
);

-- Add RLS policies
ALTER TABLE print_queue_settings ENABLE ROW LEVEL SECURITY;

-- Policy for shop owners to see only their own settings
CREATE POLICY "Shop owners can view their own print queue settings"
  ON print_queue_settings
  FOR SELECT
  USING (auth.uid() = shop_owner_id);

-- Policy for shop owners to insert their own settings
CREATE POLICY "Shop owners can insert their own print queue settings"
  ON print_queue_settings
  FOR INSERT
  WITH CHECK (auth.uid() = shop_owner_id);

-- Policy for shop owners to update their own settings
CREATE POLICY "Shop owners can update their own print queue settings"
  ON print_queue_settings
  FOR UPDATE
  USING (auth.uid() = shop_owner_id);

-- Add function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Add trigger to automatically update updated_at
CREATE TRIGGER update_print_queue_settings_updated_at
  BEFORE UPDATE ON print_queue_settings
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();

-- Create print_jobs table if it doesn't exist already
CREATE TABLE IF NOT EXISTS print_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT CHECK (status IN ('queued', 'printing', 'completed', 'cancelled', 'failed')) DEFAULT 'queued',
  pages INTEGER DEFAULT 1,
  job_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  scheduled_time TIMESTAMP WITH TIME ZONE,
  completed_time TIMESTAMP WITH TIME ZONE
);

-- Add RLS policies
ALTER TABLE print_jobs ENABLE ROW LEVEL SECURITY;

-- Policy for shop owners to see their own print jobs
CREATE POLICY "Shop owners can view their own print jobs"
  ON print_jobs
  FOR SELECT
  USING (auth.uid() = shop_owner_id);

-- Policy for shop owners to insert print jobs
CREATE POLICY "Shop owners can insert print jobs"
  ON print_jobs
  FOR INSERT
  WITH CHECK (auth.uid() = shop_owner_id);

-- Policy for shop owners to update their own print jobs
CREATE POLICY "Shop owners can update their own print jobs"
  ON print_jobs
  FOR UPDATE
  USING (auth.uid() = shop_owner_id);

-- Policy for customers to view their own print jobs
CREATE POLICY "Customers can view their own print jobs"
  ON print_jobs
  FOR SELECT
  USING (auth.uid() = customer_id);

-- Add trigger to automatically update updated_at for print_jobs
CREATE TRIGGER update_print_jobs_updated_at
  BEFORE UPDATE ON print_jobs
  FOR EACH ROW
  EXECUTE PROCEDURE update_updated_at_column();