"use client";

import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { animeData } from '@/data/anime';

export type MobileServerType = 'helvid' | 'hydax';

// Helper function to get episode data by videoId or episode number
const getEpisodeData = (videoId: string) => {
  return animeData.episodes.find(ep => 
    ep.videoId === videoId || 
    ep.id.toString().padStart(2, '0') === videoId ||
    ep.servers.helvid === videoId ||
    ep.servers.hydax === videoId
  );
};

interface MobileVideoPlayerProps {
  videoId: string;
  server: MobileServerType;
  episodeTitle: string;
  autoPlay?: boolean;
  muted?: boolean;
  controls?: boolean;
  onLoad?: () => void;
  onError?: (error: string) => void;
  className?: string;
}

export function MobileVideoPlayer({
  videoId,
  server,
  episodeTitle,
  autoPlay = true,
  muted = false,
  controls = true,
  onLoad,
  onError,
  className
}: MobileVideoPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

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
    
    console.log(`Mobile player URL for ${server}: ${videoUrl}`);
    return videoUrl;
  }, [videoId, server]);

  // Simple mobile dimensions
  const iframeDimensions = useMemo(() => {
    if (typeof window !== 'undefined') {
      const width = Math.min(window.innerWidth - 16, 800); // 8px padding on each side
      const height = Math.floor(width * 9 / 16); // 16:9 aspect ratio
      
      return { width, height };
    }
    
    return { width: 400, height: 225 }; // Fallback mobile size
  }, []);

  // Simple load handler
  const handleIframeLoad = useCallback(() => {
    console.log(`Mobile iframe loaded: ${server} - ${videoId}`);
    setIsLoading(false);
    setLoadError(null);
    setHasLoaded(true);
    onLoad?.();
  }, [server, videoId, onLoad]);

  // Simple error handler
  const handleIframeError = useCallback(() => {
    console.error(`Mobile iframe error: ${server} - ${videoId}`);
    setIsLoading(false);
    const errorMessage = `Failed to load video: ${server}`;
    setLoadError(errorMessage);
    onError?.(errorMessage);
  }, [server, videoId, onError]);

  // Simple timeout for mobile loading
  useEffect(() => {
    if (!iframeUrl) return;

    setIsLoading(true);
    setLoadError(null);
    setHasLoaded(false);

    // Simple 15 second timeout for mobile
    const timeoutId = setTimeout(() => {
      if (!hasLoaded) {
        console.warn(`Mobile iframe timeout: ${server} - ${videoId}`);
        setIsLoading(false);
        setLoadError(`Timeout loading ${server} server`);
        onError?.(`Timeout loading ${server} server`);
      }
    }, 15000);

    return () => clearTimeout(timeoutId);
  }, [iframeUrl, server, videoId, hasLoaded, onError]);

  // Reset states when videoId or server changes
  useEffect(() => {
    setIsLoading(true);
    setLoadError(null);
    setHasLoaded(false);
  }, [videoId, server]);

  if (!iframeUrl) {
    return (
      <Card className={cn("w-full overflow-hidden shadow-lg rounded-lg", className)}>
        <div className="aspect-video bg-muted relative flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-destructive mb-2 mx-auto" />
            <p className="text-sm text-muted-foreground">
              No video source available for {server}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full overflow-hidden shadow-lg rounded-lg", className)}>
      <div className="aspect-video bg-muted relative">
        {/* Loading overlay */}
        {isLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/90 backdrop-blur-sm z-10">
            <div className="flex flex-col items-center space-y-2">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <div className="text-xs text-muted-foreground text-center px-2">
                Đang tải {episodeTitle}...
              </div>
            </div>
          </div>
        )}

        {/* Error overlay */}
        {loadError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-destructive/10 z-20">
            <AlertCircle className="h-8 w-8 text-destructive mb-2" />
            <p className="text-xs text-destructive text-center px-4 mb-2">
              {loadError}
            </p>
            <button
              onClick={() => {
                setLoadError(null);
                setIsLoading(true);
                setHasLoaded(false);
                // Force iframe reload by changing src
                if (iframeRef.current) {
                  const src = iframeRef.current.src;
                  iframeRef.current.src = '';
                  setTimeout(() => {
                    if (iframeRef.current) {
                      iframeRef.current.src = src;
                    }
                  }, 100);
                }
              }}
              className="px-2 py-1 text-xs bg-destructive text-destructive-foreground rounded hover:bg-destructive/90 transition-colors"
            >
              Thử lại
            </button>
          </div>
        )}

        {/* Simple iframe */}
        <iframe
          ref={iframeRef}
          key={`mobile-${server}-${videoId}`}
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
          }}
          title={`Mobile video player for ${episodeTitle}`}
          aria-label={`Mobile video content for ${episodeTitle}`}
        />
      </div>
    </Card>
  );
}
