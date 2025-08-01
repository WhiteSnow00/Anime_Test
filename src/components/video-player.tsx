"use client";

import React, { memo, useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { useViewport } from '@/hooks/use-viewport';
import { useVideoTransition } from '@/hooks/use-video-transition';
import { withPerformanceOptimization, withErrorBoundary } from '@/lib/higher-order-components';
import { performanceUtils } from '@/lib/advanced-utils';
import { Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { JWPlayerComponent } from './jwplayer';
import { 
  recordServerError, 
  getErrorMessage,
  getNextFallbackServer,
  createIframeErrorDetector
} from '@/lib/video-server-utils';
import { animeData } from '@/data/anime';

export type ServerType = 'hls' | 'helvid' | 'hydax';

// Helper function to get episode data by videoId or episode number
const getEpisodeData = (videoId: string) => {
  return animeData.episodes.find(ep => 
    ep.videoId === videoId || 
    ep.id.toString().padStart(2, '0') === videoId ||
    ep.servers.helvid === videoId ||
    ep.servers.hydax === videoId
  );
};

// Utility functions for debouncing and throttling
const debounce = (func: Function, delay: number) => {
  let timeoutId: NodeJS.Timeout;
  return (...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func.apply(null, args), delay);
  };
};

const throttle = (func: Function, delay: number) => {
  let lastCall = 0;
  return (...args: any[]) => {
    const now = new Date().getTime();
    if (now - lastCall < delay) {
      return;
    }
    lastCall = now;
    return func(...args);
  };
};

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

  const getHLSVideoId = useCallback((inputVideoId: string) => {
    if (inputVideoId.includes('.m3u8')) {
      return inputVideoId;
    }
    
    const episodeData = getEpisodeData(inputVideoId);
    if (episodeData?.servers.hls) {
      console.log(`Found HLS for ${inputVideoId}: ${episodeData.servers.hls}`);
      return episodeData.servers.hls;
    }
    
    console.warn(`Could not determine HLS filename for videoId: ${inputVideoId}, defaulting to first episode`);
    return animeData.episodes[0]?.servers.hls || 'kanasub-01.m3u8';
  }, []);

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

  useEffect(() => {
    if (server !== serverPropRef.current && !isInternalServerChange.current) {
      console.log(`VideoPlayer: Switching server from ${currentServer} to ${server}`);
      serverPropRef.current = server;
      
      setLoadError(null);
      setTriedServers([]);
      setRetryCount(0);
      
      if (server === 'hls' && (currentServer === 'helvid' || currentServer === 'hydax')) {
        transitionActions.startTransition(videoId);
        setTimeout(() => {
          setCurrentServer(server);
          setTimeout(() => transitionActions.completeTransition(), 100);
        }, 150);
      } else {
        setCurrentServer(server);
      }
    }
    isInternalServerChange.current = false;
  }, [server, currentServer, transitionActions]);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const iframeUrl = useMemo(() => {
    if (currentServer === 'hls') return '';
    
    const currentVideoId = transitionComputed.currentVideoId || videoId;
    const episodeData = getEpisodeData(currentVideoId);
    const serverId = episodeData?.servers[currentServer];
    
    let videoUrl = '';
    if (currentServer === 'helvid' && serverId) {
      videoUrl = `https://helvid.net/play/index/${serverId}`;
    } else if (currentServer === 'hydax' && serverId) {
      videoUrl = `https://short.icu/${serverId}`;
    }
    
    console.log(`Generated iframe URL for ${currentServer}: ${videoUrl}`);
    return videoUrl;
  }, [transitionComputed.currentVideoId, currentServer, videoId]);

  // Advanced iframe load handler with transition state management
  const handleIframeLoad = useCallback(
    debounce(() => {
      if (iframeRef.current) {
        setLoadError(null);
        onLoad?.();
        if (transitionState.isTransitioning) {
          setTimeout(() => transitionActions.completeTransition(), 100);
        }
      }
    }, 200),
    [transitionComputed.currentVideoId, transitionState.isTransitioning, transitionActions, onLoad]
  );

  const handleIframeError = useCallback(
    throttle((error: string) => {
      console.error(`Video player error: ${error}`);
      
      setLoadError(error);
      onError?.(error);
      transitionActions.resetTransition();
    }, 1000),
    [onError, transitionActions]
  );

  const iframeDimensions = useMemo(() => {
    if (isHydrated && viewport.width > 0) {
      const { width, isMobile } = viewport;
      
      if (isMobile) {
        return {
          width: Math.min(width - 32, 800),
          height: Math.floor((width - 32) * 9 / 16),
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
  
  useEffect(() => {
    if (loadError && loadError.includes('Failed to load video:')) {
      const errorDetails = {
        server: currentServer,
        error: loadError,
        timestamp: Date.now(),
        episodeId: parseInt(videoId),
        retryCount: retryCount,
      };

      recordServerError(errorDetails);

      const userErrorMessage = getErrorMessage(errorDetails);
      console.log('Video load error:', userErrorMessage);

      const timeoutId = setTimeout(async () => {
        const nextServer = getNextFallbackServer(currentServer, triedServers);
        if (nextServer) {
          console.log(`Switching from ${currentServer} to ${nextServer} due to error`);
          const newTriedServers = [...triedServers, currentServer];
          setTriedServers(newTriedServers);
          isInternalServerChange.current = true;
          setCurrentServer(nextServer);
          setLoadError(null);
          setRetryCount(retryCount + 1);
        } else {
          console.error('No available servers left to try.');
        }
      }, 2000);
      
      return () => clearTimeout(timeoutId);
    }
  }, [loadError, currentServer, triedServers, videoId, retryCount]);
  
  // Consolidated effect for handling server and video ID changes
  useEffect(() => {
    setTriedServers([]);
    setRetryCount(0);
    setLoadError(null);
    if (server !== currentServer) {
      console.log(`Episode/Server changed: Resetting server to ${server}`);
      setCurrentServer(server);
      serverPropRef.current = server;
    }
  }, [videoId, server, currentServer]);

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

  const iframeProps = useMemo(() => {
    if (currentServer === 'hls' || !iframeUrl) return {};
    
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

  const LoadingOverlay = memo(() => {
    const overlayProps = transitionStyles.getLoadingOverlayProps();
    
    if (!overlayProps.isVisible && !transitionComputed.shouldShowLoader) {
      return null;
    }

    const isMobileDevice = viewport.isMobile;

    return (
      <div 
        className={cn(
          "absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm z-10",
          isMobileDevice && "backdrop-blur-none bg-background/90"
        )}
        style={{
          opacity: overlayProps.opacity,
          transition: overlayProps.transition,
        }}
      >
        <div className={cn(
          "flex flex-col items-center space-y-3",
          isMobileDevice ? "space-y-2" : "space-y-3"
        )}>
          <Loader2 className={cn(
            "animate-spin text-primary",
            isMobileDevice ? "h-6 w-6" : "h-8 w-8"
          )} />
          <div className={cn(
            "text-muted-foreground text-center px-2",
            isMobileDevice ? "text-xs" : "text-sm"
          )}>
            Đang tải {episodeTitle}...
          </div>
          {transitionState.transitionPhase !== 'idle' && (
            <div className={cn(
              "bg-muted rounded-full overflow-hidden",
              isMobileDevice ? "w-16 h-0.5" : "w-24 h-1"
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
        <LoadingOverlay />
        
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
          iframeUrl && (
            <iframe 
              key={`${currentServer}-${transitionComputed.currentVideoId}`}
              {...iframeProps} 
              suppressHydrationWarning={true}
            />
          )
        )}
      </div>
    </Card>
  );
}

const OptimizedVideoPlayer = withPerformanceOptimization(VideoPlayerComponent);
export const VideoPlayer = withErrorBoundary(OptimizedVideoPlayer);
