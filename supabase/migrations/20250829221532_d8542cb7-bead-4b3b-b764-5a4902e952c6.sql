-- Create shop_settings table for global settings
CREATE TABLE public.shop_settings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    shop_owner_id UUID NOT NULL,
    slot_duration_minutes INTEGER DEFAULT 10,
    max_jobs_per_slot INTEGER DEFAULT 5,
    advance_booking_days INTEGER DEFAULT 7,
    auto_accept_bookings BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(shop_owner_id)
);

-- Create day_of_week enum
CREATE TYPE public.day_of_week AS ENUM ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday');

-- Create operating_hours table
CREATE TABLE public.operating_hours (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    shop_owner_id UUID NOT NULL,
    day_of_week day_of_week NOT NULL,
    is_open BOOLEAN DEFAULT true,
    open_time TIME NOT NULL DEFAULT '09:00',
    close_time TIME NOT NULL DEFAULT '18:00',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(shop_owner_id, day_of_week)
);

-- Create time_slots table
CREATE TABLE public.time_slots (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    shop_owner_id UUID NOT NULL,
    slot_date DATE NOT NULL,
    slot_time TIME NOT NULL,
    max_capacity INTEGER DEFAULT 5,
    current_bookings INTEGER DEFAULT 0,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(shop_owner_id, slot_date, slot_time)
);

-- Create bookings table
CREATE TABLE public.bookings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    shop_owner_id UUID NOT NULL,
    customer_id UUID,
    customer_name TEXT,
    customer_email TEXT,
    time_slot_id UUID REFERENCES public.time_slots(id) ON DELETE CASCADE,
    slot_date DATE NOT NULL,
    slot_time TIME NOT NULL,
    print_job_id UUID REFERENCES public.print_jobs(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'confirmed',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.shop_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.operating_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for shop_settings
CREATE POLICY "Shop owners can manage their settings" ON public.shop_settings FOR ALL USING (auth.uid() = shop_owner_id);

-- Create RLS policies for operating_hours
CREATE POLICY "Shop owners can manage their hours" ON public.operating_hours FOR ALL USING (auth.uid() = shop_owner_id);

-- Create RLS policies for time_slots
CREATE POLICY "Shop owners can manage their slots" ON public.time_slots FOR ALL USING (auth.uid() = shop_owner_id);
CREATE POLICY "Customers can view available slots" ON public.time_slots FOR SELECT USING (is_available = true);

-- Create RLS policies for bookings
CREATE POLICY "Shop owners can manage their bookings" ON public.bookings FOR ALL USING (auth.uid() = shop_owner_id);
CREATE POLICY "Customers can view their bookings" ON public.bookings FOR SELECT USING (auth.uid() = customer_id);
CREATE POLICY "Customers can create bookings" ON public.bookings FOR INSERT WITH CHECK (auth.uid() = customer_id);

-- Create triggers for updated_at
CREATE TRIGGER update_shop_settings_updated_at
BEFORE UPDATE ON public.shop_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_operating_hours_updated_at
BEFORE UPDATE ON public.operating_hours
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_time_slots_updated_at
BEFORE UPDATE ON public.time_slots
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
BEFORE UPDATE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to update slot capacity when bookings change
CREATE OR REPLACE FUNCTION public.update_slot_capacity()
RETURNS TRIGGER AS $$
BEGIN
    -- Update current_bookings count for the affected time slot
    UPDATE public.time_slots 
    SET current_bookings = (
        SELECT COUNT(*) 
        FROM public.bookings 
        WHERE time_slot_id = COALESCE(NEW.time_slot_id, OLD.time_slot_id)
        AND status = 'confirmed'
    ),
    is_available = (
        SELECT COUNT(*) 
        FROM public.bookings 
        WHERE time_slot_id = COALESCE(NEW.time_slot_id, OLD.time_slot_id)
        AND status = 'confirmed'
    ) < max_capacity
    WHERE id = COALESCE(NEW.time_slot_id, OLD.time_slot_id);
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for booking changes
CREATE TRIGGER update_slot_capacity_on_booking_change
AFTER INSERT OR UPDATE OR DELETE ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.update_slot_capacity();

-- Add realtime support
ALTER TABLE public.shop_settings REPLICA IDENTITY FULL;
ALTER TABLE public.operating_hours REPLICA IDENTITY FULL;
ALTER TABLE public.time_slots REPLICA IDENTITY FULL;
ALTER TABLE public.bookings REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.shop_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.operating_hours;
ALTER PUBLICATION supabase_realtime ADD TABLE public.time_slots;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;