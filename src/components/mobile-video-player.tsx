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
  onServerChange?: (server: MobileServerType) => void;
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
  onServerChange,
  className
}: MobileVideoPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [currentServer, setCurrentServer] = useState<MobileServerType>(server);

  // Simple iframe URL generation with current server
  const iframeUrl = useMemo(() => {
    const episodeData = getEpisodeData(videoId);
    const serverId = episodeData?.servers[currentServer];
    
    if (!serverId) {
      console.warn(`No server ID found for ${currentServer} with videoId: ${videoId}`);
      return '';
    }
    
    let videoUrl = '';
    if (currentServer === 'helvid') {
      videoUrl = `https://helvid.net/play/index/${serverId}`;
    } else if (currentServer === 'hydax') {
      videoUrl = `https://short.icu/${serverId}`;
    }
    
    console.log(`Mobile player URL for ${currentServer}: ${videoUrl}`);
    return videoUrl;
  }, [videoId, currentServer]);

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
    console.log(`Mobile iframe loaded: ${currentServer} - ${videoId}`);
    setIsLoading(false);
    setLoadError(null);
    setHasLoaded(true);
    setRetryCount(0);
    onLoad?.();
  }, [currentServer, videoId, onLoad]);

  // Enhanced error handler with fallback
  const handleIframeError = useCallback(() => {
    console.error(`Mobile iframe error: ${currentServer} - ${videoId}`);
    setIsLoading(false);
    
    // Auto-fallback from hydax to helvid
    if (currentServer === 'hydax' && retryCount === 0) {
      console.log('Hydax failed, falling back to Helvid for mobile');
      setCurrentServer('helvid');
      setRetryCount(1);
      setLoadError(null);
      setHasLoaded(false);
      setIsLoading(true);
      onServerChange?.('helvid');
      return;
    }
    
    const errorMessage = `Failed to load video: ${currentServer}`;
    setLoadError(errorMessage);
    onError?.(errorMessage);
  }, [currentServer, videoId, retryCount, onError, onServerChange]);

  // Simple timeout for mobile loading
  useEffect(() => {
    if (!iframeUrl) return;

    setIsLoading(true);
    setLoadError(null);
    setHasLoaded(false);

    // Simple 10 second timeout for mobile with fallback
    const timeoutId = setTimeout(() => {
      if (!hasLoaded) {
        console.warn(`Mobile iframe timeout: ${currentServer} - ${videoId}`);
        
        // Auto-fallback from hydax to helvid on timeout
        if (currentServer === 'hydax' && retryCount === 0) {
          console.log('Hydax timeout, falling back to Helvid for mobile');
          setCurrentServer('helvid');
          setRetryCount(1);
          setLoadError(null);
          setHasLoaded(false);
          onServerChange?.('helvid');
          return;
        }
        
        setIsLoading(false);
        setLoadError(`Timeout loading ${currentServer} server`);
        onError?.(`Timeout loading ${currentServer} server`);
      }
    }, 10000);

    return () => clearTimeout(timeoutId);
  }, [iframeUrl, currentServer, videoId, hasLoaded, retryCount, onError, onServerChange]);

  // Reset states when videoId or server changes
  useEffect(() => {
    setIsLoading(true);
    setLoadError(null);
    setHasLoaded(false);
    setRetryCount(0);
  }, [videoId, server]);
  
  // Update current server when prop changes
  useEffect(() => {
    setCurrentServer(server);
  }, [server]);

  if (!iframeUrl) {
    return (
      <Card className={cn("w-full overflow-hidden shadow-lg rounded-lg", className)}>
        <div className="aspect-video bg-muted relative flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-destructive mb-2 mx-auto" />
            <p className="text-sm text-muted-foreground">
              No video source available for {currentServer}
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
          key={`mobile-${currentServer}-${videoId}-${retryCount}`}
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
