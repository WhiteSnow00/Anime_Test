"use client";

import React, { memo, useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { useViewport } from '@/hooks/use-viewport';
import { useVideoTransition } from '@/hooks/use-video-transition';
import { withPerformanceOptimization, withErrorBoundary } from '@/lib/higher-order-components';
import { performanceUtils } from '@/lib/advanced-utils';
import { Loader2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  recordServerError,
  getErrorMessage,
  getNextFallbackServer,
  createIframeErrorDetector,
  generateVideoUrl
} from '@/lib/video-server-utils';
import { animeData } from '@/data/anime';
import NJWPlayerComponent from './new-jwplayer';
import JWPlayerWithResume from './jwplayer-with-resume';
import { isFeatureEnabled } from '@/lib/feature-flags';

export type ServerType = string;

// Helper function to get episode data by various identifiers, including HLS filenames
const getEpisodeData = (idOrUrl: string) => {
  // direct matches: internal id, zero-padded id, or alt servers
  let ep = animeData.episodes.find(ep =>
    ep.videoId === idOrUrl ||
    ep.id.toString().padStart(2, '0') === idOrUrl ||
    Object.values(ep.servers).includes(idOrUrl)
  );
  if (ep) return ep;

  // HLS filename match (e.g., 'Tập5.m3u8' or path that ends with it)
  if (idOrUrl.includes('.m3u8')) {
    const basename = idOrUrl.split('/').pop() || idOrUrl;
    ep = animeData.episodes.find(e => e.servers['hls'] === idOrUrl || e.servers['hls'] === basename);
    if (ep) return ep;
  }
  return undefined;
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
  const [desktopHudHeight, setDesktopHudHeight] = useState(96);
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
    if (episodeData?.servers['hls']) {
  console.warn(`Found HLS for ${inputVideoId}: ${episodeData.servers['hls']}`);
      return episodeData.servers['hls'];
    }

    console.warn(`Could not determine HLS filename for videoId: ${inputVideoId}, defaulting to first episode`);
    return animeData.episodes[0]?.servers['hls'] || 'Tập1.m3u8';
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
  console.warn(`VideoPlayer: Switching server from ${currentServer} to ${server}`);
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
  }, [server, currentServer, transitionActions, videoId]);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  const iframeUrl = useMemo(() => {
    if (currentServer === 'hls') return '';
    
    const currentVideoId = transitionComputed.currentVideoId || videoId;
    const episodeData = getEpisodeData(currentVideoId);
    const serverId = episodeData?.servers[currentServer];
    
    let videoUrl = '';
    if (serverId) {
      videoUrl = generateVideoUrl(currentServer, serverId);
    }
    
  console.warn(`Generated iframe URL for ${currentServer}: ${videoUrl}`);
    return videoUrl;
  }, [transitionComputed.currentVideoId, currentServer, videoId]);

  // Advanced iframe load handler with transition state management
  const handleIframeLoad = useMemo(() => debounce(() => {
    if (iframeRef.current) {
      setLoadError(null);
      onLoad?.();
      if (transitionState.isTransitioning) {
        setTimeout(() => transitionActions.completeTransition(), 100);
      }
    }
  }, 200), [transitionState.isTransitioning, transitionActions, onLoad]);

  const handleIframeError = useMemo(() => throttle((error: string) => {
    console.error(`Video player error: ${error}`);
    setLoadError(error);
    onError?.(error);
    transitionActions.resetTransition();
  }, 1000), [onError, transitionActions]);

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
  console.warn('Video load error:', userErrorMessage);

      const timeoutId = setTimeout(async () => {
        const nextServer = getNextFallbackServer(currentServer, triedServers);
        if (nextServer) {
          console.warn(`Switching from ${currentServer} to ${nextServer} due to error`);
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
  console.warn(`Episode/Server changed: Resetting server to ${server}`);
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
          "absolute inset-x-0 top-0 z-[5] flex flex-col items-center justify-center bg-slate-950/74 backdrop-blur-md",
          isMobileDevice && "bg-background/90 backdrop-blur-none"
        )}
        style={{
          bottom: !isMobileDevice ? `${desktopHudHeight}px` : 0,
          opacity: overlayProps.opacity,
          transition: overlayProps.transition,
        }}
      >
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-fuchsia-500/10 via-transparent to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
        <div className={cn(
          "relative flex flex-col items-center rounded-2xl border border-white/10 bg-black/35 px-6 py-5 shadow-[0_24px_80px_rgba(15,23,42,0.55)] backdrop-blur-xl",
          isMobileDevice ? "space-y-2 px-4 py-4" : "space-y-3"
        )}
        style={{
          transform: !isMobileDevice ? `translateY(${desktopHudHeight / 2}px)` : undefined,
        }}>
          <div className="absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_top,rgba(244,114,182,0.18),transparent_55%)]" />
          <Loader2 className={cn(
            "relative animate-spin text-pink-300 drop-shadow-[0_0_18px_rgba(244,114,182,0.55)]",
            isMobileDevice ? "h-6 w-6" : "h-8 w-8"
          )} />
          <div className={cn(
            "relative px-2 text-center font-medium tracking-[0.02em] text-slate-200/92",
            isMobileDevice ? "text-xs" : "text-sm"
          )}>
            Đang tải {episodeTitle}...
          </div>
          {transitionState.transitionPhase !== 'idle' && (
            <div className={cn(
              "relative overflow-hidden rounded-full border border-white/10 bg-white/10",
              isMobileDevice ? "w-16 h-0.5" : "w-24 h-1"
            )}>
              <div 
                className="h-full bg-gradient-to-r from-fuchsia-400 via-pink-400 to-orange-300 transition-all duration-300 ease-out"
                style={{ width: `${transitionComputed.transitionProgress}%` }}
              />
            </div>
          )}
        </div>
      </div>
    );
  });

  LoadingOverlay.displayName = 'LoadingOverlay';

  const isDesktopPlayer = !viewport.isMobile;

  return (
    <Card
      className={cn(
        "w-full overflow-hidden rounded-[1.4rem] border border-white/10 bg-slate-950/88 shadow-[0_28px_80px_rgba(2,6,23,0.6)] transition-all duration-300",
        isDesktopPlayer && "ring-1 ring-fuchsia-400/10 before:pointer-events-none before:absolute before:inset-x-10 before:top-0 before:h-28 before:bg-[radial-gradient(circle_at_top,rgba(244,114,182,0.18),transparent_70%)] before:content-['']",
        className
      )}
    >
      <div 
        className={cn(
          "relative aspect-video overflow-hidden bg-slate-950",
          isDesktopPlayer && "bg-[radial-gradient(circle_at_top,rgba(244,114,182,0.12),transparent_30%),linear-gradient(180deg,rgba(15,23,42,0.22),rgba(2,6,23,0.9))]",
          transitionStyles.getContainerClasses()
        )}
      >
        {isDesktopPlayer && (
          <>
            <div className="pointer-events-none absolute inset-0 border border-white/6" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-white/6 via-white/[0.03] to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/45 via-black/15 to-transparent" />
          </>
        )}
        <LoadingOverlay />
        
        {loadError && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md">
            <div className="rounded-2xl border border-red-400/20 bg-black/35 px-6 py-5 shadow-[0_22px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl">
            <AlertCircle className={cn(
              "mb-2 text-red-300",
              viewport.isMobile ? "h-8 w-8" : "h-12 w-12"
            )} />
            <p className={cn(
              "px-4 text-center text-red-100/90",
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
                "mt-3 rounded-xl border border-red-300/15 bg-red-500/85 text-white shadow-lg transition-all hover:bg-red-400",
                viewport.isMobile ? "px-2 py-1 text-xs" : "px-3 py-1 text-xs"
              )}
            >
              {viewport.isMobile ? "Thử lại" : "Retry"}
            </button>
            </div>
          </div>
        )}
        
        {currentServer === 'hls' ? (
          (() => {
            const currentVideoId = transitionComputed.currentVideoId || videoId;
            const hlsVideoId = getHLSVideoId(currentVideoId);
            // Resolve episode data robustly: try current id first, then HLS id
            const episodeData = getEpisodeData(currentVideoId) || getEpisodeData(hlsVideoId || '') || undefined;
            const resumeEnabled = isFeatureEnabled('RESUME_FEATURE_ENABLED');

            console.warn('📺 VIDEO-PLAYER: HLS rendering decision', {
              currentServer,
              currentVideoId,
              episodeId: episodeData?.id,
              resumeEnabled,
              componentChoice: resumeEnabled ? 'JWPlayerWithResume' : 'NJWPlayerComponent'
            });

            return resumeEnabled ? (
              <JWPlayerWithResume
                key={`resume-${currentServer}-${currentVideoId}`}
                videoId={hlsVideoId}
                server={currentServer}
                episodeId={(episodeData?.id ?? Number.parseInt(currentVideoId)) || 0}
                episodeNumber={(episodeData?.id ?? Number.parseInt(currentVideoId)) || 0}
                autoPlay={autoPlay}
                muted={muted}
                controls={controls}
                onLoad={handleIframeLoad}
                onError={handleIframeError}
                onHudHeightChange={setDesktopHudHeight}
                className="w-full h-full"
              />
            ) : (
              <NJWPlayerComponent
                key={`${currentServer}-${currentVideoId}`}
                videoId={hlsVideoId}
                server={currentServer}
                autoPlay={autoPlay}
                muted={muted}
                controls={controls}
                onLoad={handleIframeLoad}
                onError={handleIframeError}
                onHudHeightChange={setDesktopHudHeight}
                className="w-full h-full"
              />
            );
          })()
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
