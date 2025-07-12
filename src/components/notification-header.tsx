"use client";

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Bell, 
  Clock, 
  Calendar,
  X,
  Pin,
  Tv,
  Globe,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NotificationHeaderProps {
  className?: string;
}

export function NotificationHeader({ className }: NotificationHeaderProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimated, setIsAnimated] = useState(false);

  useEffect(() => {
    // Check if notification was dismissed in the last 24 hours
    const checkNotificationStatus = () => {
      try {
        const dismissedAt = localStorage.getItem('notification-dismissed-at');
        if (dismissedAt) {
          const dismissedTime = new Date(dismissedAt);
          const now = new Date();
          const hoursSinceDismissed = (now.getTime() - dismissedTime.getTime()) / (1000 * 60 * 60);
          
          // If less than 24 hours have passed, keep it hidden
          if (hoursSinceDismissed < 24) {
            setIsVisible(false);
            return;
          }
        }
        
        // Show notification if it hasn't been dismissed or 24+ hours have passed
        setIsVisible(true);
        
        // Add entrance animation after showing
        const timer = setTimeout(() => setIsAnimated(true), 100);
        return () => clearTimeout(timer);
      } catch (error) {
        // If localStorage fails, default to showing the notification
        console.warn('Failed to check notification status:', error);
        setIsVisible(true);
        const timer = setTimeout(() => setIsAnimated(true), 100);
        return () => clearTimeout(timer);
      }
    };

    checkNotificationStatus();
  }, []);

  const handleClose = () => {
    try {
      localStorage.setItem('notification-dismissed-at', new Date().toISOString());
    } catch (error) {
      console.warn('Failed to save notification dismissal:', error);
    }
    
    setIsAnimated(false);
    setTimeout(() => setIsVisible(false), 300);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className={cn("w-full relative z-10", className)}>
      <div className={cn(
        "transition-all duration-500 ease-out",
        isAnimated ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
      )}>
        <Card className="mx-3 my-2 sm:mx-6 sm:my-4 bg-gradient-to-r from-pink-50 via-purple-50 to-pink-50 dark:from-pink-950/20 dark:via-purple-950/20 dark:to-pink-950/20 border-pink-200/50 dark:border-pink-800/50 shadow-lg backdrop-blur-sm overflow-hidden relative">
          {/* Animated background elements */}
          <div className="absolute inset-0 bg-gradient-to-r from-pink-100/30 via-transparent to-purple-100/30 dark:from-pink-900/10 dark:via-transparent dark:to-purple-900/10" />
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-pink-400 via-purple-400 to-pink-400" />
          
          <div className="relative p-3 sm:p-5">
            <div className="flex items-start gap-3 sm:gap-4">
              {/* Animated Icon */}
              <div className="flex-shrink-0 relative">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-pink-100 to-purple-100 dark:from-pink-900/50 dark:to-purple-900/50 rounded-full flex items-center justify-center shadow-md">
                  <Pin className="h-5 w-5 sm:h-6 sm:w-6 text-pink-600 dark:text-pink-400 animate-pulse" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                  <Bell className="h-2 w-2 text-white animate-bounce" />
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                {/* Header with badge */}
                <div className="flex items-center gap-2 mb-3">
                  <Badge className="bg-gradient-to-r from-pink-500 to-purple-500 text-white border-0 shadow-sm">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Thông báo 
                  </Badge>
                  <div className="flex-1 h-px bg-gradient-to-r from-pink-200 to-transparent dark:from-pink-800 dark:to-transparent" />
                </div>

                {/* Main notification content */}
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-pink-100 dark:bg-pink-900/50 rounded-full flex items-center justify-center flex-shrink-0">
                      <Tv className="h-3 w-3 text-pink-600 dark:text-pink-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm sm:text-base text-foreground vietnamese-text leading-relaxed">
                        Phim Sẽ Ra Tập Mới Vào{' '}
                        <span className="font-bold text-pink-600 dark:text-pink-400 bg-pink-100 dark:bg-pink-900/30 px-2 py-0.5 rounded-md">
                          10h30 Tối Thứ 7
                        </span>{' '}
                        Hàng Tuần
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-purple-100 dark:bg-purple-900/50 rounded-full flex items-center justify-center flex-shrink-0">
                      <Globe className="h-3 w-3 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm sm:text-base text-foreground vietnamese-text leading-relaxed">
                        Bản Dịch Sẽ Có Mặt Tại Web Vào Tầm{' '}
                        <span className="font-bold text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 px-2 py-0.5 rounded-md">
                          12h Sáng Chủ Nhật
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Schedule info */}
                <div className="mt-4 p-3 bg-white/50 dark:bg-gray-900/20 rounded-lg border border-pink-100 dark:border-pink-900/30 w-fit">
                  <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-pink-500" />
                      <span className="vietnamese-text">Lịch phát sóng cố định (hoặc không)</span>
                    </div>
                    <div className="w-px h-3 bg-pink-200 dark:bg-pink-800" />
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-purple-500" />
                      <span className="vietnamese-text">Cập nhật đều đặn hàng tuần (hoặc không)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Close button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="flex-shrink-0 h-8 w-8 p-0 hover:bg-pink-100 dark:hover:bg-pink-900/50 rounded-full transition-all duration-200 hover:scale-110"
                title="Ẩn thông báo trong 24 giờ"
              >
                <X className="h-4 w-4 text-muted-foreground hover:text-pink-600" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
