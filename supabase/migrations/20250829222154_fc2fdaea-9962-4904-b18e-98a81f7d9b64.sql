-- Create shop_info table for basic shop details
CREATE TABLE public.shop_info (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    shop_owner_id UUID NOT NULL UNIQUE,
    shop_name TEXT NOT NULL DEFAULT 'My Print Shop',
    phone_number TEXT,
    email_address TEXT,
    address TEXT,
    description TEXT,
    logo_url TEXT,
    website_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create pricing_rules table for service pricing
CREATE TABLE public.pricing_rules (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    shop_owner_id UUID NOT NULL,
    service_type TEXT NOT NULL,
    price_per_page DECIMAL(10,3) DEFAULT 0.10,
    color_multiplier DECIMAL(3,2) DEFAULT 2.0,
    minimum_charge DECIMAL(10,2) DEFAULT 0.50,
    bulk_discount_threshold INTEGER DEFAULT 100,
    bulk_discount_percentage DECIMAL(5,2) DEFAULT 10.0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(shop_owner_id, service_type)
);

-- Create equipment table for printer/equipment management
CREATE TABLE public.equipment (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    shop_owner_id UUID NOT NULL,
    equipment_name TEXT NOT NULL,
    equipment_type TEXT NOT NULL, -- 'printer', 'scanner', 'binding_machine', etc.
    brand TEXT,
    model TEXT,
    status TEXT DEFAULT 'active', -- 'active', 'maintenance', 'inactive'
    capabilities JSONB, -- supported paper sizes, color support, etc.
    last_maintenance DATE,
    next_maintenance DATE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notifications_settings table
CREATE TABLE public.notification_settings (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    shop_owner_id UUID NOT NULL UNIQUE,
    email_notifications BOOLEAN DEFAULT true,
    sms_notifications BOOLEAN DEFAULT false,
    new_order_notifications BOOLEAN DEFAULT true,
    order_completion_notifications BOOLEAN DEFAULT true,
    low_supplies_notifications BOOLEAN DEFAULT true,
    equipment_maintenance_notifications BOOLEAN DEFAULT true,
    daily_summary_notifications BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.shop_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Shop owners can manage their info" ON public.shop_info FOR ALL USING (auth.uid() = shop_owner_id);
CREATE POLICY "Shop owners can manage their pricing" ON public.pricing_rules FOR ALL USING (auth.uid() = shop_owner_id);
CREATE POLICY "Shop owners can manage their equipment" ON public.equipment FOR ALL USING (auth.uid() = shop_owner_id);
CREATE POLICY "Shop owners can manage their notifications" ON public.notification_settings FOR ALL USING (auth.uid() = shop_owner_id);

-- Customers can view shop info for public listings
CREATE POLICY "Public can view shop info" ON public.shop_info FOR SELECT USING (true);
CREATE POLICY "Public can view pricing" ON public.pricing_rules FOR SELECT USING (true);

-- Create triggers for updated_at
CREATE TRIGGER update_shop_info_updated_at
BEFORE UPDATE ON public.shop_info
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pricing_rules_updated_at
BEFORE UPDATE ON public.pricing_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_equipment_updated_at
BEFORE UPDATE ON public.equipment
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notification_settings_updated_at
BEFORE UPDATE ON public.notification_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default pricing rules
INSERT INTO public.pricing_rules (shop_owner_id, service_type, price_per_page, color_multiplier, minimum_charge, bulk_discount_threshold, bulk_discount_percentage)
SELECT 
    auth.uid(),
    service_type,
    price_per_page,
    color_multiplier,
    minimum_charge,
    bulk_discount_threshold,
    bulk_discount_percentage
FROM (
    VALUES 
    ('black_white_printing', 0.10, 1.0, 0.50, 100, 10.0),
    ('color_printing', 0.25, 1.0, 1.00, 50, 15.0),
    ('large_format', 2.00, 1.5, 5.00, 10, 20.0),
    ('binding', 1.50, 1.0, 1.50, 20, 10.0),
    ('scanning', 0.50, 1.0, 0.50, 50, 10.0)
) AS defaults(service_type, price_per_page, color_multiplier, minimum_charge, bulk_discount_threshold, bulk_discount_percentage)
WHERE auth.uid() IS NOT NULL;

-- Add realtime support
ALTER TABLE public.shop_info REPLICA IDENTITY FULL;
ALTER TABLE public.pricing_rules REPLICA IDENTITY FULL;
ALTER TABLE public.equipment REPLICA IDENTITY FULL;
ALTER TABLE public.notification_settings REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.shop_info;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pricing_rules;
ALTER PUBLICATION supabase_realtime ADD TABLE public.equipment;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_settings;