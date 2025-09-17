import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, Calendar, Zap, CheckCircle, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface TimeSlot {
  time: string;
  available: boolean;
  waitTime: number;
  price: number;
}

interface InstantBookingProps {
  shopId: string;
  shopName: string;
  children: React.ReactNode;
  files?: any[];
  printSettings?: any;
}

const InstantBooking: React.FC<InstantBookingProps> = ({
  shopId,
  shopName,
  children,
  files = [],
  printSettings = {}
}) => {
  const [open, setOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [booking, setBooking] = useState(false);
  const { toast } = useToast();

  // Generate available time slots for today
  useEffect(() => {
    if (open) {
      generateTimeSlots();
    }
  }, [open]);

  const generateTimeSlots = () => {
    const now = new Date();
    const slots: TimeSlot[] = [];
    
    // Generate slots for the next 8 hours (30-minute intervals)
    for (let i = 0; i < 16; i++) {
      const slotTime = new Date(now.getTime() + (i * 30 * 60 * 1000));
      const timeStr = slotTime.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
      
      // Simulate availability (80% chance of being available)
      const available = Math.random() > 0.2;
      const waitTime = available ? Math.floor(Math.random() * 20) + 5 : 0;
      const basePrice = 10;
      const rushPrice = i < 4 ? 5 : 0; // Rush pricing for next 2 hours
      
      slots.push({
        time: timeStr,
        available,
        waitTime,
        price: basePrice + rushPrice
      });
    }
    
    setTimeSlots(slots);
  };

  const handleInstantBook = async () => {
    if (!selectedSlot) return;
    
    setBooking(true);
    try {
      // Simulate booking API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // In a real app, this would create a booking record
      const { error } = await supabase
        .from('print_jobs')
        .insert({
          shop_owner_id: shopId,
          customer_name: 'Customer', // Would get from user context
          file_name: files.map(f => f.name).join(', ') || 'Instant Booking',
          copies: printSettings.copies || 1,
          print_settings: printSettings,
          total_cost: selectedSlot.price,
          notes: `Scheduled for ${selectedSlot.time}`
        });

      if (error) {
        console.error('Booking error:', error);
      }

      toast({
        title: "Booking Confirmed! 🎉",
        description: `Your print job is scheduled for ${selectedSlot.time} at ${shopName}`,
      });
      
      setOpen(false);
      setSelectedSlot(null);
    } catch (error) {
      toast({
        title: "Booking Failed",
        description: "Unable to book at this time. Please try again.",
        variant: "destructive"
      });
    } finally {
      setBooking(false);
    }
  };

  const getSlotStatusColor = (slot: TimeSlot) => {
    if (!slot.available) return 'bg-gray-100 text-gray-400 border-gray-200';
    if (slot.waitTime <= 10) return 'bg-green-100 text-green-800 border-green-200';
    if (slot.waitTime <= 20) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    return 'bg-red-100 text-red-800 border-red-200';
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-blue-600" />
            Instant Booking
          </DialogTitle>
          <DialogDescription>
            Book a time slot at {shopName} and skip the wait
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current booking summary */}
          {files.length > 0 && (
            <Card>
              <CardContent className="p-3">
                <div className="text-sm">
                  <div className="font-medium mb-1">Print Job Summary</div>
                  <div className="text-muted-foreground">
                    {files.length} file{files.length !== 1 ? 's' : ''} • {printSettings.paperSize} • {printSettings.colorType}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Available time slots */}
          <div>
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              Available Today
            </h3>
            
            <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
              {timeSlots.map((slot, index) => (
                <Card
                  key={index}
                  className={`cursor-pointer transition-all ${
                    selectedSlot?.time === slot.time 
                      ? 'ring-2 ring-blue-500 bg-blue-50' 
                      : slot.available 
                        ? 'hover:shadow-md' 
                        : 'opacity-50 cursor-not-allowed'
                  }`}
                  onClick={() => slot.available && setSelectedSlot(slot)}
                >
                  <CardContent className="p-3">
                    <div className="text-center">
                      <div className="font-medium text-sm">{slot.time}</div>
                      {slot.available ? (
                        <>
                          <Badge 
                            variant="outline" 
                            className={`text-xs mt-1 ${getSlotStatusColor(slot)}`}
                          >
                            {slot.waitTime <= 10 ? 'Fast' : slot.waitTime <= 20 ? 'Normal' : 'Busy'}
                          </Badge>
                          <div className="text-xs text-muted-foreground mt-1">
                            ${slot.price}
                            {slot.price > 10 && <span className="text-orange-600"> • Rush</span>}
                          </div>
                        </>
                      ) : (
                        <Badge variant="outline" className="text-xs mt-1 bg-gray-100 text-gray-400">
                          Booked
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Selected slot details */}
          {selectedSlot && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">Selected Time</div>
                    <div className="text-blue-700">{selectedSlot.time}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-sm">Total Cost</div>
                    <div className="text-blue-700 font-bold">${selectedSlot.price}</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    ~{selectedSlot.waitTime} min wait
                  </div>
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Guaranteed slot
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Book button */}
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button 
              className="flex-1"
              onClick={handleInstantBook}
              disabled={!selectedSlot || booking}
            >
              {booking ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Booking...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Confirm Booking
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InstantBooking;