"use client";

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const updateDropdownPosition = () => {
    const trigger = adblockRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const top = rect.bottom + window.scrollY + 8; // 8px gap
    const left = rect.right + window.scrollX; // align right edge
    setDropdownPos({ top, left, width: rect.width });
  };

  // Detect device type (desktop, android, ios)
  useEffect(() => {
    const checkDeviceType = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isSmallScreen = window.innerWidth <= 768;
      
      if (/android/.test(userAgent)) {
        setDeviceType('android');
      } else if (/iphone|ipad|ipod/.test(userAgent) || 
                 (userAgent.includes('safari') && userAgent.includes('mobile') && !userAgent.includes('android') && !userAgent.includes('chrome'))) {
        setDeviceType('ios');
      } else if (isSmallScreen && /chrome|firefox|opera|samsung/.test(userAgent) && !userAgent.includes('safari')) {
        setDeviceType('android');
      } else {
        setDeviceType('desktop');
      }
    };

    checkDeviceType();
    window.addEventListener('resize', checkDeviceType);
    return () => window.removeEventListener('resize', checkDeviceType);
  }, []);

  // Close dropdown when clicking outside (supports portal dropdown)
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const insideTrigger = adblockRef.current?.contains(target) ?? false;
      const insideDropdown = dropdownRef.current?.contains(target) ?? false;
      if (!insideTrigger && !insideDropdown) {
        setShowAdblockGuide(false);
      }
    }

    if (showAdblockGuide) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('resize', updateDropdownPosition);
      window.addEventListener('scroll', updateDropdownPosition, { passive: true });
      updateDropdownPosition();
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        window.removeEventListener('resize', updateDropdownPosition);
        window.removeEventListener('scroll', updateDropdownPosition);
      };
    }
  }, [showAdblockGuide]);

  useEffect(() => {
    setIsHydrated(true);
    
    // Check if notification should be shown
    const checkNotificationStatus = () => {
      try {
        const dismissedAt = localStorage.getItem('notification-dismissed-at');
        
        if (!dismissedAt) {
          setIsVisible(true);
          setTimeout(() => setIsAnimated(true), 100);
          return;
        }
        
        const dismissedTime = new Date(dismissedAt);
        const now = new Date();
        const hoursSinceDismissed = (now.getTime() - dismissedTime.getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceDismissed >= 24) {
          setIsVisible(true);
          setTimeout(() => setIsAnimated(true), 100);
        } else {
          setIsVisible(false);
        }
        
      } catch (error) {
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
    <div className={cn("w-full top-0 relative select-none", className)}> 
      <div className={cn(
        "transition-all duration-500 ease-out",
        isAnimated ? "opacity-100 translate-y-0 scale-100" : "opacity-0 -translate-y-4 scale-95" // Thêm scale animation
      )}>
        <Card className="bg-gradient-to-r from-pink-100 via-purple-100 to-pink-100 dark:from-pink-900/30 dark:via-purple-900/30 dark:to-pink-900/30 border-pink-300/70 dark:border-pink-700/70 shadow-xl backdrop-blur-md overflow-visible relative hover:shadow-2xl transition-shadow duration-300"> 
          <div className="absolute inset-0 bg-gradient-to-r from-pink-200/40 via-transparent to-purple-200/40 dark:from-pink-800/20 dark:via-transparent dark:to-purple-800/20" />
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500 animate-pulse rounded-lg" />
          
          <div className="relative p-3 sm:p-5">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="flex-shrink-0 relative">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-pink-200 to-purple-200 dark:from-pink-800/60 dark:to-purple-800/60 rounded-full flex items-center justify-center shadow-lg animate-glow"> {/* Thêm glow animation */}
                  <Pin className="h-5 w-5 sm:h-6 sm:w-6 text-pink-700 dark:text-pink-300 animate-pulse" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-3">
                  <Badge className="bg-gradient-to-r from-pink-600 to-purple-600 text-white border-0 shadow-md animate-pulse"> {/* Pulse badge */}
                    <Sparkles className="h-3 w-3 mr-1" />
                    Thông báo 
                  </Badge>
                  <div className="flex-1 h-px bg-gradient-to-r from-pink-300 to-transparent dark:from-pink-700 dark:to-transparent" />
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-pink-200 dark:bg-pink-800/60 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                      <Tv className="h-3 w-3 text-pink-700 dark:text-pink-300" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm sm:text-base font-semibold text-foreground vietnamese-text leading-relaxed"> {/* Bold text */}
                        Phim Sẽ Ra Tập Mới Vào{' '}
                        <span className="font-extrabold text-pink-700 dark:text-pink-300 bg-pink-200 dark:bg-pink-800/40 px-2 py-0.5 rounded-md whitespace-nowrap shadow-sm">
                          10h30 Tối Thứ 7
                        </span>{' '}
                        Hàng Tuần
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 bg-purple-200 dark:bg-purple-800/60 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                      <Globe className="h-3 w-3 text-purple-700 dark:text-purple-300" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm sm:text-base font-semibold text-foreground vietnamese-text leading-relaxed">
                        Bản Dịch Sẽ Có Mặt Tại Web Vào Tầm{' '}
                        <span className="font-extrabold text-purple-700 dark:text-purple-300 bg-purple-200 dark:bg-purple-800/40 px-2 py-0.5 rounded-md whitespace-nowrap shadow-sm">
                          Thứ 4 - Thứ 6
                        </span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4">
                  <div className="p-3 bg-white/60 dark:bg-gray-900/30 rounded-lg border border-pink-200 dark:border-pink-800/40 shadow-inner">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 text-xs sm:text-sm text-muted-foreground">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-pink-600 flex-shrink-0" />
                        <span className="vietnamese-text">Lịch phát sóng cố định (hoặc không)</span>
                      </div>
                      <div className="hidden sm:block w-px h-3 bg-pink-300 dark:bg-pink-700" />
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600 flex-shrink-0" />
                        <span className="vietnamese-text">Cập nhật đều đặn hàng tuần (hoặc không)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {deviceType !== 'ios' && (
                <div className="flex flex-col items-center gap-2 flex-shrink-0 relative" ref={adblockRef}>
                  {deviceType === 'android' ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open('https://telegra.ph/Cách-Cài-Trình-Chặn-Quảng-Cáo-Trên-Android-07-20', '_blank')}
                      className="bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-800/30 dark:to-emerald-800/30 border-green-300 dark:border-green-700 hover:from-green-200 hover:to-emerald-200 dark:hover:from-green-800/40 dark:hover:to-emerald-800/40 text-green-800 dark:text-green-300 shadow-md relative group animate-pulse hover:animate-none w-fit" // Tăng tương phản
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
                        className="bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-800/30 dark:to-emerald-800/30 border-green-300 dark:border-green-700 hover:from-green-200 hover:to-emerald-200 dark:hover:from-green-800/40 dark:hover:to-emerald-800/40 text-green-800 dark:text-green-300 shadow-md relative group animate-pulse hover:animate-none w-fit"
                        title="Hướng dẫn cài đặt Adblock cho máy tính - Xem anime không quảng cáo"
                      >
                        <Shield className="h-4 w-4 md:mr-1.5" />
                        <span className="hidden md:inline text-xs font-medium">Trình Chặn Quảng Cáo</span>
                        <span className="md:hidden text-xs font-medium">Ad</span>
                        <ChevronDown className={`h-3 w-3 md:ml-1 transition-transform duration-200 ${showAdblockGuide ? 'rotate-180' : ''}`} />
                      </Button>
                      
                      {showAdblockGuide && dropdownPos && typeof document !== 'undefined' &&
                        createPortal(
                          <div
                            ref={dropdownRef}
                            className="fixed z-[999999] bg-white dark:bg-gray-900 border border-green-300 dark:border-green-700 rounded-lg shadow-2xl p-4 animate-fadeIn box-border"
                            style={{ top: dropdownPos.top, left: dropdownPos.left, transform: 'translateX(-100%)', width: dropdownPos.width }}
                          >
                            <div className="text-sm space-y-2">
                              <div className="flex items-center gap-2 pb-2 border-b border-green-200 dark:border-green-700">
                                <Shield className="h-4 w-4 text-green-700 dark:text-green-300" />
                                <span className="font-medium text-green-800 dark:text-green-300">
                                  Hướng dẫn cài Adblock (PC)
                                </span>
                              </div>
                              <div>
                                <p className="text-xs text-muted-foreground mb-3">
                                  Cài đặt trình chặn quảng cáo để xem anime không bị quảng cáo làm phiền:
                                </p>
                                <div className="space-y-2">
                                  <a href="https://chromewebstore.google.com/detail/ublock-origin/cjpalhdlnbpafiamejdnhcphjbkeiagm?hl=vi" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-red-100 dark:bg-red-800/30 rounded-lg border border-red-300 dark:border-red-700 hover:bg-red-200 dark:hover:bg-red-800/40 transition-colors">
                                    <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center flex-shrink-0">
                                      <span className="text-xs font-bold text-white">C</span>
                                    </div>
                                    <div className="flex-1">
                                      <p className="text-xs font-medium text-red-800 dark:text-red-200">Google Chrome</p>
                                    </div>
                                    <ExternalLink className="h-3 w-3 text-red-700 dark:text-red-300" />
                                  </a>
                                  <a href="https://addons.mozilla.org/vi/firefox/addon/ublock-origin/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-orange-100 dark:bg-orange-800/30 rounded-lg border border-orange-300 dark:border-orange-700 hover:bg-orange-200 dark:hover:bg-orange-800/40 transition-colors">
                                    <div className="w-8 h-8 bg-orange-600 rounded flex items-center justify-center flex-shrink-0">
                                      <span className="text-xs font-bold text-white">F</span>
                                    </div>
                                    <div className="flex-1">
                                      <p className="text-xs font-medium text-orange-800 dark:text-orange-200">Mozilla Firefox</p>
                                    </div>
                                    <ExternalLink className="h-3 w-3 text-orange-700 dark:text-orange-300" />
                                  </a>
                                  <a href="https://microsoftedge.microsoft.com/addons/detail/ublock-origin/odfafepnkmbhccpbejgmiehpchacaeak" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 p-2 bg-blue-100 dark:bg-blue-800/30 rounded-lg border border-blue-300 dark:border-blue-700 hover:bg-blue-200 dark:hover:bg-blue-800/40 transition-colors">
                                    <div className="w-8 h-8 bg-blue-700 rounded flex items-center justify-center flex-shrink-0">
                                      <span className="text-xs font-bold text-white">E</span>
                                    </div>
                                    <div className="flex-1">
                                      <p className="text-xs font-medium text-blue-800 dark:text-blue-200">Microsoft Edge</p>
                                    </div>
                                    <ExternalLink className="h-3 w-3 text-blue-700 dark:text-blue-300" />
                                  </a>
                                </div>
                              </div>
                            </div>
                          </div>,
                          document.body
                        )}
                    </>
                  )}
                </div>
              )}

              <Button
                variant="ghost"
                size="sm"
                onClick={handleClose}
                className="flex-shrink-0 h-8 w-8 p-0 hover:bg-pink-200 dark:hover:bg-pink-800/50 rounded-full transition-all duration-200 hover:scale-110"
                title="Ẩn thông báo trong 24 giờ"
              >
                <X className="h-4 w-4 text-muted-foreground hover:text-pink-700" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}