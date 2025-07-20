"use client";

import { useState, useEffect, useRef } from 'react';
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
  Sparkles,
  Shield,
  ExternalLink,
  ChevronDown
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NotificationHeaderProps {
  readonly className?: string;
}

export function NotificationHeader({ className }: NotificationHeaderProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimated, setIsAnimated] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [showAdblockGuide, setShowAdblockGuide] = useState(false);
  const [deviceType, setDeviceType] = useState<'desktop' | 'android' | 'ios'>('desktop');
  const adblockRef = useRef<HTMLDivElement>(null);

  // Detect device type (desktop, android, ios)
  useEffect(() => {
    const checkDeviceType = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isSmallScreen = window.innerWidth <= 768;
      
      // Check for Android devices first (more specific check)
      if (/android/.test(userAgent)) {
        setDeviceType('android');
      }
      // Check for iOS devices (specific iOS identifiers only)
      else if (/iphone|ipad|ipod/.test(userAgent) || 
               (userAgent.includes('safari') && userAgent.includes('mobile') && !userAgent.includes('android') && !userAgent.includes('chrome'))) {
        setDeviceType('ios');
      }
      // Additional Android check for small screens with common Android browsers
      else if (isSmallScreen && /chrome|firefox|opera|samsung/.test(userAgent) && !userAgent.includes('safari')) {
        setDeviceType('android');
      }
      // Default to desktop
      else {
        setDeviceType('desktop');
      }
      
      // Debug log to help with testing (remove in production)
      console.log('Device detection:', {
        userAgent: userAgent,
        deviceType: /android/.test(userAgent) ? 'android' : 
                   /iphone|ipad|ipod/.test(userAgent) ? 'ios' : 'desktop',
        isSmallScreen,
        hasAndroid: /android/.test(userAgent),
        hasIOS: /iphone|ipad|ipod/.test(userAgent)
      });
    };

    checkDeviceType();
    window.addEventListener('resize', checkDeviceType);
    return () => window.removeEventListener('resize', checkDeviceType);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (adblockRef.current && !adblockRef.current.contains(event.target as Node)) {
        setShowAdblockGuide(false);
      }
    }

    if (showAdblockGuide) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showAdblockGuide]);

  useEffect(() => {
    setIsHydrated(true);
    
    // Check if notification should be shown
    const checkNotificationStatus = () => {
      try {
        const dismissedAt = localStorage.getItem('notification-dismissed-at');
        
        // If never dismissed, show the notification
        if (!dismissedAt) {
          setIsVisible(true);
          setTimeout(() => setIsAnimated(true), 100);
          return;
        }
        
        // If dismissed, check if 24 hours have passed
        const dismissedTime = new Date(dismissedAt);
        const now = new Date();
        const hoursSinceDismissed = (now.getTime() - dismissedTime.getTime()) / (1000 * 60 * 60);
        
        // Show if 24+ hours have passed, hide if less than 24 hours
        if (hoursSinceDismissed >= 24) {
          setIsVisible(true);
          setTimeout(() => setIsAnimated(true), 100);
        } else {
          setIsVisible(false);
        }
        
      } catch (error) {
        // If localStorage fails, default to showing the notification
        console.warn('Failed to check notification status:', error);
        setIsVisible(true);
        setTimeout(() => setIsAnimated(true), 100);
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

  if (!isHydrated || !isVisible) {
    return null;
  }
  return (
    <div className={cn("w-full relative z-10", className)}>
      <div className={cn(
        "transition-all duration-500 ease-out",
        isAnimated ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-4"
      )}>
        <Card className="bg-gradient-to-r from-pink-50 via-purple-50 to-pink-50 dark:from-pink-950/20 dark:via-purple-950/20 dark:to-pink-950/20 border-pink-200/50 dark:border-pink-800/50 shadow-lg backdrop-blur-sm overflow-visible relative">
          <div className="absolute inset-0 bg-gradient-to-r from-pink-100/30 via-transparent to-purple-100/30 dark:from-pink-900/10 dark:via-transparent dark:to-purple-900/10" />
          <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-pink-400 via-purple-400 to-pink-400" />
          
          <div className="relative p-3 sm:p-5">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="flex-shrink-0 relative">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-pink-100 to-purple-100 dark:from-pink-900/50 dark:to-purple-900/50 rounded-full flex items-center justify-center shadow-md">
                  <Pin className="h-5 w-5 sm:h-6 sm:w-6 text-pink-600 dark:text-pink-400 animate-pulse" />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                  <Bell className="h-2 w-2 text-white animate-bounce" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-3">
                  <Badge className="bg-gradient-to-r from-pink-500 to-purple-500 text-white border-0 shadow-sm">
                    <Sparkles className="h-3 w-3 mr-1" />
                    Thông báo 
                  </Badge>
                  <div className="flex-1 h-px bg-gradient-to-r from-pink-200 to-transparent dark:from-pink-800 dark:to-transparent" />
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-pink-100 dark:bg-pink-900/50 rounded-full flex items-center justify-center flex-shrink-0">
                      <Tv className="h-3 w-3 text-pink-600 dark:text-pink-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm sm:text-base text-foreground vietnamese-text leading-relaxed">
                        Phim Sẽ Ra Tập Mới Vào{' '}
                        <span className="font-bold text-pink-600 dark:text-pink-400 bg-pink-100 dark:bg-pink-900/30 px-2 py-0.5 rounded-md whitespace-nowrap">
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
                        <span className="font-bold text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 px-2 py-0.5 rounded-md whitespace-nowrap">
                          12h Sáng Chủ Nhật
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="p-3 bg-white/50 dark:bg-gray-900/20 rounded-lg border border-pink-100 dark:border-pink-900/30">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 text-xs sm:text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-pink-500 flex-shrink-0" />
                        <span className="vietnamese-text">Lịch phát sóng cố định (hoặc không)</span>
                      </div>
                      <div className="hidden sm:block w-px h-3 bg-pink-200 dark:bg-pink-800" />
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-purple-500 flex-shrink-0" />
                        <span className="vietnamese-text">Cập nhật đều đặn hàng tuần (hoặc không)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Adblock Guide - Right side - Only show for desktop and Android */}
              {deviceType !== 'ios' && (
                <div className="flex flex-col items-center gap-2 flex-shrink-0 relative" ref={adblockRef}>
                  {deviceType === 'android' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open('https://telegra.ph/Cách-Cài-Trình-Chặn-Quảng-Cáo-Trên-Android-07-20', '_blank')}
                      className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800 hover:from-green-100 hover:to-emerald-100 dark:hover:from-green-900/30 dark:hover:to-emerald-900/30 text-green-700 dark:text-green-400 shadow-sm relative group animate-pulse hover:animate-none w-fit"
                      title="Hướng dẫn cài đặt trình chặn quảng cáo trên Android"
                    >
                      <Shield className="h-4 w-4 md:mr-1.5" />
                      <span className="hidden md:inline text-xs font-medium">Hướng Dẫn Android</span>
                      <span className="md:hidden text-xs font-medium">Ad</span>
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowAdblockGuide(!showAdblockGuide)}
                        className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800 hover:from-green-100 hover:to-emerald-100 dark:hover:from-green-900/30 dark:hover:to-emerald-900/30 text-green-700 dark:text-green-400 shadow-sm relative group animate-pulse hover:animate-none w-fit"
                        title="Hướng dẫn cài đặt Adblock cho máy tính - Xem anime không quảng cáo"
                      >
                        <Shield className="h-4 w-4 md:mr-1.5" />
                        <span className="hidden md:inline text-xs font-medium">Trình Chặn Quảng Cáo</span>
                        <span className="md:hidden text-xs font-medium">Ad</span>
                        <ChevronDown className={`h-3 w-3 md:ml-1 transition-transform duration-200 ${showAdblockGuide ? 'rotate-180' : ''}`} />
                      </Button>
                      
                      {showAdblockGuide && (
                        <div className="absolute top-full right-0 mt-2 z-50 w-fit max-w-80 bg-white dark:bg-gray-900 border border-green-200 dark:border-green-800 rounded-lg shadow-xl p-4">
                          <div className="text-sm space-y-3">
                            <div className="flex items-center gap-2 pb-2 border-b border-green-100 dark:border-green-800">
                              <Shield className="h-4 w-4 text-green-600 dark:text-green-400" />
                              <span className="font-medium text-green-700 dark:text-green-400">
                                Hướng dẫn cài Adblock (PC)
                              </span>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-3">
                                Cài đặt trình chặn quảng cáo để xem anime không bị quảng cáo làm phiền:
                              </p>
                              <div className="space-y-2">
                                <a href="https://chromewebstore.google.com/detail/ublock-origin/cjpalhdlnbpafiamejdnhcphjbkeiagm?hl=vi" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
                                  <div className="w-8 h-8 bg-red-500 rounded flex items-center justify-center flex-shrink-0">
                                    <span className="text-xs font-bold text-white">C</span>
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-xs font-medium text-red-700 dark:text-red-300">Google Chrome</p>
                                  </div>
                                  <ExternalLink className="h-3 w-3 text-red-600 dark:text-red-400" />
                                </a>
                                <a href="https://addons.mozilla.org/vi/firefox/addon/ublock-origin/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800 hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors">
                                  <div className="w-8 h-8 bg-orange-500 rounded flex items-center justify-center flex-shrink-0">
                                    <span className="text-xs font-bold text-white">F</span>
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-xs font-medium text-orange-700 dark:text-orange-300">Mozilla Firefox</p>
                                  </div>
                                  <ExternalLink className="h-3 w-3 text-orange-600 dark:text-orange-400" />
                                </a>
                                <a href="https://microsoftedge.microsoft.com/addons/detail/ublock-origin/odfafepnkmbhccpbejgmiehpchacaeak" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
                                  <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center flex-shrink-0">
                                    <span className="text-xs font-bold text-white">E</span>
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-xs font-medium text-blue-700 dark:text-blue-300">Microsoft Edge</p>
                                  </div>
                                  <ExternalLink className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                                </a>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

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
