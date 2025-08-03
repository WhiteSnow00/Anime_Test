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

  // Simple mobile dimensions
  const iframeDimensions = useMemo(() => {
    if (typeof window !== 'undefined') {
      const width = Math.min(window.innerWidth - 16, 800);
      const height = Math.floor(width * 9 / 16);
      return { width, height };
    }
    return { width: 400, height: 225 };
  }, []);

  // Simple load handler
  const handleIframeLoad = useCallback(() => {
    console.log(`Simple mobile iframe loaded: ${server} - ${videoId}`);
    setIsLoading(false);
    setLoadError(null);
  }, [server, videoId]);

  // Simple error handler - no automatic fallback
  const handleIframeError = useCallback(() => {
    console.error(`Simple mobile iframe error: ${server} - ${videoId}`);
    setIsLoading(false);
    setLoadError(`Không thể tải video từ server ${server}`);
  }, [server, videoId]);

  // Simple timeout
  useEffect(() => {
    if (!iframeUrl) return;

    setIsLoading(true);
    setLoadError(null);

    const timeoutId = setTimeout(() => {
      if (isLoading) {
        setIsLoading(false);
        setLoadError(`Timeout khi tải từ server ${server}`);
      }
    }, 15000); // 15 second timeout

    return () => clearTimeout(timeoutId);
  }, [iframeUrl, server, isLoading]);

  // Reset when videoId or server changes
  useEffect(() => {
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
    <Card className={cn("w-full overflow-hidden shadow-lg rounded-lg", className)}>
      <div className="aspect-video bg-muted relative">
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

        {/* Error overlay */}
        {loadError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-destructive/10 z-20">
            <AlertCircle className="h-8 w-8 text-destructive mb-2" />
            <p className="text-xs text-destructive text-center px-4 mb-2">
              {loadError}
            </p>
            <p className="text-xs text-muted-foreground text-center px-4">
              Vui lòng thử server khác
            </p>
          </div>
        )}

        {/* Simple iframe */}
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
          }}
          title={`Video player for ${episodeTitle}`}
          aria-label={`Video content for ${episodeTitle}`}
        />
      </div>
    </Card>
  );
}
