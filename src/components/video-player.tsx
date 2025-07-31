"use client";

import { memo, useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { useViewport } from '@/hooks/use-viewport';
import { useVideoTransition } from '@/hooks/use-video-transition';
import { withPerformanceOptimization, withErrorBoundary } from '@/lib/higher-order-components';
import { fp, performanceUtils } from '@/lib/advanced-utils';
import { Loader2, Play, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { JWPlayerComponent } from './jwplayer';
import { 
  generateVideoUrl, 
  findBestServer, 
  recordServerError, 
  getErrorMessage,
  getNextFallbackServer,
  createIframeErrorDetector,
  validateEpisodeServers,
  getBestAvailableServer,
  updateServerStatus,
  ServerType as VideoServerType 
} from '@/lib/video-server-utils';

export type ServerType = 'hls' | 'helvid' | 'hydax';

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
  server = 'hls',
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
  const [currentServer, setCurrentServer] = useState<ServerType>(server);
  const [triedServers, setTriedServers] = useState<ServerType[]>([]);
  const [retryCount, setRetryCount] = useState(0);
  const serverPropRef = useRef<ServerType>(server);
  const isInternalServerChange = useRef<boolean>(false);

  // Function to convert any video ID format to HLS format (m3u8 filename)
  const getHLSVideoId = useCallback((inputVideoId: string) => {
    // If it's already in HLS format (contains .m3u8), return as is
    if (inputVideoId.includes('.m3u8')) {
      return inputVideoId;
    }
    
    // Map from episode number to HLS filename
    const episodeToHLS: { [key: string]: string } = {
      '01': 'kanasub-01.m3u8',
      '02': 'kanasub-02.m3u8', 
      '03': 'kanasub-03.m3u8',
      '04': 'kanasub-04.m3u8'
    };
    
    // If the input is a simple episode number (01, 02, etc.)
    if (episodeToHLS[inputVideoId]) {
      return episodeToHLS[inputVideoId];
    }
    
    // If the input is a server-specific ID, try to map it back to episode number
    const serverIdToEpisode: { [key: string]: string } = {
      // Helvid server IDs
      '8c8edb8924a8': '01',
      '34ebbd8b7a07': '02', 
      '50909806cf25': '03',
      '28b0a006506a': '04',
      // Hydax server IDs  
      'AkqMUVl6B': '01',
      'ubMg6Vlex': '02',
      'dibBTjuqH': '03', 
      'p_BMmjguS': '04'
    };
    
    const episodeNumber = serverIdToEpisode[inputVideoId];
    if (episodeNumber && episodeToHLS[episodeNumber]) {
      console.log(`Converted server ID ${inputVideoId} to HLS: ${episodeToHLS[episodeNumber]}`);
      return episodeToHLS[episodeNumber];
    }
    
    // Fallback: assume it's episode 01 if we can't determine
    console.warn(`Could not determine HLS filename for videoId: ${inputVideoId}, defaulting to kanasub-01.m3u8`);
    return 'kanasub-01.m3u8';
  }, []);

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

  // Sync internal currentServer state with server prop changes
  useEffect(() => {
    // Only sync if the server prop actually changed (not internal fallback changes)
    if (server !== serverPropRef.current && !isInternalServerChange.current) {
      console.log(`VideoPlayer: Switching server from ${currentServer} to ${server}`);
      serverPropRef.current = server;
      
      // Clear any existing errors immediately
      setLoadError(null);
      setTriedServers([]);
      setRetryCount(0);
      
      // If switching to HLS from external server, add small delay to prevent flicker
      if (server === 'hls' && (currentServer === 'helvid' || currentServer === 'hydax')) {
        // Brief loading state to mask the transition
        transitionActions.startTransition();
        setTimeout(() => {
          setCurrentServer(server);
          setTimeout(() => transitionActions.completeTransition(), 100);
        }, 150);
      } else {
        // Immediate switch for other transitions
        setCurrentServer(server);
      }
    }
    // Reset the internal change flag
    isInternalServerChange.current = false;
  }, [server, currentServer, transitionActions]);

  // Track hydration to avoid hydration mismatch
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Memoized iframe URL with advanced parameters (for non-HLS servers)
  const iframeUrl = useMemo(() => {
    if (currentServer === 'hls') return ''; // HLS uses JWPlayer component, not iframe
    
    const currentVideoId = transitionComputed.currentVideoId || videoId;
    
    // Get episode data to extract the correct server ID
    const episodeData = {
      servers: {
        helvid: currentVideoId === '01' ? '8c8edb8924a8' : 
                 currentVideoId === '02' ? '34ebbd8b7a07' :
                 currentVideoId === '03' ? '50909806cf25' :
                 currentVideoId === '04' ? '28b0a006506a' : currentVideoId,
        hydax: currentVideoId === '01' ? 'AkqMUVl6B' :
               currentVideoId === '02' ? 'ubMg6Vlex' :
               currentVideoId === '03' ? 'dibBTjuqH' :
               currentVideoId === '04' ? 'p_BMmjguS' : currentVideoId
      }
    };
    
    let videoUrl = '';
    if (currentServer === 'helvid') {
      videoUrl = `https://helvid.net/play/index/${episodeData.servers.helvid}`;
    } else if (currentServer === 'hydax') {
      videoUrl = `https://short.icu/${episodeData.servers.hydax}`;
    }
    
    console.log(`Generated iframe URL for ${currentServer}: ${videoUrl}`);
    return videoUrl;
  }, [transitionComputed.currentVideoId, currentServer, videoId]);

  // Advanced iframe load handler with transition state management
  const handleIframeLoad = useCallback(
    fp.debounce(() => {
      if (iframeRef.current) {
        setLoadError(null);
        onLoad?.();
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
      console.error(`Video player error: ${error}`);
      
      setLoadError(error);
      onError?.(error);
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
          } else {
            // Player is not visible, can pause or reduce quality
          }
        });
      },
      { threshold: 0.5 }
    );

    observer.observe(iframeRef.current);

    return () => observer.disconnect();
  }, []);
  
  // Retry logic with fallback server
  useEffect(() => {
    // Only process actual load errors from iframe
    if (loadError && loadError.includes('Failed to load video:')) {
      const errorDetails = {
        server: currentServer,
        error: loadError,
        timestamp: Date.now(),
        episodeId: parseInt(videoId),
        retryCount: retryCount,
      };

      recordServerError(errorDetails);

      // Get error message for user
      const userErrorMessage = getErrorMessage(errorDetails);
      console.log('Video load error:', userErrorMessage);

      // Try fallback server after a delay
      const timeoutId = setTimeout(async () => {
        const nextServer = getNextFallbackServer(currentServer, triedServers);
        if (nextServer) {
          console.log(`Switching from ${currentServer} to ${nextServer} due to error`);
          const newTriedServers = [...triedServers, currentServer];
          setTriedServers(newTriedServers);
          // Mark this as an internal server change to prevent sync loop
          isInternalServerChange.current = true;
          setCurrentServer(nextServer);
          setLoadError(null);  // clear error to retry loading
          setRetryCount(retryCount + 1);
        } else {
          console.error('No available servers left to try.');
          // Show permanent error state
        }
      }, 2000); // retry delay
      
      return () => clearTimeout(timeoutId);
    }
  }, [loadError, currentServer, triedServers, videoId, retryCount]);
  
  // Reset tried servers when video ID changes
  useEffect(() => {
    setTriedServers([]);
    setRetryCount(0);
    setLoadError(null);
    // Reset server state to match the prop when episode changes
    if (server !== currentServer) {
      console.log(`Episode changed: Resetting server to ${server}`);
      setCurrentServer(server);
      serverPropRef.current = server; // Update ref to prevent sync issues
    }
  }, [videoId, server, currentServer]);
  
  // Reset error when server changes manually
  useEffect(() => {
    setLoadError(null);
    setTriedServers([]);
  }, [server]);

  // Performance monitoring with transition tracking
  const performanceProfiler = useMemo(
    () => performanceUtils.createProfiler('VideoPlayer'),
    []
  );

  useEffect(() => {
    const start = performanceProfiler.start();
    
    return () => {
      performanceProfiler.end(start);
    };
  }, [performanceProfiler, videoId, transitionState.transitionPhase]);

  // Enhanced iframe error detection
  useEffect(() => {
    if (currentServer !== 'hls' && iframeRef.current && iframeUrl) {
      const cleanup = createIframeErrorDetector(
        iframeRef.current,
        currentServer,
        videoId,
        handleIframeError
      );
      
      return cleanup;
    }
  }, [currentServer, iframeUrl, videoId, handleIframeError]);

  // Memoized iframe props for performance with transition support (only for non-HLS servers)
  const iframeProps = useMemo(() => {
    if (currentServer === 'hls') return {}; // HLS doesn't use iframe
    
    return {
      ref: iframeRef,
      width: iframeDimensions.width,
      height: iframeDimensions.height,
      src: iframeUrl,
      frameBorder: "0",
      scrolling: "no" as const,
      allowFullScreen: true,
      allow: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",
      onLoad: handleIframeLoad,
      onError: () => handleIframeError(`Failed to load video: ${currentServer} - ${videoId}`),
      className: "w-full h-full touch-manipulation",
      style: {
        border: 'none',
        outline: 'none',
        ...transitionStyles.getTransitionStyles(),
      },
      // Enhanced accessibility
      title: `Video player for ${episodeTitle}`,
      'aria-label': `Video content for ${episodeTitle}`,
    };
  }, [
    currentServer,
    videoId,
    episodeTitle,
    iframeDimensions,
    iframeUrl,
    handleIframeLoad,
    handleIframeError,
    transitionStyles,
  ]);

  // Enhanced loading overlay component with mobile-optimized transition support
  const LoadingOverlay = memo(() => {
    const overlayProps = transitionStyles.getLoadingOverlayProps();
    
    if (!overlayProps.isVisible && !transitionComputed.shouldShowLoader) {
      return null;
    }

    // Check if mobile for optimized UI
    const isMobileDevice = viewport.isMobile;

    return (
      <div 
        className={cn(
          "absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-10",
          // Mobile-specific optimizations
          isMobileDevice && "backdrop-blur-none bg-background/90" // Less intensive backdrop blur on mobile
        )}
        style={{
          opacity: overlayProps.opacity,
          transition: overlayProps.transition,
        }}
      >
        <div className={cn(
          "flex flex-col items-center space-y-3",
          isMobileDevice ? "space-y-2" : "space-y-3" // Tighter spacing on mobile
        )}>
          <Loader2 className={cn(
            "animate-spin text-primary",
            isMobileDevice ? "h-6 w-6" : "h-8 w-8" // Smaller spinner on mobile
          )} />
          <div className={cn(
            "text-muted-foreground text-center px-2",
            isMobileDevice ? "text-xs" : "text-sm" // Smaller text on mobile
          )}>
            Đang tải {episodeTitle}...
          </div>
          {transitionState.transitionPhase !== 'idle' && (
            <div className={cn(
              "bg-muted rounded-full overflow-hidden",
              isMobileDevice ? "w-16 h-0.5" : "w-24 h-1" // Smaller progress bar on mobile
            )}>
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
        
        {/* Error State - Mobile Optimized */}
        {loadError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-destructive/10 z-20">
            <AlertCircle className={cn(
              "text-destructive mb-2",
              viewport.isMobile ? "h-8 w-8" : "h-12 w-12"
            )} />
            <p className={cn(
              "text-destructive text-center px-4",
              viewport.isMobile ? "text-xs" : "text-sm"
            )}>
              {viewport.isMobile ? "Lỗi tải video" : "Failed to load video"}
            </p>
            <button
              onClick={() => {
                setLoadError(null);
                transitionActions.resetTransition();
              }}
              className={cn(
                "mt-2 bg-destructive text-destructive-foreground rounded hover:bg-destructive/90 transition-colors",
                viewport.isMobile ? "px-2 py-1 text-xs" : "px-3 py-1 text-xs"
              )}
            >
              {viewport.isMobile ? "Thử lại" : "Retry"}
            </button>
          </div>
        )}
        
        {/* Video player - JWPlayer for HLS, iframe for others */}
        {currentServer === 'hls' ? (
          <JWPlayerComponent
            key={`${currentServer}-${transitionComputed.currentVideoId}`}
            videoId={getHLSVideoId(transitionComputed.currentVideoId || videoId)}
            server={currentServer}
            autoPlay={autoPlay}
            muted={muted}
            controls={controls}
            onLoad={handleIframeLoad}
            onError={handleIframeError}
            className="w-full h-full"
          />
        ) : (
          <iframe 
            key={`${currentServer}-${transitionComputed.currentVideoId}`}
            {...iframeProps} 
            suppressHydrationWarning={true}
          />
        )}
      </div>
    </Card>
  );
}

// Apply performance optimizations and error boundary
const OptimizedVideoPlayer = withPerformanceOptimization(VideoPlayerComponent);
export const VideoPlayer = withErrorBoundary(OptimizedVideoPlayer);
