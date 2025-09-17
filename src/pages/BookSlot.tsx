import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Header from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { 
  Calendar as CalendarIcon,
  Clock,
  User,
  Mail,
  Phone,
  MapPin,
  CheckCircle,
  AlertCircle,
  Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { format, addDays, isSameDay } from 'date-fns';
import ProtectedRoute from "@/components/ProtectedRoute";
import { getPricingRules, calculateMultipleFilesCost, formatCurrency } from "@/utils/pricingCalculations";

interface TimeSlot {
  id: string;
  slot_time: string;
  slot_date: string;
  current_bookings: number;
  max_capacity: number;
  is_available: boolean;
}

interface ShopInfo {
  id: string;
  shop_name: string;
  address: string;
  phone_number: string;
  email_address: string;
  description: string;
  shop_owner_id: string;
}

const BookSlot = () => {
  const { shopId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user, profile } = useAuth();
  
  // Get uploaded files from navigation state
  const uploadedFiles = location.state?.files || [];
  const printSettings = location.state?.printSettings || {
    copies: 1,
    paperSize: 'A4',
    colorType: 'blackwhite',
    paperQuality: 'standard'
  };

  const [shop, setShop] = useState<ShopInfo | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [customerInfo, setCustomerInfo] = useState({
    name: profile?.full_name || '',
    email: user?.email || '',
    phone: profile?.phone || '',
    notes: ''
  });
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);

  useEffect(() => {
    if (shopId) {
      fetchShopInfo();
    }
  }, [shopId]);

  useEffect(() => {
    if (shop && selectedDate) {
      fetchTimeSlots();
    }
  }, [shop, selectedDate]);

  const fetchShopInfo = async () => {
    try {
      // Use public directory for basic shop info displayed to customers
      const { data, error } = await supabase
        .from('public_shop_directory')
        .select('*')
        .eq('id', shopId)
        .eq('is_active', true)
        .single();

      if (error) throw error;
      
      // Transform to match expected interface
      const shopInfo = {
        id: data.id,
        shop_name: data.shop_name,
        address: data.address || 'Address not available',
        phone_number: 'Available after booking', // Don't expose private phone
        email_address: 'Contact via platform', // Don't expose private email
        description: data.description || 'Professional printing services',
        shop_owner_id: data.shop_owner_id
      };
      
      setShop(shopInfo);
    } catch (error) {
      console.error('Error fetching shop:', error);
      toast({
        title: "Error",
        description: "Failed to load shop information",
        variant: "destructive"
      });
      navigate('/find-shops');
    } finally {
      setLoading(false);
    }
  };

  const fetchTimeSlots = async () => {
    if (!shop) return;

    try {
      const dateString = format(selectedDate, 'yyyy-MM-dd');
      const { data, error } = await supabase
        .from('time_slots')
        .select('*')
        .eq('shop_owner_id', shop.shop_owner_id)
        .eq('slot_date', dateString)
        .eq('is_available', true)
        .order('slot_time');

      if (error) throw error;
      setTimeSlots(data || []);
      setSelectedSlot(null);
    } catch (error) {
      console.error('Error fetching time slots:', error);
      setTimeSlots([]);
    }
  };

  const handleBooking = async () => {
    if (!selectedSlot || !shop || !user) {
      toast({
        title: "Missing Information",
        description: "Please select a time slot and fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    setBooking(true);
    try {
      // Create the booking
      const { data: bookingData, error: bookingError } = await supabase
        .from('bookings')
        .insert({
          shop_owner_id: shop.shop_owner_id,
          customer_id: user.id,
          time_slot_id: selectedSlot.id,
          slot_date: selectedSlot.slot_date,
          slot_time: selectedSlot.slot_time,
          customer_name: customerInfo.name,
          customer_email: customerInfo.email,
          notes: customerInfo.notes,
          status: 'confirmed'
        })
        .select()
        .single();

      if (bookingError) throw bookingError;

      // If there are uploaded files, create print jobs
      if (uploadedFiles.length > 0) {
        // Get shop's pricing rules
        const pricingRules = await getPricingRules(shop.shop_owner_id);
        
        const printJobs = await Promise.all(
          uploadedFiles.map(async (file: any) => {
            const jobDetails = {
              pages: file.pages || 1,
              copies: printSettings.copies,
              colorType: printSettings.colorType,
              paperQuality: printSettings.paperQuality
            };
            const fileCost = calculateMultipleFilesCost([{ pages: file.pages || 1 }], jobDetails, pricingRules);

            const { data, error } = await supabase
              .from('print_jobs')
              .insert({
                shop_owner_id: shop.shop_owner_id,
                customer_id: user.id,
                file_name: file.name,
                file_url: file.url,
                pages: file.pages || 1,
                copies: printSettings.copies,
                color_pages: printSettings.colorType === 'color' ? (file.pages || 1) : 0,
                total_cost: fileCost,
                status: 'pending',
                customer_name: customerInfo.name,
                customer_email: customerInfo.email,
                print_settings: printSettings,
                notes: `Booking ID: ${bookingData.id} - ${printSettings.paperSize}, ${printSettings.colorType === 'color' ? 'Color' : 'B&W'}`
              })
              .select()
              .single();

            if (error) throw error;
            return data;
          })
        );

        // Link print jobs to booking
        await supabase
          .from('bookings')
          .update({ print_job_id: printJobs[0]?.id })
          .eq('id', bookingData.id);
      }

      toast({
        title: "Booking Confirmed!",
        description: `Your slot is booked for ${format(new Date(selectedSlot.slot_date), 'MMM dd, yyyy')} at ${selectedSlot.slot_time}`,
      });

      navigate('/history');
      
    } catch (error) {
      console.error('Error creating booking:', error);
      toast({
        title: "Booking Failed",
        description: "Failed to create booking. Please try again.",
        variant: "destructive"
      });
    } finally {
      setBooking(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background">
          <Header />
          <div className="container mx-auto px-6 py-8 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p>Loading shop information...</p>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!shop) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-background">
          <Header />
          <div className="container mx-auto px-6 py-8">
            <Card className="max-w-md mx-auto text-center">
              <CardContent className="p-6">
                <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">Shop Not Found</h2>
                <p className="text-muted-foreground mb-4">The requested print shop could not be found.</p>
                <Button onClick={() => navigate('/find-shops')}>
                  Back to Find Shops
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const maxDate = addDays(new Date(), 30); // Allow booking up to 30 days in advance

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-6 py-8">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-6">
              <Button 
                variant="outline" 
                onClick={() => navigate('/find-shops')}
                className="mb-4"
              >
                ← Back to Shop Search
              </Button>
              <h1 className="text-3xl font-bold mb-2">Book Time Slot</h1>
              <p className="text-muted-foreground">Reserve your printing time at {shop.shop_name}</p>
            </div>

            {/* Shop Information */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <MapPin className="w-5 h-5" />
                  <span>{shop.shop_name}</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    <span>{shop.address}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Phone className="w-4 h-4 text-muted-foreground" />
                    <span>{shop.phone_number}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-muted-foreground" />
                    <span>{shop.email_address}</span>
                  </div>
                </div>
                {shop.description && (
                  <p className="mt-4 text-muted-foreground">{shop.description}</p>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Date & Time Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <CalendarIcon className="w-5 h-5" />
                    <span>Select Date & Time</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Calendar */}
                  <div>
                    <Label className="text-sm font-medium mb-2 block">Select Date</Label>
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => date && setSelectedDate(date)}
                      disabled={(date) => date < new Date() || date > maxDate}
                      className="rounded-md border"
                    />
                  </div>

                  {/* Time Slots */}
                  <div>
                    <Label className="text-sm font-medium mb-3 block">
                      Available Times - {format(selectedDate, 'MMM dd, yyyy')}
                    </Label>
                    {timeSlots.length === 0 ? (
                      <div className="text-center py-6 text-muted-foreground">
                        <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p>No available time slots for this date</p>
                        <p className="text-sm">Please select another date</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        {timeSlots.map((slot) => (
                          <button
                            key={slot.id}
                            onClick={() => setSelectedSlot(slot)}
                            className={`p-3 rounded-lg border text-sm transition-colors ${
                              selectedSlot?.id === slot.id
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-border hover:border-primary/50 bg-background'
                            }`}
                          >
                            <div className="font-medium">{slot.slot_time}</div>
                            <div className="text-xs opacity-70">
                              {slot.current_bookings}/{slot.max_capacity} booked
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Customer Information & Print Summary */}
              <div className="space-y-6">
                {/* Customer Information */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <User className="w-5 h-5" />
                      <span>Customer Information</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Full Name *</Label>
                      <Input
                        id="name"
                        value={customerInfo.name}
                        onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Enter your full name"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address *</Label>
                      <Input
                        id="email"
                        type="email"
                        value={customerInfo.email}
                        onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="Enter your email"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        value={customerInfo.phone}
                        onChange={(e) => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="Enter your phone number"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes">Special Instructions</Label>
                      <Textarea
                        id="notes"
                        value={customerInfo.notes}
                        onChange={(e) => setCustomerInfo(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Any special requirements or notes..."
                        rows={3}
                      />
                    </div>
                  </CardContent>
                </Card>

                {/* Print Summary */}
                {uploadedFiles.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Print Job Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="text-sm">
                          <strong>{uploadedFiles.length}</strong> document(s) to print
                        </div>
                        <div className="text-sm space-y-1">
                          <div>Copies: {printSettings.copies}</div>
                          <div>Paper Size: {printSettings.paperSize}</div>
                          <div>Color: {printSettings.colorType === 'color' ? 'Color' : 'Black & White'}</div>
                          <div>Quality: {printSettings.paperQuality}</div>
                        </div>
                        <div className="pt-2 border-t">
                          <div className="flex justify-between font-medium">
                            <span>Estimated Total:</span>
                            <span>৳{(uploadedFiles.reduce((sum, file) => {
                              const colorMultiplier = printSettings.colorType === 'color' ? 2 : 1;
                              const qualityMultiplier = printSettings.paperQuality === 'premium' ? 1.5 : 1;
                              return sum + ((file.pages || 1) * printSettings.copies * 2 * colorMultiplier * qualityMultiplier);
                            }, 0)).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Booking Summary & Confirm */}
                {selectedSlot && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center space-x-2">
                        <CheckCircle className="w-5 h-5" />
                        <span>Confirm Booking</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Shop:</span>
                          <span className="font-medium">{shop.shop_name}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Date:</span>
                          <span className="font-medium">{format(new Date(selectedSlot.slot_date), 'MMM dd, yyyy')}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Time:</span>
                          <span className="font-medium">{selectedSlot.slot_time}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Customer:</span>
                          <span className="font-medium">{customerInfo.name}</span>
                        </div>
                      </div>
                      
                      <Button 
                        onClick={handleBooking}
                        disabled={booking || !customerInfo.name || !customerInfo.email}
                        className="w-full"
                      >
                        {booking ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Confirming Booking...
                          </>
                        ) : (
                          'Confirm Booking'
                        )}
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default BookSlot;