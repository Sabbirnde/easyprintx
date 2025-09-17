  import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Info,
  Clock,
  DollarSign,
  Wrench,
  Bell,
  RotateCcw,
  Save,
  RefreshCw,
  Settings,
  ListOrdered,
  PlayCircle,
  Trash2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import ShopHeader from "@/components/ShopHeader";
import { ShopSyncChecker } from "@/components/ShopSyncChecker";

interface ShopInfo {
  shop_name: string;
  phone_number: string;
  email_address: string;
  address: string;
  description: string;
  logo_url: string;
  website_url: string;
}

interface PricingRule {
  service_type: string;
  price_per_page: number;
  color_multiplier: number;
  minimum_charge: number;
  bulk_discount_threshold: number;
  bulk_discount_percentage: number;
}

interface Equipment {
  id?: string;
  shop_owner_id?: string;
  equipment_name: string;
  equipment_type: string;
  brand?: string;
  model?: string;
  status: string;
  last_maintenance?: string;
  next_maintenance_date?: string;
}

interface NotificationSettings {
  email_notifications: boolean;
  sms_notifications: boolean;
  new_order_notifications: boolean;
  order_completion_notifications: boolean;
  low_supplies_notifications: boolean;
  equipment_maintenance_notifications: boolean;
  daily_summary_notifications: boolean;
}

interface PrintQueueSettings {
  auto_accept_orders: boolean;
  priority_queue_enabled: boolean;
  maximum_queue_size: number;
  estimated_time_per_page: number;
}

interface PrintQueueStats {
  jobs_in_queue: number;
  currently_printing: number;
  estimated_wait_time: number;
}

interface OperatingHour {
  day: string;
  open: string;
  close: string;
  isOpen: boolean;
}

interface BusinessHours {
  [key: string]: {
    open: string;
    close: string;
    isOpen: boolean;
  };
}

