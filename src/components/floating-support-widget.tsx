'use client';

import { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
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

  useEffect(() => {
    // Set client flag to true after hydration
    setIsClient(true);
    
    let timeoutId: NodeJS.Timeout;
    
    const handleScroll = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        const currentScrollTop = window.pageYOffset || document.documentElement.scrollTop;
        setScrollTop(currentScrollTop);
      }, 10);
    };

    // Set initial scroll position after client-side hydration
    const initialScrollTop = window.pageYOffset || document.documentElement.scrollTop;
    setScrollTop(initialScrollTop);
    
    // Add scroll listener
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(timeoutId);
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

  // Don't render on server or until client hydration is complete
  if (!isClient) {
    return null;
  }

  return (
    <div
      className={cn(
        "absolute left-0 z-50 group",
        "hidden lg:block", // Only show on desktop/PC
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
      {/* Main Widget Container */}
      <div
        className={cn(
          "relative flex items-center transition-all duration-300 ease-in-out",
          "transform origin-left",
          isExpanded ? "translate-x-0" : "-translate-x-2"
        )}
      >
        {/* Floating Icon Button */}
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
          {/* Animated Star Icon */}
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
          
          {/* Support Text */}
          <div className="text-[10px] font-medium text-center leading-tight vietnamese-text">
            <div>Ủng Hộ</div>
            <div>Nhóm Dịch</div>
          </div>
          
          {/* Pulse Animation Ring */}
          <div 
            className={cn(
              "absolute inset-0 rounded-r-xl border-2 border-pink-300/50",
              "transition-all duration-1000",
              isHovered ? "scale-110 opacity-0" : "scale-100 opacity-100"
            )}
          />
        </div>

        {/* Expanded QR Code Panel */}
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
          {/* Panel Header */}
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

          {/* QR Code Container */}
          <div className="relative bg-white rounded-xl p-4 shadow-inner border border-gray-100">
            <div className="relative w-full aspect-square max-w-[200px] mx-auto">
              <Image
                src="/images/qr.png"
                alt="QR Code ủng hộ nhóm dịch"
                width={200}
                height={200}
                className="object-contain rounded-lg"
                priority
                unoptimized
              />
            </div>
          </div>

          {/* Instructions */}
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500 vietnamese-text leading-relaxed">
              Cảm ơn bạn đã ủng hộ nhóm!<br />
              Mọi đóng góp đều giúp cải thiện chất lượng bản dịch
            </p>
          </div>

          {/* Decorative Elements */}
          <div className="absolute -top-2 -right-2 w-4 h-4 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full opacity-60" />
          <div className="absolute -bottom-2 -left-2 w-3 h-3 bg-gradient-to-br from-purple-400 to-pink-500 rounded-full opacity-60" />
        </div>
      </div>

      {/* Background Overlay (subtle) */}
      {isExpanded && (
        <div 
          className="fixed inset-0 bg-black/5 backdrop-blur-[1px] pointer-events-none -z-10"
          style={{ animation: 'fadeIn 0.3s ease-in-out' }}
        />
      )}
    </div>
  );
}

// Add custom keyframes for animations
const styles = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}
