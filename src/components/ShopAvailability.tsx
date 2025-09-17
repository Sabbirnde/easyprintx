import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Clock, Users, Printer, Zap } from 'lucide-react';

interface BusinessHours {
  monday: { open: string; close: string; isOpen: boolean };
  tuesday: { open: string; close: string; isOpen: boolean };
  wednesday: { open: string; close: string; isOpen: boolean };
  thursday: { open: string; close: string; isOpen: boolean };
  friday: { open: string; close: string; isOpen: boolean };
  saturday: { open: string; close: string; isOpen: boolean };
  sunday: { open: string; close: string; isOpen: boolean };
}

interface ShopAvailabilityProps {
  businessHours?: BusinessHours;
  shopId: string;
  className?: string;
}

interface AvailabilityStatus {
  isOpen: boolean;
  opensAt?: string;
  closesAt?: string;
  nextOpenDay?: string;
  queueStatus: 'low' | 'medium' | 'high';
  estimatedWaitTime: number; // in minutes
  availablePrinters: number;
  totalPrinters: number;
}

const ShopAvailability: React.FC<ShopAvailabilityProps> = ({ 
  businessHours, 
  shopId, 
  className = '' 
}) => {
  const [availability, setAvailability] = useState<AvailabilityStatus>({
    isOpen: false,
    queueStatus: 'low',
    estimatedWaitTime: 0,
    availablePrinters: 2,
    totalPrinters: 3
  });

  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every minute for accurate business hours
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  // Calculate availability status based on business hours and current time
  useEffect(() => {
    if (!businessHours) {
      // Default business hours if not provided
      const defaultHours: BusinessHours = {
        monday: { open: "09:00", close: "18:00", isOpen: true },
        tuesday: { open: "09:00", close: "18:00", isOpen: true },
        wednesday: { open: "09:00", close: "18:00", isOpen: true },
        thursday: { open: "09:00", close: "18:00", isOpen: true },
        friday: { open: "09:00", close: "18:00", isOpen: true },
        saturday: { open: "10:00", close: "16:00", isOpen: true },
        sunday: { open: "10:00", close: "16:00", isOpen: false }
      };
      calculateAvailability(defaultHours);
    } else {
      calculateAvailability(businessHours);
    }
  }, [businessHours, currentTime]);

  const calculateAvailability = (hours: BusinessHours) => {
    const now = new Date();
    const currentDay = now.toDateString().toLowerCase().substring(0, 3);
    const currentTimeStr = now.toTimeString().substring(0, 5); // HH:MM format
    
    const dayMap: { [key: string]: keyof BusinessHours } = {
      'sun': 'sunday',
      'mon': 'monday', 
      'tue': 'tuesday',
      'wed': 'wednesday',
      'thu': 'thursday',
      'fri': 'friday',
      'sat': 'saturday'
    };
    
    const todayKey = dayMap[currentDay] || 'monday';
    const todayHours = hours[todayKey];

    let isCurrentlyOpen = false;
    let closesAt = '';
    let opensAt = '';
    let nextOpenDay = '';

    if (todayHours.isOpen) {
      const openTime = todayHours.open;
      const closeTime = todayHours.close;
      
      isCurrentlyOpen = currentTimeStr >= openTime && currentTimeStr < closeTime;
      closesAt = closeTime;
      opensAt = openTime;
    }

    // If closed today, find next open day
    if (!isCurrentlyOpen) {
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const todayIndex = days.indexOf(todayKey);
      
      for (let i = 1; i <= 7; i++) {
        const nextDayIndex = (todayIndex + i) % 7;
        const nextDay = days[nextDayIndex] as keyof BusinessHours;
        
        if (hours[nextDay].isOpen) {
          nextOpenDay = `${nextDay.charAt(0).toUpperCase() + nextDay.slice(1)} at ${hours[nextDay].open}`;
          opensAt = hours[nextDay].open;
          break;
        }
      }
    }

    // Simulate real-time queue and printer availability
    // In a real app, this would come from live data
    const queueStatuses: ('low' | 'medium' | 'high')[] = ['low', 'medium', 'high'];
    const randomQueueStatus = queueStatuses[Math.floor(Math.random() * 3)];
    const waitTimes = { low: 5, medium: 15, high: 30 };
    
    setAvailability({
      isOpen: isCurrentlyOpen,
      opensAt,
      closesAt,
      nextOpenDay,
      queueStatus: randomQueueStatus,
      estimatedWaitTime: waitTimes[randomQueueStatus],
      availablePrinters: Math.floor(Math.random() * 3) + 1,
      totalPrinters: 3
    });
  };

  const getQueueStatusColor = (status: string) => {
    switch (status) {
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusText = () => {
    if (availability.isOpen) {
      return `Open until ${availability.closesAt}`;
    } else if (availability.nextOpenDay) {
      return `Opens ${availability.nextOpenDay}`;
    } else {
      return 'Hours not available';
    }
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Open/Closed Status */}
      <div className="flex items-center justify-between">
        <Badge 
          variant={availability.isOpen ? "default" : "destructive"}
          className="flex items-center gap-1"
        >
          <Clock className="w-3 h-3" />
          {availability.isOpen ? "Open Now" : "Closed"}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {getStatusText()}
        </span>
      </div>

      {/* Real-time availability indicators (only show when open) */}
      {availability.isOpen && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          {/* Queue Status */}
          <div className={`flex items-center gap-1 px-2 py-1 rounded border ${getQueueStatusColor(availability.queueStatus)}`}>
            <Users className="w-3 h-3" />
            <span className="font-medium">
              {availability.queueStatus === 'low' && 'Quick Service'}
              {availability.queueStatus === 'medium' && 'Moderate Wait'}
              {availability.queueStatus === 'high' && 'Busy'}
            </span>
          </div>

          {/* Printer Availability */}
          <div className="flex items-center gap-1 px-2 py-1 rounded border bg-blue-100 text-blue-800 border-blue-200">
            <Printer className="w-3 h-3" />
            <span className="font-medium">
              {availability.availablePrinters}/{availability.totalPrinters} Available
            </span>
          </div>
        </div>
      )}

      {/* Estimated wait time */}
      {availability.isOpen && availability.estimatedWaitTime > 0 && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Zap className="w-3 h-3" />
          <span>Est. wait: {availability.estimatedWaitTime} min</span>
        </div>
      )}
    </div>
  );
};

export default ShopAvailability;