const ShopSettings = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('print-queue');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [shopInfo, setShopInfo] = useState<ShopInfo>({
    shop_name: '',
    phone_number: '',
    email_address: '',
    address: '',
    description: '',
    logo_url: '',
    website_url: ''
  });

  const [pricingRules, setPricingRules] = useState<PricingRule[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [notifications, setNotifications] = useState<NotificationSettings>({
    email_notifications: true,
    sms_notifications: false,
    new_order_notifications: true,
    order_completion_notifications: true,
    low_supplies_notifications: true,
    equipment_maintenance_notifications: true,
    daily_summary_notifications: false
  });

  const [printQueueSettings, setPrintQueueSettings] = useState<PrintQueueSettings>({
    auto_accept_orders: true,
    priority_queue_enabled: false,
    maximum_queue_size: 50,
    estimated_time_per_page: 30
  });

  const [printQueueStats, setPrintQueueStats] = useState<PrintQueueStats>({
    jobs_in_queue: 0,
    currently_printing: 0,
    estimated_wait_time: 0
  });

  const [operatingHours, setOperatingHours] = useState<OperatingHour[]>([
    { day: 'Monday', open: '09:00', close: '18:00', isOpen: true },
    { day: 'Tuesday', open: '09:00', close: '18:00', isOpen: true },
    { day: 'Wednesday', open: '09:00', close: '18:00', isOpen: true },
    { day: 'Thursday', open: '09:00', close: '18:00', isOpen: true },
    { day: 'Friday', open: '09:00', close: '18:00', isOpen: true },
    { day: 'Saturday', open: '10:00', close: '16:00', isOpen: true },
    { day: 'Sunday', open: '10:00', close: '16:00', isOpen: false }
  ]);

  const fetchData = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Fetch private shop info
      const { data: privateData, error: privateError } = await supabase
        .from('shop_info')
        .select('*')
        .eq('shop_owner_id', user.id)
        .maybeSingle();

      if (privateError && privateError.code !== 'PGRST116') {
        throw privateError;
      }

      // Fetch public shop info
      const { data: publicData, error: publicError } = await supabase
        .from('public_shop_directory')
        .select('*')
        .eq('shop_owner_id', user.id)
        .maybeSingle();

      if (publicError && publicError.code !== 'PGRST116') {
        throw publicError;
      }

      // Merge data from both tables
      if (privateData || publicData) {
        setShopInfo({
          shop_name: publicData?.shop_name || privateData?.shop_name || '',
          phone_number: privateData?.phone_number || '',
          email_address: privateData?.email_address || '',
          address: publicData?.address || privateData?.address || '',
          description: publicData?.description || privateData?.description || '',
          logo_url: publicData?.logo_url || privateData?.logo_url || '',
          website_url: publicData?.website_url || privateData?.website_url || ''
        });
      }

      // Load operating hours from business_hours JSONB field
      if (publicData?.business_hours) {
        const businessHours = publicData.business_hours as BusinessHours;
        const formattedHours: OperatingHour[] = [
          { day: 'Monday', open: businessHours.monday?.open || '09:00', close: businessHours.monday?.close || '18:00', isOpen: businessHours.monday?.isOpen ?? true },
          { day: 'Tuesday', open: businessHours.tuesday?.open || '09:00', close: businessHours.tuesday?.close || '18:00', isOpen: businessHours.tuesday?.isOpen ?? true },
          { day: 'Wednesday', open: businessHours.wednesday?.open || '09:00', close: businessHours.wednesday?.close || '18:00', isOpen: businessHours.wednesday?.isOpen ?? true },
          { day: 'Thursday', open: businessHours.thursday?.open || '09:00', close: businessHours.thursday?.close || '18:00', isOpen: businessHours.thursday?.isOpen ?? true },
          { day: 'Friday', open: businessHours.friday?.open || '09:00', close: businessHours.friday?.close || '18:00', isOpen: businessHours.friday?.isOpen ?? true },
          { day: 'Saturday', open: businessHours.saturday?.open || '10:00', close: businessHours.saturday?.close || '16:00', isOpen: businessHours.saturday?.isOpen ?? true },
          { day: 'Sunday', open: businessHours.sunday?.open || '10:00', close: businessHours.sunday?.close || '16:00', isOpen: businessHours.sunday?.isOpen ?? false }
        ];
        setOperatingHours(formattedHours);
      } else {
        // Fallback: Try to load from operating_hours table (for backwards compatibility)
        try {
          const { data: hoursData, error: hoursError } = await supabase
            .from('operating_hours')
            .select('day_of_week, is_open, open_time, close_time')
            .eq('shop_owner_id', user.id)
            .order('day_of_week');

          if (hoursError) {
            console.warn('Operating hours fetch error:', hoursError);
          } else if (hoursData && hoursData.length > 0) {
            const dayMap = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
            const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
            const formattedHours: OperatingHour[] = dayMap.map((dayKey, index) => {
              const existingHours = hoursData.find(h => h.day_of_week === dayKey);
              return {
                day: dayNames[index],
                open: existingHours?.open_time || (index < 5 ? '09:00' : '10:00'),
                close: existingHours?.close_time || (index < 5 ? '18:00' : '16:00'),
                isOpen: existingHours?.is_open ?? (index !== 6) // Sunday closed by default
              };
            });
            setOperatingHours(formattedHours);
          }
        } catch (fallbackError) {
          console.warn('Fallback operating hours fetch failed:', fallbackError);
        }
      }

      // Fetch pricing rules
      const { data: pricingData, error: pricingError } = await supabase
        .from('pricing_rules')
        .select('*')
        .eq('shop_owner_id', user.id);

      if (pricingError) throw pricingError;
      setPricingRules(pricingData || []);

      // Fetch equipment
      const { data: equipmentData, error: equipmentError } = await supabase
        .from('equipment')
        .select('*')
        .eq('shop_owner_id', user.id);

      if (equipmentError) throw equipmentError;
      setEquipment(equipmentData || []);

      // Fetch notifications settings
      const { data: notificationsData, error: notificationsError } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('shop_owner_id', user.id)
        .maybeSingle();

      if (notificationsError && notificationsError.code !== 'PGRST116') {
        throw notificationsError;
      }

      if (notificationsData) {
        setNotifications(notificationsData);
      }

      // Fetch print queue settings
      const { data: queueSettingsData, error: queueSettingsError } = await (supabase as any)
        .from('print_queue_settings')
        .select('*')
        .eq('shop_owner_id', user.id)
        .maybeSingle();

      if (queueSettingsError && queueSettingsError.code !== 'PGRST116') {
        throw queueSettingsError;
      }

      if (queueSettingsData) {
        setPrintQueueSettings({
          auto_accept_orders: queueSettingsData.auto_accept_orders ?? true,
          priority_queue_enabled: queueSettingsData.priority_queue_enabled ?? false,
          maximum_queue_size: queueSettingsData.maximum_queue_size ?? 50,
          estimated_time_per_page: queueSettingsData.estimated_time_per_page ?? 30
        });
      }

      // Fetch print queue statistics
      const { data: printJobsData, error: printJobsError } = await supabase
        .from('print_jobs')
        .select('status, created_at, pages')
        .eq('shop_owner_id', user.id)
        .in('status', ['queued', 'printing']);

      if (printJobsError) {
        console.warn('Print jobs fetch error:', printJobsError);
      } else if (printJobsData) {
        const jobsList = (printJobsData as any[]) || [];
        const jobsInQueue = jobsList.filter((job: any) => job.status === 'queued').length;
        const currentlyPrinting = jobsList.filter((job: any) => job.status === 'printing').length;
        
        // Calculate estimated wait time based on queued jobs and time per page
        const queuedPages = jobsList
          .filter((job: any) => job.status === 'queued')
          .reduce((total: number, job: any) => total + (job.pages || 1), 0);
          
        const estimatedWaitTime = Math.ceil((queuedPages * (printQueueSettings.estimated_time_per_page || 30)) / 60);
        
        setPrintQueueStats({
          jobs_in_queue: jobsInQueue,
          currently_printing: currentlyPrinting,
          estimated_wait_time: estimatedWaitTime
        });
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const validateShopInfo = () => {
    const errors: string[] = [];
    
    if (!shopInfo.shop_name?.trim()) {
      errors.push('Shop name is required');
    }
    
    if (!shopInfo.address?.trim()) {
      errors.push('Address is required');
    }
    
    if (shopInfo.email_address && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(shopInfo.email_address)) {
      errors.push('Invalid email address format');
    }
    
    // Validate equipment
    for (let i = 0; i < equipment.length; i++) {
      if (!equipment[i].equipment_name?.trim()) {
        errors.push(`Equipment #${i+1} name is required`);
      }
      if (!equipment[i].equipment_type?.trim()) {
        errors.push(`Equipment #${i+1} type is required`);
      }
    }
    
    return errors;
  };

  // Helper: update-if-exists else insert, keyed by shop_owner_id
  const upsertByOwner = async (table: string, payload: any) => {
    const client: any = supabase as any;
    const { data, error } = await client
      .from(table)
      .select('id')
      .eq('shop_owner_id', payload.shop_owner_id)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      return { error } as { error: any };
    }

    if (data) {
      return await client.from(table).update(payload).eq('shop_owner_id', payload.shop_owner_id);
    } else {
      return await client.from(table).insert(payload);
    }
  };

  const saveSettings = async () => {
    if (!user) return;

    // Validate data before saving
    const validationErrors = validateShopInfo();
    if (validationErrors.length > 0) {
      toast.error(`Please fix the following errors: ${validationErrors.join(', ')}`);
      return;
    }

    setSaving(true);
    try {
      console.log('Starting save operation for user:', user.id);
      console.log('Shop info to save:', shopInfo);

      // Save private contact info to shop_info table
      const { error: shopError } = await upsertByOwner('shop_info', {
        shop_owner_id: user.id,
        ...shopInfo
      });

      if (shopError) {
        console.error('Shop info save error:', shopError);
        throw shopError;
      }
      console.log('Shop info saved successfully');

      // IMPORTANT: Save public business info to public_shop_directory table
      // This ensures shops appear in the "Find Shops" page for customers
      
      // Convert operating hours to the JSONB format expected by the database
      const businessHours = {
        monday: { open: operatingHours[0].open, close: operatingHours[0].close, isOpen: operatingHours[0].isOpen },
        tuesday: { open: operatingHours[1].open, close: operatingHours[1].close, isOpen: operatingHours[1].isOpen },
        wednesday: { open: operatingHours[2].open, close: operatingHours[2].close, isOpen: operatingHours[2].isOpen },
        thursday: { open: operatingHours[3].open, close: operatingHours[3].close, isOpen: operatingHours[3].isOpen },
        friday: { open: operatingHours[4].open, close: operatingHours[4].close, isOpen: operatingHours[4].isOpen },
        saturday: { open: operatingHours[5].open, close: operatingHours[5].close, isOpen: operatingHours[5].isOpen },
        sunday: { open: operatingHours[6].open, close: operatingHours[6].close, isOpen: operatingHours[6].isOpen }
      };

      const { error: publicError } = await upsertByOwner('public_shop_directory', {
        shop_owner_id: user.id,
        shop_name: shopInfo.shop_name,
        description: shopInfo.description,
        address: shopInfo.address,
        website_url: shopInfo.website_url,
        logo_url: shopInfo.logo_url,
        business_hours: businessHours,
        is_active: true // Ensure shop is visible to customers
      });

      if (publicError) {
        console.error('Public directory save error:', publicError);
        throw publicError;
      }
      console.log('Public directory saved successfully');

      // IMPORTANT: Also sync operating hours to the operating_hours table 
      // This ensures compatibility with SlotConfig and other components
      try {
        // First, delete existing operating hours records
        const { error: deleteHoursError } = await supabase
          .from('operating_hours')
          .delete()
          .eq('shop_owner_id', user.id);

        if (deleteHoursError) {
          console.warn('Failed to delete existing operating hours:', deleteHoursError);
        }

        // Convert operating hours to the format expected by operating_hours table
        const operatingHoursRecords = operatingHours.map((hour, index) => {
          const dayMap: ('monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday')[] = 
            ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
          return {
            shop_owner_id: user.id,
            day_of_week: dayMap[index],
            is_open: hour.isOpen,
            open_time: hour.open,
            close_time: hour.close
          };
        });

        // Insert new operating hours records
        const { error: insertHoursError } = await supabase
          .from('operating_hours')
          .insert(operatingHoursRecords);

        if (insertHoursError) {
          console.warn('Failed to sync operating hours to operating_hours table:', insertHoursError);
        } else {
          console.log('Operating hours synced to operating_hours table successfully');
        }
      } catch (syncError) {
        console.warn('Operating hours sync error (non-critical):', syncError);
      }

      // Delete existing pricing rules first, then insert new ones
      const { error: deleteRulesError } = await supabase
        .from('pricing_rules')
        .delete()
        .eq('shop_owner_id', user.id);

      if (deleteRulesError) {
        console.error('Error deleting existing pricing rules:', deleteRulesError);
        throw deleteRulesError;
      }

      // Save new pricing rules
      if (pricingRules.length > 0) {
        const rulesWithOwner = pricingRules.map(rule => ({
          shop_owner_id: user.id,
          ...rule
        }));

        const { error: rulesError } = await supabase
          .from('pricing_rules')
          .insert(rulesWithOwner);

        if (rulesError) {
          console.error('Pricing rules save error:', rulesError);
          throw rulesError;
        }
      }
      console.log('Pricing rules saved successfully');

      // Save notification settings
      const { error: notificationError } = await upsertByOwner('notification_settings', {
        shop_owner_id: user.id,
        ...notifications
      });

      if (notificationError) {
        console.error('Notification settings save error:', notificationError);
        throw notificationError;
      }
      console.log('Notification settings saved successfully');

      // Save print queue settings
      const { error: queueSettingsError } = await upsertByOwner('print_queue_settings', {
        shop_owner_id: user.id,
        auto_accept_orders: printQueueSettings.auto_accept_orders,
        priority_queue_enabled: printQueueSettings.priority_queue_enabled,
        maximum_queue_size: printQueueSettings.maximum_queue_size,
        estimated_time_per_page: printQueueSettings.estimated_time_per_page
      });

      if (queueSettingsError) {
        console.error('Print queue settings save error:', queueSettingsError);
        throw queueSettingsError;
      }
      console.log('Print queue settings saved successfully');

      // Save equipment data
      if (equipment.length > 0) {
        try {
          // First, delete existing equipment records
          const { error: deleteEquipmentError } = await supabase
            .from('equipment')
            .delete()
            .eq('shop_owner_id', user.id);

          if (deleteEquipmentError) {
            console.warn('Failed to delete existing equipment:', deleteEquipmentError);
            throw deleteEquipmentError;
          }

          // Insert new equipment records
          const equipmentWithOwner = equipment.map(item => ({
            shop_owner_id: user.id,
            ...item
          }));

          const { error: equipmentError } = await supabase
            .from('equipment')
            .insert(equipmentWithOwner);

          if (equipmentError) {
            console.error('Equipment save error:', equipmentError);
            throw equipmentError;
          }
          console.log('Equipment saved successfully');
        } catch (equipmentSaveError) {
          console.error('Error saving equipment:', equipmentSaveError);
          throw equipmentSaveError;
        }
      }

      console.log('All settings saved successfully');
      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      // Improve error handling to provide more specific error messages
      let errorMessage = 'Unknown error occurred';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'object' && error !== null) {
        // Handle Supabase error objects
        errorMessage = (error as any).message || (error as any).details || JSON.stringify(error);
      }
      
      toast.error(`Failed to save settings: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaults = () => {
    setShopInfo({
      shop_name: '',
      phone_number: '',
      email_address: '',
      address: '',
      description: '',
      logo_url: '',
      website_url: ''
    });
    
    // Reset operating hours to default
    setOperatingHours([
      { day: 'Monday', open: '09:00', close: '18:00', isOpen: true },
      { day: 'Tuesday', open: '09:00', close: '18:00', isOpen: true },
      { day: 'Wednesday', open: '09:00', close: '18:00', isOpen: true },
      { day: 'Thursday', open: '09:00', close: '18:00', isOpen: true },
      { day: 'Friday', open: '09:00', close: '18:00', isOpen: true },
      { day: 'Saturday', open: '10:00', close: '16:00', isOpen: true },
      { day: 'Sunday', open: '10:00', close: '16:00', isOpen: false }
    ]);
    
    toast.info('Settings reset to defaults');
  };

  const updateOperatingHours = (dayIndex: number, field: keyof OperatingHour, value: string | boolean) => {
    setOperatingHours(prev => prev.map((hour, index) => 
      index === dayIndex ? { ...hour, [field]: value } : hour
    ));
  };

  const addDefaultPricingRules = () => {
    const defaultRules: PricingRule[] = [
      {
        service_type: 'black_white',
        price_per_page: 2.0,
        color_multiplier: 1.0,
        minimum_charge: 2.0,
        bulk_discount_threshold: 100,
        bulk_discount_percentage: 10.0
      },
      {
        service_type: 'color',
        price_per_page: 5.0,
        color_multiplier: 2.0,
        minimum_charge: 5.0,
        bulk_discount_threshold: 50,
        bulk_discount_percentage: 15.0
      }
    ];
    setPricingRules(defaultRules);
    toast.success('Default pricing rules added');
  };

  const addNewPricingRule = () => {
    const newRule: PricingRule = {
      service_type: 'custom',
      price_per_page: 3.0,
      color_multiplier: 1.5,
      minimum_charge: 3.0,
      bulk_discount_threshold: 75,
      bulk_discount_percentage: 12.0
    };
    setPricingRules(prev => [...prev, newRule]);
  };

  const updatePricingRule = (index: number, field: keyof PricingRule, value: number | string) => {
    setPricingRules(prev => prev.map((rule, i) => 
      i === index ? { ...rule, [field]: value } : rule
    ));
  };

  const removePricingRule = (index: number) => {
    setPricingRules(prev => prev.filter((_, i) => i !== index));
    toast.success('Pricing rule removed');
  };

  // Equipment management functions
  const addEquipment = () => {
    const newEquipment: Equipment = {
      equipment_name: 'New Printer',
      equipment_type: 'printer',
      status: 'active',
      next_maintenance_date: new Date().toISOString().split('T')[0]
    };
    setEquipment(prev => [...prev, newEquipment]);
    toast.success('New equipment added');
  };

  const updateEquipment = (index: number, field: keyof Equipment, value: string) => {
    setEquipment(prev => prev.map((item, i) => 
      i === index ? { ...item, [field]: value } : item
    ));
  };

  const removeEquipment = (index: number) => {
    setEquipment(prev => prev.filter((_, i) => i !== index));
    toast.success('Equipment removed');
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <ShopHeader currentPage="Settings" />

      <main className="container mx-auto px-6 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Shop Settings
          </h1>
          <p className="text-muted-foreground">
            Configure your shop information, pricing, and preferences
          </p>
        </div>

        {/* Settings Tabs */}
        <Card>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <CardHeader className="pb-4">
              <TabsList className="grid w-full grid-cols-7">
                <TabsTrigger value="print-queue" className="flex items-center space-x-2">
                  <ListOrdered className="w-4 h-4" />
                  <span>Print Queue</span>
                </TabsTrigger>
                <TabsTrigger value="shop-info" className="flex items-center space-x-2">
                  <Info className="w-4 h-4" />
                  <span>Shop Info</span>
                </TabsTrigger>
                <TabsTrigger value="operating-hours" className="flex items-center space-x-2">
                  <Clock className="w-4 h-4" />
                  <span>Hours</span>
                </TabsTrigger>
                <TabsTrigger value="pricing" className="flex items-center space-x-2">
                  <DollarSign className="w-4 h-4" />
                  <span>Pricing</span>
                </TabsTrigger>
                <TabsTrigger value="equipment" className="flex items-center space-x-2">
                  <Wrench className="w-4 h-4" />
                  <span>Equipment</span>
                </TabsTrigger>
                <TabsTrigger value="equipment-management" className="flex items-center space-x-2">
                  <Settings className="w-4 h-4" />
                  <span>Equipment Mgmt</span>
                </TabsTrigger>
                <TabsTrigger value="notifications" className="flex items-center space-x-2">
                  <Bell className="w-4 h-4" />
                  <span>Notifications</span>
                </TabsTrigger>
              </TabsList>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Shop Information Tab */}
              <TabsContent value="shop-info" className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Shop Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="shop-name">Shop Name</Label>
                      <Input
                        id="shop-name"
                        value={shopInfo.shop_name}
                        onChange={(e) => setShopInfo(prev => ({ ...prev, shop_name: e.target.value }))}
                        placeholder="Enter shop name"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        value={shopInfo.phone_number}
                        onChange={(e) => setShopInfo(prev => ({ ...prev, phone_number: e.target.value }))}
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address</Label>
                      <Input
                        id="email"
                        type="email"
                        value={shopInfo.email_address}
                        onChange={(e) => setShopInfo(prev => ({ ...prev, email_address: e.target.value }))}
                        placeholder="info@yourshop.com"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="address">Address</Label>
                      <Input
                        id="address"
                        value={shopInfo.address}
                        onChange={(e) => setShopInfo(prev => ({ ...prev, address: e.target.value }))}
                        placeholder="123 Main St, City, State 12345"
                      />
                    </div>
                  </div>

                  <div className="mt-6 space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={shopInfo.description}
                      onChange={(e) => setShopInfo(prev => ({ ...prev, description: e.target.value }))}
                      placeholder="Professional printing services with same-day turnaround and high-quality results."
                      rows={4}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Operating Hours Tab */}
              <TabsContent value="operating-hours" className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Operating Hours</h3>
                  
                  <div className="space-y-4">
                    {operatingHours.map((day, index) => (
                      <div key={day.day} className="flex items-center justify-between py-3 border-b">
                        <div className="flex items-center space-x-4">
                          <Checkbox 
                            checked={day.isOpen} 
                            onCheckedChange={(checked) => updateOperatingHours(index, 'isOpen', checked as boolean)}
                          />
                          <span className="font-medium w-20">{day.day}</span>
                        </div>
                        
                        {day.isOpen ? (
                          <div className="flex items-center space-x-2">
                            <Input 
                              type="time" 
                              value={day.open} 
                              className="w-32" 
                              onChange={(e) => updateOperatingHours(index, 'open', e.target.value)}
                            />
                            <span>to</span>
                            <Input 
                              type="time" 
                              value={day.close} 
                              className="w-32"
                              onChange={(e) => updateOperatingHours(index, 'close', e.target.value)}
                            />
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Closed</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              {/* Pricing Tab */}
              <TabsContent value="pricing" className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Pricing Rules</h3>
                  
                  <div className="space-y-4">
                    {pricingRules.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground mb-4">No pricing rules configured yet</p>
                        <Button onClick={addDefaultPricingRules}>
                          Add Default Pricing Rules
                        </Button>
                      </div>
                    ) : (
                      pricingRules.map((rule, index) => (
                        <Card key={index}>
                          <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-base capitalize">{rule.service_type} Printing</CardTitle>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => removePricingRule(index)}
                            >
                              Remove
                            </Button>
                          </CardHeader>
                           <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
                             <div className="space-y-2">
                               <Label>Price per page (৳)</Label>
                               <Input 
                                 type="number"
                                 step="0.1"
                                 min="0"
                                 value={rule.price_per_page}
                                 onChange={(e) => updatePricingRule(index, 'price_per_page', parseFloat(e.target.value) || 0)}
                               />
                             </div>
                             <div className="space-y-2">
                               <Label>Minimum charge (৳)</Label>
                               <Input 
                                 type="number"
                                 step="0.1"
                                 min="0"
                                 value={rule.minimum_charge}
                                 onChange={(e) => updatePricingRule(index, 'minimum_charge', parseFloat(e.target.value) || 0)}
                               />
                             </div>
                             <div className="space-y-2">
                               <Label>Bulk threshold (pages)</Label>
                               <Input 
                                 type="number"
                                 min="1"
                                 value={rule.bulk_discount_threshold}
                                 onChange={(e) => updatePricingRule(index, 'bulk_discount_threshold', parseInt(e.target.value) || 1)}
                               />
                             </div>
                             <div className="space-y-2">
                               <Label>Bulk discount (%)</Label>
                               <Input 
                                 type="number"
                                 step="0.1"
                                 min="0"
                                 max="100"
                                 value={rule.bulk_discount_percentage}
                                 onChange={(e) => updatePricingRule(index, 'bulk_discount_percentage', parseFloat(e.target.value) || 0)}
                               />
                             </div>
                             {rule.service_type === 'color' && (
                               <div className="space-y-2 col-span-2 md:col-span-1">
                                 <Label>Color multiplier</Label>
                                 <Input 
                                   type="number"
                                   step="0.1"
                                   min="1"
                                   value={rule.color_multiplier}
                                   onChange={(e) => updatePricingRule(index, 'color_multiplier', parseFloat(e.target.value) || 1)}
                                 />
                               </div>
                             )}
                             
                             <div className="col-span-full">
                               <div className="bg-muted/50 rounded-lg p-3">
                                 <h4 className="font-medium text-sm mb-2">Pricing Preview</h4>
                                 <div className="grid grid-cols-2 gap-4 text-sm">
                                   <div>
                                     <span className="text-muted-foreground">1 page:</span>
                                     <span className="ml-2 font-medium">৳{rule.price_per_page.toFixed(2)}</span>
                                   </div>
                                   <div>
                                     <span className="text-muted-foreground">10 pages:</span>
                                     <span className="ml-2 font-medium">৳{Math.max(rule.price_per_page * 10, rule.minimum_charge).toFixed(2)}</span>
                                   </div>
                                   <div>
                                     <span className="text-muted-foreground">Bulk ({rule.bulk_discount_threshold}+ pages):</span>
                                     <span className="ml-2 font-medium">৳{(rule.price_per_page * (1 - rule.bulk_discount_percentage/100)).toFixed(2)}/page</span>
                                   </div>
                                   <div>
                                     <span className="text-muted-foreground">Minimum charge:</span>
                                     <span className="ml-2 font-medium">৳{rule.minimum_charge.toFixed(2)}</span>
                                   </div>
                                 </div>
                               </div>
                             </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                    
                    {pricingRules.length > 0 && (
                      <Button variant="outline" onClick={addNewPricingRule}>
                        Add New Service Type
                      </Button>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Equipment Tab */}
              <TabsContent value="equipment" className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Equipment Management</h3>
                  
                  <div className="space-y-4">
                    {equipment.length === 0 ? (
                      <Card>
                        <CardContent className="pt-6 text-center">
                          <div className="text-muted-foreground py-6">
                            No equipment added yet. Add equipment using the button below.
                          </div>
                          <Button onClick={addEquipment}>
                            <PlayCircle className="h-4 w-4 mr-2" />
                            Add Equipment
                          </Button>
                        </CardContent>
                      </Card>
                    ) : (
                      <>
                        {equipment.map((item, index) => (
                          <Card key={index}>
                            <CardContent className="pt-6">
                              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div>
                                  <Label>Equipment Name</Label>
                                  <Input 
                                    value={item.equipment_name} 
                                    onChange={(e) => updateEquipment(index, 'equipment_name', e.target.value)}
                                  />
                                </div>
                                <div>
                                  <Label>Type</Label>
                                  <Select 
                                    value={item.equipment_type}
                                    onValueChange={(value) => updateEquipment(index, 'equipment_type', value)}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="printer">Printer</SelectItem>
                                      <SelectItem value="scanner">Scanner</SelectItem>
                                      <SelectItem value="binding">Binding Machine</SelectItem>
                                      <SelectItem value="laminator">Laminator</SelectItem>
                                      <SelectItem value="other">Other</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label>Status</Label>
                                  <Select 
                                    value={item.status || 'active'}
                                    onValueChange={(value) => updateEquipment(index, 'status', value)}
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="active">Active</SelectItem>
                                      <SelectItem value="maintenance">Maintenance</SelectItem>
                                      <SelectItem value="inactive">Inactive</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div>
                                  <Label>Next Maintenance</Label>
                                  <Input 
                                    type="date" 
                                    value={item.next_maintenance_date || ''}
                                    onChange={(e) => updateEquipment(index, 'next_maintenance_date', e.target.value)}
                                  />
                                </div>
                              </div>
                              <div className="mt-4 flex justify-end">
                                <Button 
                                  variant="destructive" 
                                  size="sm" 
                                  onClick={() => removeEquipment(index)}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Remove
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                        <div className="flex justify-center">
                          <Button onClick={addEquipment}>
                            <PlayCircle className="h-4 w-4 mr-2" />
                            Add More Equipment
                          </Button>
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Notifications Tab */}
              <TabsContent value="notifications" className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Notification Preferences</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Email Notifications</h4>
                        <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                      </div>
                      <Checkbox 
                        checked={notifications.email_notifications}
                        onCheckedChange={(checked) => 
                          setNotifications(prev => ({ ...prev, email_notifications: checked as boolean }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">New Order Notifications</h4>
                        <p className="text-sm text-muted-foreground">Get notified when new orders arrive</p>
                      </div>
                      <Checkbox 
                        checked={notifications.new_order_notifications}
                        onCheckedChange={(checked) => 
                          setNotifications(prev => ({ ...prev, new_order_notifications: checked as boolean }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Order Completion Notifications</h4>
                        <p className="text-sm text-muted-foreground">Get notified when orders are completed</p>
                      </div>
                      <Checkbox 
                        checked={notifications.order_completion_notifications}
                        onCheckedChange={(checked) => 
                          setNotifications(prev => ({ ...prev, order_completion_notifications: checked as boolean }))
                        }
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Equipment Maintenance Alerts</h4>
                        <p className="text-sm text-muted-foreground">Get reminded about equipment maintenance</p>
                      </div>
                      <Checkbox 
                        checked={notifications.equipment_maintenance_notifications}
                        onCheckedChange={(checked) => 
                          setNotifications(prev => ({ ...prev, equipment_maintenance_notifications: checked as boolean }))
                        }
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Print Queue Management Tab */}
              <TabsContent value="print-queue" className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Print Queue Management</h3>
                  
                  <div className="space-y-6">
                    {/* Queue Status Overview */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <ListOrdered className="h-5 w-5" />
                          Current Queue Status
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="text-center p-4 bg-blue-50 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">{printQueueStats.jobs_in_queue}</div>
                            <div className="text-sm text-muted-foreground">Jobs in Queue</div>
                          </div>
                          <div className="text-center p-4 bg-green-50 rounded-lg">
                            <div className="text-2xl font-bold text-green-600">{printQueueStats.currently_printing}</div>
                            <div className="text-sm text-muted-foreground">Currently Printing</div>
                          </div>
                          <div className="text-center p-4 bg-orange-50 rounded-lg">
                            <div className="text-2xl font-bold text-orange-600">
                              {printQueueStats.estimated_wait_time > 0 
                                ? `${printQueueStats.estimated_wait_time} min` 
                                : 'No wait'}
                            </div>
                            <div className="text-sm text-muted-foreground">Est. Wait Time</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Queue Settings */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Queue Settings</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">Auto-accept Orders</h4>
                            <p className="text-sm text-muted-foreground">Automatically accept new print orders</p>
                          </div>
                          <Checkbox 
                            checked={printQueueSettings.auto_accept_orders}
                            onCheckedChange={(checked) => 
                              setPrintQueueSettings(prev => ({ ...prev, auto_accept_orders: checked as boolean }))
                            }
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">Priority Queue</h4>
                            <p className="text-sm text-muted-foreground">Enable priority ordering for urgent jobs</p>
                          </div>
                          <Checkbox 
                            checked={printQueueSettings.priority_queue_enabled}
                            onCheckedChange={(checked) => 
                              setPrintQueueSettings(prev => ({ ...prev, priority_queue_enabled: checked as boolean }))
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium">Maximum Queue Size</label>
                          <Input 
                            type="number" 
                            value={printQueueSettings.maximum_queue_size}
                            onChange={(e) => 
                              setPrintQueueSettings(prev => ({ 
                                ...prev, 
                                maximum_queue_size: parseInt(e.target.value) || 50 
                              }))
                            }
                            className="w-24" 
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-sm font-medium">Estimated Time per Page (seconds)</label>
                          <Input 
                            type="number" 
                            value={printQueueSettings.estimated_time_per_page}
                            onChange={(e) => 
                              setPrintQueueSettings(prev => ({ 
                                ...prev, 
                                estimated_time_per_page: parseInt(e.target.value) || 30 
                              }))
                            }
                            className="w-24" 
                          />
                        </div>
                      </CardContent>
                    </Card>

                    {/* Active Jobs */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Active Print Jobs</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {printQueueStats.jobs_in_queue === 0 && printQueueStats.currently_printing === 0 ? (
                          <div className="text-center p-6 text-muted-foreground">
                            No active print jobs at the moment.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {/* This would typically be populated with real data from the database */}
                            {printQueueStats.currently_printing > 0 && (
                              <div className="flex items-center justify-between p-3 border rounded-lg">
                                <div className="flex items-center gap-3">
                                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                  <div>
                                    <div className="font-medium">Active Print Job</div>
                                    <div className="text-sm text-muted-foreground">Currently processing</div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-medium">Printing</div>
                                  <div className="text-xs text-muted-foreground">In progress</div>
                                </div>
                              </div>
                            )}
                            
                            {printQueueStats.jobs_in_queue > 0 && (
                              <div className="flex items-center justify-between p-3 border rounded-lg">
                                <div className="flex items-center gap-3">
                                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                  <div>
                                    <div className="font-medium">Queued Job{printQueueStats.jobs_in_queue > 1 ? 's' : ''}</div>
                                    <div className="text-sm text-muted-foreground">{printQueueStats.jobs_in_queue} job{printQueueStats.jobs_in_queue > 1 ? 's' : ''} waiting</div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-medium">Queued</div>
                                  <div className="text-xs text-muted-foreground">
                                    {printQueueStats.estimated_wait_time > 0 
                                      ? `Est. wait: ${printQueueStats.estimated_wait_time} min` 
                                      : 'Processing soon'}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              {/* Equipment Management Tab */}
              <TabsContent value="equipment-management" className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Equipment Management</h3>
                  
                  <div className="space-y-6">
                    {/* Equipment Overview */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Settings className="h-5 w-5" />
                          Equipment Overview
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          <div className="text-center p-4 bg-green-50 rounded-lg">
                            <div className="text-2xl font-bold text-green-600">
                              {equipment.filter(e => e.status === 'active').length}
                            </div>
                            <div className="text-sm text-muted-foreground">Online Printers</div>
                          </div>
                          <div className="text-center p-4 bg-red-50 rounded-lg">
                            <div className="text-2xl font-bold text-red-600">
                              {equipment.filter(e => e.status === 'inactive').length}
                            </div>
                            <div className="text-sm text-muted-foreground">Offline Printers</div>
                          </div>
                          <div className="text-center p-4 bg-yellow-50 rounded-lg">
                            <div className="text-2xl font-bold text-yellow-600">
                              {equipment.filter(e => e.status === 'maintenance').length}
                            </div>
                            <div className="text-sm text-muted-foreground">Need Maintenance</div>
                          </div>
                          <div className="text-center p-4 bg-blue-50 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">
                              {equipment.length > 0 ? 
                                Math.round((equipment.filter(e => e.status === 'active').length / equipment.length) * 100) + '%' : 
                                '0%'}
                            </div>
                            <div className="text-sm text-muted-foreground">Uptime</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Equipment List */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Equipment List</CardTitle>
                        <Button size="sm" className="ml-auto" onClick={addEquipment}>
                          <PlayCircle className="h-4 w-4 mr-2" />
                          Add Equipment
                        </Button>
                      </CardHeader>
                      <CardContent>
                        {equipment.length === 0 ? (
                          <div className="text-center p-6 text-muted-foreground">
                            No equipment added yet. Add equipment using the button above.
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {equipment.map((item, index) => (
                              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="flex items-center gap-4">
                                  <div className={`w-3 h-3 rounded-full ${
                                    item.status === 'active' ? 'bg-green-500' : 
                                    item.status === 'maintenance' ? 'bg-yellow-500' : 'bg-red-500'
                                  }`}></div>
                                  <div>
                                    <div className="font-medium">{item.equipment_name}</div>
                                    <div className="text-sm text-muted-foreground">
                                      {item.equipment_type.charAt(0).toUpperCase() + item.equipment_type.slice(1)}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className={`text-sm px-2 py-1 rounded ${
                                    item.status === 'active' ? 'bg-green-100 text-green-800' : 
                                    item.status === 'maintenance' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                                  }`}>
                                    {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                                  </span>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => {
                                      setActiveTab('equipment');
                                    }}
                                  >
                                    <Settings className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Equipment Settings */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Global Equipment Settings</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">Auto Equipment Discovery</h4>
                            <p className="text-sm text-muted-foreground">Automatically detect new printers on network</p>
                          </div>
                          <Checkbox 
                            checked={notifications.equipment_maintenance_notifications}
                            onCheckedChange={(checked) => 
                              setNotifications(prev => ({ ...prev, equipment_maintenance_notifications: checked as boolean }))
                            }
                          />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">Maintenance Reminders</h4>
                            <p className="text-sm text-muted-foreground">Send notifications for scheduled maintenance</p>
                          </div>
                          <Checkbox 
                            checked={notifications.equipment_maintenance_notifications}
                            onCheckedChange={(checked) => 
                              setNotifications(prev => ({ ...prev, equipment_maintenance_notifications: checked as boolean }))
                            }
                          />
                        </div>

                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium">Energy Saving Mode</h4>
                            <p className="text-sm text-muted-foreground">Automatically power down idle equipment</p>
                          </div>
                          <Checkbox 
                            checked={notifications.email_notifications}
                            onCheckedChange={(checked) => 
                              setNotifications(prev => ({ ...prev, email_notifications: checked as boolean }))
                            }
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              {/* Action Buttons */}
              <div className="flex items-center justify-between pt-6 border-t">
                <Button variant="outline" onClick={resetToDefaults}>
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Reset to Defaults
                </Button>
                
                <Button onClick={saveSettings} disabled={saving}>
                  {saving ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Save Settings
                </Button>
              </div>
            </CardContent>
          </Tabs>
        </Card>

        {/* Shop Sync Status Checker */}
        <ShopSyncChecker />

      </main>
    </div>
  );
};

export default ShopSettings;