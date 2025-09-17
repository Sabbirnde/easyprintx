import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { 
  Printer, 
  Settings, 
  Clock,
  Calendar,
  Save,
  RefreshCw
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import ShopHeader from "@/components/ShopHeader";

type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

interface ShopSettings {
  slot_duration_minutes: number;
  max_jobs_per_slot: number;
  advance_booking_days: number;
  auto_accept_bookings: boolean;
}

interface OperatingHours {
  day_of_week: DayOfWeek;
  is_open: boolean;
  open_time: string;
  close_time: string;
}

interface TimeSlot {
  id: string;
  slot_time: string;
  current_bookings: number;
  max_capacity: number;
  is_available: boolean;
}

const SlotConfig = () => {
  const { user, loading: authLoading } = useAuth();
  const [settings, setSettings] = useState<ShopSettings>({
    slot_duration_minutes: 10,
    max_jobs_per_slot: 5,
    advance_booking_days: 7,
    auto_accept_bookings: true
  });
  
  const [operatingHours, setOperatingHours] = useState<OperatingHours[]>([]);
  const [timeSlots, setTimeSlots] = useState<{ [key: string]: TimeSlot[] }>({});
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const daysOfWeek: { key: DayOfWeek; label: string }[] = [
    { key: 'monday', label: 'Monday' },
    { key: 'tuesday', label: 'Tuesday' },
    { key: 'wednesday', label: 'Wednesday' },
    { key: 'thursday', label: 'Thursday' },
    { key: 'friday', label: 'Friday' },
    { key: 'saturday', label: 'Saturday' },
    { key: 'sunday', label: 'Sunday' }
  ];

  const fetchData = async () => {
    if (!user?.id) {
      console.log('No user ID available');
      return;
    }
    
    setLoading(true);
    console.log('=== FORCE FETCH DATA STARTED ===');
    
    try {
      // FORCE: Fetch shop settings with fallback defaults
      let settingsToUse = {
        slot_duration_minutes: 10,
        max_jobs_per_slot: 5,
        advance_booking_days: 7,
        auto_accept_bookings: true
      };

      try {
        const { data: settingsData, error: settingsError } = await supabase
          .from('shop_settings')
          .select('slot_duration_minutes, max_jobs_per_slot, advance_booking_days, auto_accept_bookings')
          .eq('shop_owner_id', user.id)
          .maybeSingle();

        if (settingsError) {
          console.warn('Settings fetch error (using defaults):', settingsError);
        } else if (settingsData) {
          settingsToUse = {
            slot_duration_minutes: settingsData.slot_duration_minutes || 10,
            max_jobs_per_slot: settingsData.max_jobs_per_slot || 5,
            advance_booking_days: settingsData.advance_booking_days || 7,
            auto_accept_bookings: settingsData.auto_accept_bookings ?? true
          };
        }
      } catch (settingsError) {
        console.warn('Settings fetch failed, using defaults:', settingsError);
      }

      setSettings(settingsToUse);
      console.log('Settings loaded:', settingsToUse);

      // FORCE: Fetch operating hours with mandatory defaults
      let hoursToUse = daysOfWeek.map(day => ({
        day_of_week: day.key,
        is_open: day.key !== 'saturday' && day.key !== 'sunday',
        open_time: '09:00',
        close_time: '18:00'
      }));

      try {
        const { data: hoursData, error: hoursError } = await supabase
          .from('operating_hours')
          .select('day_of_week, is_open, open_time, close_time')
          .eq('shop_owner_id', user.id)
          .order('day_of_week');

        if (hoursError) {
          console.warn('Operating hours fetch error (using defaults):', hoursError);
        } else if (hoursData && hoursData.length > 0) {
          // Merge fetched data with defaults to ensure all days are present
          hoursToUse = daysOfWeek.map(day => {
            const existingHours = hoursData.find(h => h.day_of_week === day.key);
            return existingHours || {
              day_of_week: day.key,
              is_open: day.key !== 'saturday' && day.key !== 'sunday',
              open_time: '09:00',
              close_time: '18:00'
            };
          });
        }
      } catch (hoursError) {
        console.warn('Operating hours fetch failed, using defaults:', hoursError);
      }

      setOperatingHours(hoursToUse);
      console.log('Operating hours loaded:', hoursToUse);

      // FORCE: Always try to fetch time slots (non-blocking)
      try {
        await fetchTimeSlots(selectedDate);
      } catch (slotsError) {
        console.warn('Time slots fetch failed:', slotsError);
      }

      console.log('=== FORCE FETCH DATA COMPLETED ===');
    } catch (error) {
      console.error('=== FORCE FETCH DATA FAILED ===');
      console.error('Critical fetch error:', error);
      toast.error('Failed to load some configuration data. Using defaults.');
    } finally {
      setLoading(false);
    }
  };

  const fetchTimeSlots = async (date: string) => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('time_slots')
        .select('id, slot_time, slot_date, current_bookings, max_capacity, is_available')
        .eq('shop_owner_id', user.id)
        .eq('slot_date', date)
        .order('slot_time');

      if (error) {
        console.warn('Time slots fetch error (non-critical):', error);
        // Don't throw - just set empty slots
        setTimeSlots(prev => ({ ...prev, [date]: [] }));
        return;
      }

      setTimeSlots(prev => ({
        ...prev,
        [date]: data || []
      }));
    } catch (error) {
      console.warn('Time slots fetch failed (non-critical):', error);
      setTimeSlots(prev => ({ ...prev, [date]: [] }));
    }
  };

  const saveSettings = async () => {
    if (!user?.id) {
      toast.error('User not authenticated');
      return;
    }

    setSaving(true);
    console.log('=== FORCE SAVE OPERATION STARTED ===');
    console.log('User ID:', user.id);
    console.log('Settings to save:', settings);
    console.log('Operating hours to save:', operatingHours);
    
    try {
      // FORCE: First ensure user session is valid
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error('Invalid session - please log in again');
      }

      // FORCE: Validate and convert data types
      const duration = Math.max(5, Math.min(120, Number(settings.slot_duration_minutes) || 10));
      const maxJobs = Math.max(1, Math.min(50, Number(settings.max_jobs_per_slot) || 5));
      const advanceDays = Math.max(1, Math.min(365, Number(settings.advance_booking_days) || 7));

      console.log('Validated values:', { duration, maxJobs, advanceDays });

      // FORCE: Prepare minimal settings payload
      const settingsPayload = {
        shop_owner_id: user.id,
        slot_duration_minutes: duration,
        max_jobs_per_slot: maxJobs,
        advance_booking_days: advanceDays,
        auto_accept_bookings: Boolean(settings.auto_accept_bookings)
      };

      console.log('Final settings payload:', settingsPayload);

      // FORCE: Try direct insert first, then upsert if conflict
      let settingsResult;
      try {
        const { data, error } = await supabase
          .from('shop_settings')
          .insert(settingsPayload)
          .select();
        
        if (error && error.code === '23505') {
          // Conflict - do update instead
          console.log('Conflict detected, trying update...');
          const { data: updateData, error: updateError } = await supabase
            .from('shop_settings')
            .update({
              slot_duration_minutes: duration,
              max_jobs_per_slot: maxJobs,
              advance_booking_days: advanceDays,
              auto_accept_bookings: Boolean(settings.auto_accept_bookings)
            })
            .eq('shop_owner_id', user.id)
            .select();
          
          if (updateError) throw updateError;
          settingsResult = updateData;
        } else if (error) {
          throw error;
        } else {
          settingsResult = data;
        }
      } catch (insertError) {
        console.log('Insert failed, trying upsert fallback:', insertError);
        const { data, error } = await supabase
          .from('shop_settings')
          .upsert(settingsPayload)
          .select();
        
        if (error) throw error;
        settingsResult = data;
      }

      console.log('Settings saved successfully:', settingsResult);

      // FORCE: Handle operating hours with fallback
      const hoursToSave = operatingHours.length > 0 ? operatingHours : daysOfWeek.map(day => ({
        day_of_week: day.key,
        is_open: day.key !== 'saturday' && day.key !== 'sunday',
        open_time: '09:00',
        close_time: '18:00'
      }));

      console.log('Operating hours to save:', hoursToSave);

      // FORCE: Save operating hours with individual error handling
      const savedHours = [];
      const hourErrors = [];

      for (const hours of hoursToSave) {
        try {
          const hoursPayload = {
            shop_owner_id: user.id,
            day_of_week: hours.day_of_week,
            is_open: Boolean(hours.is_open),
            open_time: (hours.is_open && hours.open_time) ? hours.open_time : '09:00',
            close_time: (hours.is_open && hours.close_time) ? hours.close_time : '17:00'
          };

          // Try insert first, then update if conflict
          try {
            const { data, error } = await supabase
              .from('operating_hours')
              .insert(hoursPayload)
              .select();
            
            if (error && error.code === '23505') {
              // Conflict - do update
              const { data: updateData, error: updateError } = await supabase
                .from('operating_hours')
                .update({
                  is_open: hoursPayload.is_open,
                  open_time: hoursPayload.open_time,
                  close_time: hoursPayload.close_time
                })
                .eq('shop_owner_id', user.id)
                .eq('day_of_week', hours.day_of_week)
                .select();
              
              if (updateError) throw updateError;
              savedHours.push(updateData);
            } else if (error) {
              throw error;
            } else {
              savedHours.push(data);
            }
          } catch (insertError) {
            // Fallback to upsert
            const { data, error } = await supabase
              .from('operating_hours')
              .upsert(hoursPayload)
              .select();
            
            if (error) throw error;
            savedHours.push(data);
          }

          console.log(`Saved hours for ${hours.day_of_week}`);
        } catch (hourError) {
          console.error(`Failed to save hours for ${hours.day_of_week}:`, hourError);
          hourErrors.push(`${hours.day_of_week}: ${hourError.message}`);
        }
      }

      if (hourErrors.length > 0) {
        console.warn('Some operating hours failed to save:', hourErrors);
        toast.error(`Settings saved but some operating hours failed: ${hourErrors.join(', ')}`);
      }

      // FORCE: Update local state with saved data
      if (hoursToSave !== operatingHours) {
        setOperatingHours(hoursToSave);
      }

      // Success notification
      toast.success('Configuration saved successfully!');
      console.log('=== FORCE SAVE OPERATION COMPLETED ===');
      
    } catch (error) {
      console.error('=== FORCE SAVE OPERATION FAILED ===');
      console.error('Error details:', error);
      
      // FORCE: Extract meaningful error message
      let errorMessage = 'Failed to save configuration';
      
      if (error && typeof error === 'object') {
        if ('message' in error) {
          errorMessage = error.message;
        } else if ('error_description' in error) {
          errorMessage = error.error_description;
        } else if ('details' in error) {
          errorMessage = error.details;
        }
      }
      
      console.error('Final error message:', errorMessage);
      toast.error(`Save failed: ${errorMessage}`);
      
      // FORCE: Attempt to refresh user session if auth error
      if (errorMessage.includes('auth') || errorMessage.includes('session')) {
        console.log('Attempting session refresh...');
        try {
          await supabase.auth.refreshSession();
          toast.error('Session refreshed. Please try saving again.');
        } catch (refreshError) {
          console.error('Session refresh failed:', refreshError);
          toast.error('Please log out and log back in, then try again.');
        }
      }
    } finally {
      setSaving(false);
    }
  };

  // FORCE: Simplified database access test
  const testDatabaseAccess = async () => {
    if (!user?.id) {
      toast.error('No user available for testing');
      return;
    }

    console.log('=== FORCE DATABASE TEST STARTED ===');
    
    try {
      // Test 1: Basic connection
      const { error: pingError } = await supabase
        .from('shop_settings')
        .select('count', { count: 'exact', head: true });
      
      if (pingError) {
        throw new Error(`Connection failed: ${pingError.message}`);
      }
      console.log('✓ Database connection successful');

      // Test 2: Session check
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('Session invalid or expired');
      }
      console.log('✓ Session valid:', session.user.email);

      // Test 3: Simple upsert test
      const testPayload = {
        shop_owner_id: user.id,
        slot_duration_minutes: 15,
        max_jobs_per_slot: 3,
        advance_booking_days: 14,
        auto_accept_bookings: true
      };

      const { data, error } = await supabase
        .from('shop_settings')
        .upsert(testPayload)
        .select();

      if (error) {
        throw new Error(`Database write failed: ${error.message}`);
      }
      
      console.log('✓ Database write successful:', data);
      toast.success('Database access test PASSED! ✓');
      
      // Refresh data to show the test worked
      await fetchData();
      
    } catch (error) {
      console.error('✗ Database test FAILED:', error);
      toast.error(`Database test FAILED: ${error.message}`);
    }
    
    console.log('=== FORCE DATABASE TEST COMPLETED ===');
  };

  const generateAndSaveTimeSlots = async (date: string) => {
    if (!user?.id) {
      toast.error('User not authenticated');
      return;
    }

    // Validate date
    const selectedDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
      toast.error('Cannot generate slots for past dates');
      return;
    }

    const dayOfWeek = selectedDate.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase() as DayOfWeek;
    const dayHours = operatingHours.find(h => h.day_of_week === dayOfWeek);
    
    if (!dayHours || !dayHours.is_open) {
      toast.error(`Shop is closed on ${dayOfWeek}s`);
      return;
    }

    // Validate operating hours
    if (!dayHours.open_time || !dayHours.close_time) {
      toast.error(`Operating hours not set for ${dayOfWeek}`);
      return;
    }

    try {
      const slots = [];
      const startTime = new Date(`2000-01-01T${dayHours.open_time}:00`);
      const endTime = new Date(`2000-01-01T${dayHours.close_time}:00`);
      const slotDuration = settings.slot_duration_minutes * 60 * 1000;

      // Validate time range
      if (startTime >= endTime) {
        toast.error(`Invalid operating hours for ${dayOfWeek}: open time must be before close time`);
        return;
      }

      let currentTime = new Date(startTime);
      let slotCount = 0;
      const maxSlots = 200; // Safety limit to prevent excessive slots
      
      while (currentTime < endTime && slotCount < maxSlots) {
        const timeString = currentTime.toTimeString().slice(0, 5);
        slots.push({
          shop_owner_id: user.id,
          slot_date: date,
          slot_time: timeString,
          current_bookings: 0,
          max_capacity: settings.max_jobs_per_slot,
          is_available: true
        });
        
        currentTime = new Date(currentTime.getTime() + slotDuration);
        slotCount++;
      }

      if (slots.length === 0) {
        toast.error('No time slots could be generated with current settings');
        return;
      }

      // Delete existing slots for this date first
      const { error: deleteError } = await supabase
        .from('time_slots')
        .delete()
        .eq('shop_owner_id', user.id)
        .eq('slot_date', date);

      if (deleteError) {
        console.error('Error deleting existing slots:', deleteError);
        throw deleteError;
      }

      // Insert new slots in batch
      const { error: insertError } = await supabase
        .from('time_slots')
        .insert(slots);

      if (insertError) {
        console.error('Error inserting new slots:', insertError);
        throw insertError;
      }

      // Refresh the slots display
      await fetchTimeSlots(date);
      toast.success(`Generated ${slots.length} time slots for ${date}`);
    } catch (error) {
      console.error('Error generating time slots:', error);
      toast.error('Failed to generate time slots. Please try again.');
    }
  };

  const updateOperatingHours = (dayKey: DayOfWeek, field: keyof OperatingHours, value: any) => {
    setOperatingHours(prev => 
      prev.map(day => 
        day.day_of_week === dayKey 
          ? { ...day, [field]: value }
          : day
      )
    );
  };

  useEffect(() => {
    if (user?.id) {
      fetchData();
    }
  }, [user?.id]);

  // Test database connection on component mount
  useEffect(() => {
    const testConnection = async () => {
      try {
        const { data, error } = await supabase
          .from('shop_settings')
          .select('count', { count: 'exact', head: true });
        
        if (error) {
          console.error('Database connection test failed:', error);
          toast.error('Database connection issue detected');
        }
      } catch (error) {
        console.error('Database connectivity test error:', error);
      }
    };

    if (user?.id) {
      testConnection();
    }
  }, [user?.id]);

  const mondayHours = operatingHours.find(h => h.day_of_week === 'monday');
  const todaySlots = timeSlots[selectedDate] || [];

  // Show loading if auth is still loading or data is loading
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
          <p className="text-muted-foreground">Loading configuration...</p>
        </div>
      </div>
    );
  }

  // Redirect if user is not authenticated
  if (!user && !authLoading) {
    console.log('User not authenticated, redirecting to auth page');
    window.location.href = '/auth';
    return null;
  }

  // Show error if user is not a shop owner
  if (user && user.user_metadata?.user_type !== 'shop_owner') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-destructive mb-2">Access Denied</h1>
          <p className="text-muted-foreground">This page is only accessible to shop owners.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <ShopHeader currentPage="Slot Config" />

      <main className="container mx-auto px-6 py-8">
        {/* Header Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Slot Configuration
          </h1>
          <p className="text-muted-foreground">
            Configure your available time slots and booking settings
          </p>
        </div>

        {/* Global Settings */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Settings className="w-5 h-5" />
              <span>Global Settings</span>
              {loading && <RefreshCw className="w-4 h-4 animate-spin ml-2" />}
            </CardTitle>
            <CardDescription>
              Configure basic slot settings. Data is loaded from database.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="space-y-2">
                <Label htmlFor="slot-duration">Slot Duration (minutes)</Label>
                <Select 
                  value={settings.slot_duration_minutes.toString()} 
                  onValueChange={(value) => setSettings(prev => ({ ...prev, slot_duration_minutes: parseInt(value) }))}
                >
                  <SelectTrigger id="slot-duration">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 minutes</SelectItem>
                    <SelectItem value="10">10 minutes</SelectItem>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="20">20 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">60 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="max-jobs">Max Jobs per Slot</Label>
                <Input
                  id="max-jobs"
                  type="number"
                  min="1"
                  max="20"
                  value={settings.max_jobs_per_slot}
                  onChange={(e) => setSettings(prev => ({ ...prev, max_jobs_per_slot: parseInt(e.target.value) || 5 }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="advance-booking">Advance Booking (days)</Label>
                <Input
                  id="advance-booking"
                  type="number"
                  min="1"
                  max="30"
                  value={settings.advance_booking_days}
                  onChange={(e) => setSettings(prev => ({ ...prev, advance_booking_days: parseInt(e.target.value) || 7 }))}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Options</Label>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="auto-accept"
                    checked={settings.auto_accept_bookings}
                    onCheckedChange={(checked) => setSettings(prev => ({ ...prev, auto_accept_bookings: checked as boolean }))}
                  />
                  <Label htmlFor="auto-accept" className="text-sm">Auto-accept bookings</Label>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Operating Hours */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="w-5 h-5" />
              <span>Operating Hours</span>
              {loading && <RefreshCw className="w-4 h-4 animate-spin ml-2" />}
            </CardTitle>
            <CardDescription>
              Set your daily operating hours. Data is synchronized with database.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {daysOfWeek.map(({ key, label }) => {
                const dayHours = operatingHours.find(h => h.day_of_week === key);
                if (!dayHours) return null;

                return (
                  <div key={key} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-medium">{label}</h3>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          checked={dayHours.is_open}
                          onCheckedChange={(checked) => updateOperatingHours(key, 'is_open', checked as boolean)}
                        />
                        <Label>Open</Label>
                      </div>
                    </div>
                    
                    {dayHours.is_open && (
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-2">
                          <Clock className="w-4 h-4" />
                          <Input
                            type="time"
                            value={dayHours.open_time}
                            onChange={(e) => updateOperatingHours(key, 'open_time', e.target.value)}
                            className="w-32"
                          />
                          <span className="text-muted-foreground">to</span>
                          <Input
                            type="time"
                            value={dayHours.close_time}
                            onChange={(e) => updateOperatingHours(key, 'close_time', e.target.value)}
                            className="w-32"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Time Slots Management */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Clock className="w-5 h-5" />
              <span>Time Slots for {selectedDate}</span>
            </CardTitle>
            <CardDescription>
              Generate and manage time slots for specific dates
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <Label htmlFor="slot-date">Select Date:</Label>
                <Input
                  id="slot-date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    fetchTimeSlots(e.target.value);
                  }}
                  className="w-48"
                />
                <Button onClick={() => generateAndSaveTimeSlots(selectedDate)}>
                  Generate Slots
                </Button>
              </div>

              {/* Display Current Time Slots */}
              {todaySlots.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-medium mb-3">Current Time Slots ({todaySlots.length} slots)</h4>
                  <div className="grid grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-2">
                    {todaySlots.map((slot) => (
                      <div
                        key={slot.id}
                        className={`p-2 rounded text-xs text-center border transition-colors ${
                          slot.is_available 
                            ? 'bg-green-100 border-green-300 text-green-800' 
                            : 'bg-red-100 border-red-300 text-red-800'
                        }`}
                      >
                        <div className="font-medium">{slot.slot_time}</div>
                        <div className="text-xs">{slot.current_bookings}/{slot.max_capacity}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {todaySlots.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No time slots generated for this date</p>
                  <p className="text-sm">Click "Generate Slots" to create time slots based on operating hours</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end space-x-4">
          {/* Debug button for testing */}
          <Button 
            onClick={testDatabaseAccess} 
            variant="outline"
            disabled={authLoading}
            className="bg-blue-50 border-blue-200 text-blue-800 hover:bg-blue-100"
          >
            🔧 Test DB
          </Button>
          
          <Button 
            onClick={saveSettings} 
            disabled={saving || authLoading}
            className="min-w-[200px] bg-green-600 hover:bg-green-700 text-white font-semibold"
            size="lg"
          >
            {saving ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                FORCE SAVING...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                FORCE SAVE CONFIG
              </>
            )}
          </Button>
        </div>
      </main>
    </div>
  );
};

export default SlotConfig;