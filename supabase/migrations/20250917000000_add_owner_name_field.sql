-- Migration to add owner_name field and update policies
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS owner_name TEXT;

-- Update RLS policies for owner name
CREATE POLICY "Users can update their own owner_name"
ON public.profiles
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create function to update owner_name
CREATE OR REPLACE FUNCTION public.update_owner_name(new_owner_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles
  SET owner_name = new_owner_name,
      updated_at = now()
  WHERE user_id = auth.uid();
  
  RETURN FOUND;
END;
$$;