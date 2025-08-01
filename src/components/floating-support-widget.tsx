'use client';

import { useState, useCallback, useEffect } from 'react';
import { Star, Gift, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FloatingSupportWidgetProps {
  className?: string;
}

export function FloatingSupportWidget({ className }: FloatingSupportWidgetProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);
  const [isClient, setIsClient] = useState(false);
  const [qrImageSrc, setQrImageSrc] = useState('https://stash.del4yowo.id.vn/qr.png');
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadTimeout, setLoadTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setIsClient(true);
    
    const initializeQRImage = async () => {
      const primaryAvailable = await testImageAvailability('https://stash.del4yowo.id.vn/qr.png', 3000);
      
      if (!primaryAvailable) {
        console.log('Primary QR image not available, using fallback immediately');
        setImageError(true);
        setQrImageSrc('https://i.ibb.co/v4MMFJcN/qr.png');
      }
      setIsLoading(false);
    };

    initializeQRImage();
    
    const preloadImage = () => {
      const primaryLink = document.createElement('link');
      primaryLink.rel = 'preload';
      primaryLink.as = 'image';
      primaryLink.href = 'https://stash.del4yowo.id.vn/qr.png';
      primaryLink.crossOrigin = 'anonymous';
      document.head.appendChild(primaryLink);

      const fallbackLink = document.createElement('link');
      fallbackLink.rel = 'preload';
      fallbackLink.as = 'image';
      fallbackLink.href = 'https://i.ibb.co/v4MMFJcN/qr.png';
      fallbackLink.crossOrigin = 'anonymous';
      document.head.appendChild(fallbackLink);
    };
    
    const preloadTimeout = setTimeout(preloadImage, 100);
    
    let timeoutId: NodeJS.Timeout;
    
    const handleScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const currentScrollTop = window.pageYOffset || document.documentElement.scrollTop;
        setScrollTop(currentScrollTop);
      }, 10);
    };

    const initialScrollTop = window.pageYOffset || document.documentElement.scrollTop;
    setScrollTop(initialScrollTop);
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(timeoutId);
      clearTimeout(preloadTimeout);
      if (loadTimeout) {
        clearTimeout(loadTimeout);
      }
    };
  }, []);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    setIsExpanded(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setIsExpanded(false);
  }, []);

  const handleImageError = useCallback(() => {
    if (!imageError) {
      console.log('Primary QR image failed, switching to fallback');
      setImageError(true);
      setQrImageSrc('https://i.ibb.co/v4MMFJcN/qr.png');
      setIsLoading(false);
      if (loadTimeout) {
        clearTimeout(loadTimeout);
        setLoadTimeout(null);
      }
    }
  }, [imageError, loadTimeout]);

  const handleImageLoad = useCallback(() => {
    setIsLoading(false);
    if (loadTimeout) {
      clearTimeout(loadTimeout);
      setLoadTimeout(null);
    }
  }, [loadTimeout]);

  const switchToFallback = useCallback(() => {
    if (!imageError) {
      console.log('Primary QR image timeout or connectivity issue, switching to fallback');
      setImageError(true);
      setQrImageSrc('https://i.ibb.co/v4MMFJcN/qr.png');
      setIsLoading(false);
    }
  }, [imageError]);

  const testImageAvailability = useCallback((url: string, timeout: number = 5000): Promise<boolean> => {
    return new Promise((resolve) => {
      const img = new Image();
      const timeoutId = setTimeout(() => {
        img.onload = null;
        img.onerror = null;
        resolve(false);
      }, timeout);

      img.onload = () => {
        clearTimeout(timeoutId);
        resolve(true);
      };
      
      img.onerror = () => {
        clearTimeout(timeoutId);
        resolve(false);
      };

      img.src = url;
    });
  }, []);

  if (!isClient) {
    return null;
  }

  return (
    <div
      className={cn(
        "absolute left-0 z-50 group",
        "hidden lg:block",
        className
      )}
      style={{
        top: `${scrollTop + (window.innerHeight / 2)}px`,
        transform: 'translateY(-50%)',
        transition: 'top 0.3s ease-out'
      }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className={cn(
          "relative flex items-center transition-all duration-300 ease-in-out",
          "transform origin-left",
          isExpanded ? "translate-x-0" : "-translate-x-2"
        )}
      >
        <div
          className={cn(
            "relative bg-gradient-to-br from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700",
            "text-white p-2 rounded-r-xl shadow-lg hover:shadow-xl",
            "transition-all duration-300 ease-in-out cursor-pointer",
            "border-2 border-white/20 backdrop-blur-sm",
            "min-w-[2.5rem] flex flex-col items-center justify-center gap-1",
            isHovered && "scale-105 shadow-2xl"
          )}
          role="button"
          tabIndex={0}
          aria-label="Ủng hộ nhóm dịch"
        >
          <div className="relative">
            <Star 
              className={cn(
                "w-5 h-5 transition-all duration-300",
                isHovered ? "fill-current animate-pulse scale-110" : "fill-current"
              )} 
            />
            {isHovered && (
              <Sparkles className="absolute -top-1 -right-1 w-3 h-3 text-yellow-300 animate-spin" />
            )}
          </div>
          
          <div className="text-[10px] font-medium text-center leading-tight vietnamese-text">
            <div>Ủng Hộ</div>
            <div>Nhóm Dịch</div>
          </div>
          
          <div 
            className={cn(
              "absolute inset-0 rounded-r-xl border-2 border-pink-300/50",
              "transition-all duration-1000",
              isHovered ? "scale-110 opacity-0" : "scale-100 opacity-100"
            )}
          />
        </div>

        <div
          className={cn(
            "absolute left-full top-1/2 -translate-y-1/2",
            "bg-white/95 backdrop-blur-md rounded-2xl shadow-2xl",
            "border border-pink-200/50 p-6 ml-2",
            "transition-all duration-300 ease-in-out origin-left",
            "min-w-[280px]",
            isExpanded 
              ? "opacity-100 scale-100 translate-x-0 visible" 
              : "opacity-0 scale-95 translate-x-4 invisible"
          )}
        >
          <div className="text-center mb-4">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Gift className="w-5 h-5 text-pink-600" />
              <h3 className="text-lg font-bold text-gray-800 vietnamese-text">
                Ủng Hộ Nhóm Dịch
              </h3>
              <Gift className="w-5 h-5 text-pink-600" />
            </div>
            <p className="text-sm text-gray-600 vietnamese-text leading-relaxed">
              Quét mã QR để ủng hộ KanaFansub
            </p>
          </div>

          <div 
            className="relative bg-white rounded-xl p-4 shadow-inner border border-gray-100 select-none"
            onContextMenu={(e) => e.preventDefault()}
            style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
          >
            <div className="relative w-full aspect-square max-w-[200px] mx-auto">
              {isLoading && !imageError && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-500"></div>
                </div>
              )}
              <img
                src={qrImageSrc}
                alt="QR Code ủng hộ nhóm dịch"
                width={200}
                height={200}
                className={cn(
                  "object-contain rounded-lg w-full h-full select-none transition-opacity duration-300",
                  isLoading && !imageError ? "opacity-0" : "opacity-100"
                )}
                style={{ 
                  maxWidth: '200px', 
                  maxHeight: '200px',
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                  pointerEvents: 'none'
                }}
                onContextMenu={(e) => e.preventDefault()}
                onDragStart={(e) => e.preventDefault()}
                onError={handleImageError}
                onLoad={handleImageLoad}
                loading="eager"
                fetchPriority="high"
                decoding="sync"
              />
            </div>
          </div>

          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500 vietnamese-text leading-relaxed">
              Cảm ơn bạn đã ủng hộ nhóm!<br />
              Mọi đóng góp đều giúp cải thiện chất lượng bản dịch
            </p>
          </div>

          <div className="absolute -top-2 -right-2 w-4 h-4 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full opacity-60" />
          <div className="absolute -bottom-2 -left-2 w-3 h-3 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full opacity-60" />
        </div>
      </div>

      {isExpanded && (
        <div 
          className="fixed inset-0 bg-black/5 backdrop-blur-[1px] pointer-events-none -z-10"
          style={{ animation: 'fadeIn 0.3s ease-in-out' }}
        />
      )}
    </div>
  );
}

const styles = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}