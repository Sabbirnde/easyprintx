-- SECURITY FIX: Separate public shop directory from private shop owner contact information

-- Step 1: Create a new public shop directory table for publicly accessible business information
CREATE TABLE public.public_shop_directory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_owner_id UUID NOT NULL,
  shop_name TEXT NOT NULL DEFAULT 'My Print Shop',
  description TEXT,
  address TEXT,
  business_hours JSONB DEFAULT '{"monday": {"open": "09:00", "close": "18:00", "isOpen": true}, "tuesday": {"open": "09:00", "close": "18:00", "isOpen": true}, "wednesday": {"open": "09:00", "close": "18:00", "isOpen": true}, "thursday": {"open": "09:00", "close": "18:00", "isOpen": true}, "friday": {"open": "09:00", "close": "18:00", "isOpen": true}, "saturday": {"open": "10:00", "close": "16:00", "isOpen": true}, "sunday": {"open": "10:00", "close": "16:00", "isOpen": false}}',
  services_offered TEXT[] DEFAULT ARRAY['Black & White Printing', 'Color Printing', 'Document Binding'],
  rating NUMERIC(2,1) DEFAULT 4.5,
  total_reviews INTEGER DEFAULT 0,
  logo_url TEXT,
  website_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Step 2: Enable RLS on the new public directory table
ALTER TABLE public.public_shop_directory ENABLE ROW LEVEL SECURITY;

-- Step 3: Create RLS policies for public shop directory
-- Public can view active shop listings (this is safe - no personal contact info)
CREATE POLICY "Public can view active shop listings" 
ON public.public_shop_directory 
FOR SELECT 
USING (is_active = true);

-- Shop owners can manage their own shop listing
CREATE POLICY "Shop owners can manage their own listing" 
ON public.public_shop_directory 
FOR ALL 
USING (auth.uid() = shop_owner_id)
WITH CHECK (auth.uid() = shop_owner_id);

-- Step 4: Migrate existing data from shop_info to public_shop_directory
INSERT INTO public.public_shop_directory (
  shop_owner_id,
  shop_name,
  description,
  address,
  logo_url,
  website_url,
  created_at,
  updated_at
)
SELECT 
  shop_owner_id,
  shop_name,
  description,
  address,
  logo_url,
  website_url,
  created_at,
  updated_at
FROM public.shop_info;

-- Step 5: Remove the public read policy from shop_info table to secure private data
DROP POLICY IF EXISTS "Public can view shop info" ON public.shop_info;

-- Step 6: Ensure shop_info is only accessible to shop owners (private contact data)
-- This policy should already exist, but let's make sure it's correct
DROP POLICY IF EXISTS "Shop owners can manage their info" ON public.shop_info;
CREATE POLICY "Shop owners can manage their private info" 
ON public.shop_info 
FOR ALL 
USING (auth.uid() = shop_owner_id)
WITH CHECK (auth.uid() = shop_owner_id);

-- Step 7: Add updated_at trigger for the new table
CREATE TRIGGER update_public_shop_directory_updated_at
  BEFORE UPDATE ON public.public_shop_directory
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Step 8: Add indexes for better performance
CREATE INDEX idx_public_shop_directory_active ON public.public_shop_directory(is_active);
CREATE INDEX idx_public_shop_directory_owner ON public.public_shop_directory(shop_owner_id);
CREATE INDEX idx_public_shop_directory_name ON public.public_shop_directory(shop_name);

-- Step 9: Add comments for documentation
COMMENT ON TABLE public.public_shop_directory IS 'Public business directory containing only non-sensitive shop information visible to customers';
COMMENT ON TABLE public.shop_info IS 'Private shop owner contact information - restricted access';
COMMENT ON COLUMN public.shop_info.email_address IS 'PRIVATE: Shop owner email - not publicly accessible';
COMMENT ON COLUMN public.shop_info.phone_number IS 'PRIVATE: Shop owner phone - not publicly accessible';