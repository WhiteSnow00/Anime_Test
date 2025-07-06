"use client";

import { memo, useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { useViewport } from '@/hooks/use-viewport';
import { withPerformanceOptimization, withErrorBoundary } from '@/lib/higher-order-components';
import { fp, performanceUtils } from '@/lib/advanced-utils';

interface VideoPlayerProps {
  videoId: string;
  autoPlay?: boolean;
  muted?: boolean;
  controls?: boolean;
  onLoad?: () => void;
  onError?: (error: string) => void;
  className?: string;
}

function VideoPlayerComponent({ 
  videoId,
  autoPlay = false,
  muted = false,
  controls = true,
  onLoad,
  onError,
  className 
}: VideoPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const viewport = useViewport();
  const [isHydrated, setIsHydrated] = useState(false);

  // Track hydration to avoid hydration mismatch
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Memoized iframe URL with advanced parameters
  const iframeUrl = useMemo(() => {
    const baseUrl = `https://short.icu/${videoId}`;
    
    let quality = 'hd1080'; 
    if (isHydrated && viewport.width > 0) {
      quality = viewport.width > 1920 ? 'hd1080' : viewport.width > 1280 ? 'hd720' : 'medium';
    }
    
    const params = new URLSearchParams({
      autoplay: autoPlay ? '1' : '0',
      muted: muted ? '1' : '0',
      controls: controls ? '1' : '0',
      quality,
    });
    
    return `${baseUrl}?${params.toString()}`;
  }, [videoId, autoPlay, muted, controls, isHydrated, viewport.width]);

  // Advanced iframe load handler with error handling
  const handleIframeLoad = useCallback(
    fp.debounce(() => {
      if (iframeRef.current) {
        onLoad?.();
        console.log(`Video player loaded: ${videoId}`);
      }
    }, 100),
    [videoId, onLoad]
  );

  // Error handling for iframe
  const handleIframeError = useCallback(
    fp.throttle((error: string) => {
      onError?.(error);
      console.error(`Video player error: ${error}`);
    }, 1000),
    [onError]
  );

  // Responsive iframe dimensions - use consistent default to avoid hydration mismatch
  const iframeDimensions = useMemo(() => {
    // Use responsive dimensions only after hydration
    if (isHydrated && viewport.width > 0) {
      const { width, isMobile } = viewport;
      
      if (isMobile) {
        return {
          width: Math.min(width - 32, 800), // Account for padding
          height: Math.floor((width - 32) * 9 / 16), // 16:9 aspect ratio
        };
      }
    }
    return {
      width: 1920,
      height: 1080,
    };
  }, [isHydrated, viewport]);

  useEffect(() => {
    if (!iframeRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            // Player is visible, can perform optimizations
            console.log('Video player is visible');
          } else {
            // Player is not visible, can pause or reduce quality
            console.log('Video player is not visible');
          }
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(iframeRef.current);

    return () => observer.disconnect();
  }, []);

  // Performance monitoring
  const performanceProfiler = useMemo(
    () => performanceUtils.createProfiler('VideoPlayer'),
    []
  );

  useEffect(() => {
    const start = performanceProfiler.start();
    
    return () => {
      performanceProfiler.end(start);
      if (process.env.NODE_ENV === 'development') {
        console.log('VideoPlayer performance stats:', performanceProfiler.getStats());
      }
    };
  }, [performanceProfiler, videoId]);

  // Memoized iframe props for performance
  const iframeProps = useMemo(() => ({
    ref: iframeRef,
    width: iframeDimensions.width,
    height: iframeDimensions.height,
    src: iframeUrl,
    frameBorder: "0",
    scrolling: "no" as const,
    allowFullScreen: true,
    onLoad: handleIframeLoad,
    onError: () => handleIframeError(`Failed to load video: ${videoId}`),
    className: "w-full h-full touch-manipulation",
    style: {
      border: 'none',
      outline: 'none',
    },
    // Enhanced accessibility
    title: `Video player for episode ${videoId}`,
    'aria-label': `Video content for episode ${videoId}`,
  }), [
    videoId,
    iframeDimensions,
    iframeUrl,
    handleIframeLoad,
    handleIframeError,
  ]);

  // Loading state component
  const LoadingOverlay = memo(() => (
    <div className="absolute inset-0 flex items-center justify-center bg-muted/50">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  ));

  return (
    <Card className={`w-full overflow-hidden shadow-lg rounded-lg ${className}`}>
      <div className="aspect-video bg-muted relative">
        <iframe 
          key={videoId} 
          {...iframeProps} 
          suppressHydrationWarning={true}
        />
        
        {/* Enhanced Mobile Controls Overlay - only show after hydration */}
        {isHydrated && viewport.isMobile && (
          <div className="lg:hidden absolute inset-0 pointer-events-none">
            <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-auto">
              {/* Mobile-specific controls can be added here */}
              <div className="bg-black/50 rounded px-2 py-1 text-white text-xs">
                Episode {videoId}
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

// Apply performance optimizations and error boundary
const OptimizedVideoPlayer = withPerformanceOptimization(VideoPlayerComponent);
export const VideoPlayer = withErrorBoundary(OptimizedVideoPlayer);
