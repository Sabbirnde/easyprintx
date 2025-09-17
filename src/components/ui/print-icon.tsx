import React, { useState, useEffect } from 'react';
import { Printer, PrinterCheck, Loader2, AlertCircle, FileText, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PrintIconProps {
  state?: 'idle' | 'loading' | 'printing' | 'success' | 'error' | 'queue' | 'processing';
  size?: number;
  className?: string;
  animated?: boolean;
  progress?: number; // 0-100 for progress indication
  onClick?: () => void;
  pulseOnIdle?: boolean;
}

export const DynamicPrintIcon: React.FC<PrintIconProps> = ({
  state = 'idle',
  size = 24,
  className,
  animated = true,
  progress = 0,
  onClick,
  pulseOnIdle = false
}) => {
  const [showPaper, setShowPaper] = useState(false);

  useEffect(() => {
    if (state === 'printing') {
      const interval = setInterval(() => {
        setShowPaper(prev => !prev);
      }, 500);
      return () => clearInterval(interval);
    } else {
      setShowPaper(false);
    }
  }, [state]);

  const getIconAndAnimation = () => {
    const baseClasses = cn(
      'transition-all duration-300 ease-in-out',
      onClick && 'cursor-pointer hover-scale',
      className
    );

    switch (state) {
      case 'loading':
        return (
          <div className={cn(baseClasses, 'text-muted-foreground')}>
            <Loader2 
              size={size} 
              className={animated ? 'animate-spin' : ''} 
            />
          </div>
        );

      case 'printing':
        return (
          <div className={cn(baseClasses, 'relative text-primary')}>
            <Printer 
              size={size} 
              className={animated ? 'animate-pulse' : ''} 
            />
            {showPaper && (
              <FileText 
                size={size * 0.6} 
                className="absolute -top-1 -right-1 text-primary animate-slide-in-right" 
              />
            )}
            {progress > 0 && (
              <div className="absolute -bottom-2 left-0 w-full h-1 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-300 rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
            )}
          </div>
        );

      case 'processing':
        return (
          <div className={cn(baseClasses, 'text-primary')}>
            <Zap 
              size={size} 
              className={animated ? 'animate-bounce' : ''} 
            />
          </div>
        );

      case 'queue':
        return (
          <div className={cn(baseClasses, 'text-secondary')}>
            <Printer 
              size={size} 
              className={animated ? 'animate-[pulse_2s_cubic-bezier(0.4,0,0.6,1)_infinite]' : ''} 
            />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-secondary rounded-full animate-scale-in" />
          </div>
        );

      case 'success':
        return (
          <div className={cn(baseClasses, 'text-success animate-scale-in')}>
            <PrinterCheck 
              size={size} 
              className={animated ? 'animate-[bounce_1s_ease-in-out]' : ''} 
            />
          </div>
        );

      case 'error':
        return (
          <div className={cn(baseClasses, 'text-destructive animate-fade-in')}>
            <div className="relative">
              <Printer size={size} />
              <AlertCircle 
                size={size * 0.6} 
                className="absolute -top-1 -right-1 animate-bounce" 
              />
            </div>
          </div>
        );

      default: // idle
        return (
          <div className={cn(
            baseClasses, 
            'text-foreground hover:text-primary',
            pulseOnIdle && 'animate-[pulse_3s_cubic-bezier(0.4,0,0.6,1)_infinite]'
          )}>
            <Printer 
              size={size} 
              className="transition-transform duration-200 hover:scale-110" 
            />
          </div>
        );
    }
  };

  return (
    <div 
      className={cn(
        "relative inline-flex items-center justify-center",
        onClick && "hover:bg-accent/50 rounded-md p-1 transition-colors"
      )}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {getIconAndAnimation()}
    </div>
  );
};

export default DynamicPrintIcon;
export { DynamicPrintIcon as PrintIcon };