"use client";

import { memo, useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { useViewport } from '@/hooks/use-viewport';
import { useVideoTransition } from '@/hooks/use-video-transition';
import { withPerformanceOptimization, withErrorBoundary } from '@/lib/higher-order-components';
import { fp, performanceUtils } from '@/lib/advanced-utils';
import { Loader2, Play, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ServerType = 'hydax' | 'mxdrop';

interface VideoPlayerProps {
  videoId: string;
  server?: ServerType;
  autoPlay?: boolean;
  muted?: boolean;
  controls?: boolean;
  onLoad?: () => void;
  onError?: (error: string) => void;
  episodeTitle?: string;
  className?: string;
}

function VideoPlayerComponent({ 
  videoId,
  server = 'hydax',
  autoPlay = false,
  muted = false,
  controls = true,
  onLoad,
  onError,
  episodeTitle = 'Episode',
  className 
}: VideoPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const viewport = useViewport();
  const [isHydrated, setIsHydrated] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Use video transition hook for smooth episode switching
  const {
    state: transitionState,
    actions: transitionActions,
    styles: transitionStyles,
    computed: transitionComputed,
  } = useVideoTransition(videoId, {
    transitionDuration: 300,
    loadingDelay: 150,
    fadeInDuration: 250,
    preloadNext: true,
  });

  // Track hydration to avoid hydration mismatch
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Memoized iframe URL with advanced parameters
  const iframeUrl = useMemo(() => {
    const currentVideoId = transitionComputed.currentVideoId || videoId;
    
    if (server === 'mxdrop') {
      // MxDrop server URL
      return `//mxdrop.to/e/${currentVideoId}`;
    }
    
    // Hydax server URL (default)
    const baseUrl = `https://short.icu/${currentVideoId}`;
    
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
  }, [transitionComputed.currentVideoId, server, autoPlay, muted, controls, isHydrated, viewport.width]);

  // Advanced iframe load handler with transition state management
  const handleIframeLoad = useCallback(
    fp.debounce(() => {
      if (iframeRef.current) {
        setLoadError(null);
        onLoad?.();
        console.log(`Video player loaded: ${transitionComputed.currentVideoId}`);
        // Complete transition when iframe loads
        if (transitionState.isTransitioning) {
          setTimeout(() => transitionActions.completeTransition(), 100);
        }
      }
    }, 200),
    [transitionComputed.currentVideoId, transitionState.isTransitioning, transitionActions, onLoad]
  );

  // Error handling for iframe with transition state management
  const handleIframeError = useCallback(
    fp.throttle((error: string) => {
      setLoadError(error);
      onError?.(error);
      console.error(`Video player error: ${error}`);
      // Reset transition on error
      transitionActions.resetTransition();
    }, 1000),
    [onError, transitionActions]
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

  // Performance monitoring with transition tracking
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
        console.log('Transition state:', transitionState.transitionPhase);
      }
    };
  }, [performanceProfiler, videoId, transitionState.transitionPhase]);

  // Memoized iframe props for performance with transition support
  const iframeProps = useMemo(() => ({
    ref: iframeRef,
    width: iframeDimensions.width,
    height: iframeDimensions.height,
    src: iframeUrl,
    frameBorder: "0",
    scrolling: "no" as const,
    allowFullScreen: true,
    allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",
    onLoad: handleIframeLoad,
    onError: () => handleIframeError(`Failed to load video: ${videoId}`),
    className: "w-full h-full touch-manipulation",
    style: {
      border: 'none',
      outline: 'none',
      ...transitionStyles.getTransitionStyles(),
    },
    // Enhanced accessibility
    title: `Video player for ${episodeTitle}`,
    'aria-label': `Video content for ${episodeTitle}`,
  }), [
    videoId,
    episodeTitle,
    iframeDimensions,
    iframeUrl,
    handleIframeLoad,
    handleIframeError,
    transitionStyles,
  ]);

  // Enhanced loading overlay component with transition support
  const LoadingOverlay = memo(() => {
    const overlayProps = transitionStyles.getLoadingOverlayProps();
    
    if (!overlayProps.isVisible && !transitionComputed.shouldShowLoader) {
      return null;
    }

    return (
      <div 
        className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-10"
        style={{
          opacity: overlayProps.opacity,
          transition: overlayProps.transition,
        }}
      >
        <div className="flex flex-col items-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <div className="text-sm text-muted-foreground">
            Loading {episodeTitle}...
          </div>
          {transitionState.transitionPhase !== 'idle' && (
            <div className="w-24 h-1 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300 ease-out"
                style={{ width: `${transitionComputed.transitionProgress}%` }}
              />
            </div>
          )}
        </div>
      </div>
    );
  });

  LoadingOverlay.displayName = 'LoadingOverlay';

  return (
    <Card className={cn("w-full overflow-hidden shadow-lg rounded-lg transition-all duration-300", className)}>
      <div 
        className={cn(
          "aspect-video bg-muted relative",
          transitionStyles.getContainerClasses()
        )}
      >
        {/* Enhanced Loading Overlay */}
        <LoadingOverlay />
        
        {/* Error State */}
        {loadError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-destructive/10 z-20">
            <AlertCircle className="h-12 w-12 text-destructive mb-2" />
            <p className="text-sm text-destructive text-center px-4">
              Failed to load video
            </p>
            <button
              onClick={() => {
                setLoadError(null);
                transitionActions.resetTransition();
              }}
              className="mt-2 px-3 py-1 bg-destructive text-destructive-foreground rounded text-xs hover:bg-destructive/90 transition-colors"
            >
              Retry
            </button>
          </div>
        )}
        
        {/* Video iframe with smooth transitions */}
        <iframe 
          key={`${server}-${transitionComputed.currentVideoId}`} 
          {...iframeProps} 
          suppressHydrationWarning={true}
        />
      </div>
    </Card>
  );
}

// Apply performance optimizations and error boundary
const OptimizedVideoPlayer = withPerformanceOptimization(VideoPlayerComponent);
export const VideoPlayer = withErrorBoundary(OptimizedVideoPlayer);
