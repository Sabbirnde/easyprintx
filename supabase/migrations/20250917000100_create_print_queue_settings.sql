-- Create print queue settings table
CREATE TABLE IF NOT EXISTS public.print_queue_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    shop_id UUID NOT NULL,
    auto_accept BOOLEAN DEFAULT false,
    notification_enabled BOOLEAN DEFAULT true,
    queue_limit INTEGER DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(user_id, shop_id)
);

-- Enable Row Level Security
ALTER TABLE public.print_queue_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own print queue settings"
ON public.print_queue_settings
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own print queue settings"
ON public.print_queue_settings
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert their own print queue settings"
ON public.print_queue_settings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own print queue settings"
ON public.print_queue_settings
FOR DELETE
USING (auth.uid() = user_id);

-- Create function to update print queue settings
CREATE OR REPLACE FUNCTION public.upsert_print_queue_settings(
    p_shop_id UUID,
    p_auto_accept BOOLEAN DEFAULT false,
    p_notification_enabled BOOLEAN DEFAULT true,
    p_queue_limit INTEGER DEFAULT 10
) RETURNS public.print_queue_settings
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_settings public.print_queue_settings;
BEGIN
    INSERT INTO public.print_queue_settings (
        user_id,
        shop_id,
        auto_accept,
        notification_enabled,
        queue_limit
    )
    VALUES (
        auth.uid(),
        p_shop_id,
        p_auto_accept,
        p_notification_enabled,
        p_queue_limit
    )
    ON CONFLICT (user_id, shop_id)
    DO UPDATE SET
        auto_accept = EXCLUDED.auto_accept,
        notification_enabled = EXCLUDED.notification_enabled,
        queue_limit = EXCLUDED.queue_limit,
        updated_at = now()
    RETURNING * INTO v_settings;

    RETURN v_settings;
END;
$$;