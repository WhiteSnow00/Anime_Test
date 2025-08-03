"use client";

import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { animeData } from '@/data/anime';

export type SimpleMobileServerType = 'helvid' | 'hydax';

// Helper function to get episode data by videoId or episode number
const getEpisodeData = (videoId: string) => {
  return animeData.episodes.find(ep => 
    ep.videoId === videoId || 
    ep.id.toString().padStart(2, '0') === videoId ||
    ep.servers.helvid === videoId ||
    ep.servers.hydax === videoId
  );
};

interface SimpleMobilePlayerProps {
  videoId: string;
  server: SimpleMobileServerType;
  episodeTitle: string;
  className?: string;
}

export function SimpleMobilePlayer({
  videoId,
  server,
  episodeTitle,
  className
}: SimpleMobilePlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const hasLoadedRef = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Simple iframe URL generation
  const iframeUrl = useMemo(() => {
    const episodeData = getEpisodeData(videoId);
    const serverId = episodeData?.servers[server];
    
    if (!serverId) {
      console.warn(`No server ID found for ${server} with videoId: ${videoId}`);
      return '';
    }
    
    let videoUrl = '';
    if (server === 'helvid') {
      videoUrl = `https://helvid.net/play/index/${serverId}`;
    } else if (server === 'hydax') {
      videoUrl = `https://short.icu/${serverId}`;
    }
    
    console.log(`Simple mobile player URL for ${server}: ${videoUrl}`);
    return videoUrl;
  }, [videoId, server]);

  // Simple mobile dimensions with stable orientation handling
  const iframeDimensions = useMemo(() => {
    if (typeof window !== 'undefined') {
      const width = Math.min(window.innerWidth - 16, 800);
      const height = Math.floor(width * 9 / 16);
      return { width, height };
    }
    return { width: 400, height: 225 };
  }, []); // Remove dependency on window resize to prevent crashes during orientation change

  // Simple load handler with proper state management
  const handleIframeLoad = useCallback(() => {
    console.log(`Simple mobile iframe loaded: ${server} - ${videoId}`);
    hasLoadedRef.current = true;
    setIsLoading(false);
    setLoadError(null);
  }, [server, videoId]);

  // Simple error handler - no automatic fallback
  const handleIframeError = useCallback(() => {
    console.error(`Simple mobile iframe error: ${server} - ${videoId}`);
    setIsLoading(false);
    setLoadError(`Không thể tải video từ server ${server}`);
  }, [server, videoId]);

  // Simple timeout with proper cleanup and orientation change handling
  useEffect(() => {
    if (!iframeUrl) return;

    console.log(`Setting up timeout for ${server} - ${videoId}`);
    hasLoadedRef.current = false;
    setIsLoading(true);
    setLoadError(null);

    // Track if component is still mounted
    let isMounted = true;
    
    const timeoutId = setTimeout(() => {
      // Only trigger timeout if still mounted and not loaded
      if (isMounted && !hasLoadedRef.current) {
        console.warn(`Timeout loading ${server} - ${videoId}`);
        setIsLoading(false);
        setLoadError(`Timeout khi tải từ server ${server}`);
      }
    }, 20000); // 20 second timeout for better mobile compatibility

    // Handle orientation change without reloading iframe
    const handleOrientationChange = () => {
      // Don't reload iframe on orientation change, just update dimensions
      console.log('Orientation changed - maintaining player state');
    };

    // Only add orientation listener if not already loaded to prevent crashes
    if (!hasLoadedRef.current) {
      window.addEventListener('orientationchange', handleOrientationChange, { passive: true });
    }

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, [iframeUrl, server, videoId]);

  // Reset when videoId or server changes
  useEffect(() => {
    console.log(`Mobile player reset: ${server} - ${videoId}`);
    hasLoadedRef.current = false;
    setIsLoading(true);
    setLoadError(null);
  }, [videoId, server]);

  if (!iframeUrl) {
    return (
      <Card className={cn("w-full overflow-hidden shadow-lg rounded-lg", className)}>
        <div className="aspect-video bg-muted relative flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-destructive mb-2 mx-auto" />
            <p className="text-sm text-muted-foreground">
              Không có video cho server {server}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full overflow-hidden shadow-lg rounded-lg", className)} suppressHydrationWarning>
      <div className="aspect-video bg-muted relative" style={{ minHeight: '200px' }} suppressHydrationWarning>
        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/90 backdrop-blur-sm z-10">
            <div className="flex flex-col items-center space-y-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <div className="text-xs text-muted-foreground text-center px-2">
                Đang tải {episodeTitle} từ {server}...
              </div>
            </div>
          </div>
        )}

        {/* Error overlay with retry button */}
        {loadError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-destructive/10 z-20">
            <AlertCircle className="h-8 w-8 text-destructive mb-2" />
            <p className="text-xs text-destructive text-center px-4 mb-2">
              {loadError}
            </p>
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={() => {
                  // Reset and retry
                  hasLoadedRef.current = false;
                  setLoadError(null);
                  setIsLoading(true);
                  // Force iframe reload
                  if (iframeRef.current) {
                    const currentSrc = iframeRef.current.src;
                    iframeRef.current.src = '';
                    setTimeout(() => {
                      if (iframeRef.current) {
                        iframeRef.current.src = currentSrc;
                      }
                    }, 100);
                  }
                }}
                className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
              >
                Thử lại
              </button>
              <p className="text-xs text-muted-foreground text-center px-4">
                Hoặc vui lòng thử server khác
              </p>
            </div>
          </div>
        )}

        {/* Simple iframe with loading state and error boundary */}
        <iframe
          ref={iframeRef}
          key={`simple-${server}-${videoId}`}
          width={iframeDimensions.width}
          height={iframeDimensions.height}
          src={iframeUrl}
          frameBorder="0"
          scrolling="no"
          allowFullScreen={true}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          className="w-full h-full"
          style={{
            border: 'none',
            outline: 'none',
            opacity: isLoading ? 0 : 1,
            transition: 'opacity 0.3s ease-in-out',
            minHeight: '200px', // Prevent layout shift during orientation change
          }}
          title={`Video player for ${episodeTitle}`}
          aria-label={`Video content for ${episodeTitle}`}
        />
      </div>
    </Card>
  );
}
