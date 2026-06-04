"use client";

import React, { useRef, useState, useEffect, useMemo, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { animeData } from '@/data/anime';

export type SimpleMobileServerType = string;

// Helper function to get episode data by videoId or episode number
const getEpisodeData = (videoId: string) => {
  return animeData.episodes.find(ep =>
    ep.videoId === videoId ||
    ep.id.toString().padStart(2, '0') === videoId ||
    Object.values(ep.servers).includes(videoId)
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
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<any>(null);
  const hasLoadedRef = useRef(false);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [hlsSupported, setHlsSupported] = useState<boolean | null>(null);

  // Simple iframe URL generation
  const iframeUrl = useMemo(() => {
    const episodeData = getEpisodeData(videoId);

    if (server === 'hls') {
      // For HLS, use the video ID directly if it's already a .m3u8 file
      // or get the HLS server data from episode
      let hlsFile = videoId;
      if (!videoId.includes('.m3u8')) {
        hlsFile = episodeData?.servers['hls'] || videoId;
      }

      if (hlsFile.startsWith('/')) {
        console.log(`HLS mobile player URL (local): ${hlsFile}`);
        return hlsFile;
      }

      // Support remote URLs directly without proxy
      if (hlsFile.startsWith('http://') || hlsFile.startsWith('https://')) {
        console.log(`HLS mobile player URL (remote): ${hlsFile}`);
        return hlsFile;
      }

      const hlsUrl = `/api/hls?file=${hlsFile}`;
      console.log(`HLS mobile player URL: ${hlsUrl}`);
      return hlsUrl;
    }

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

  const iframeDimensions = useMemo(() => {
    if (typeof window !== 'undefined') {
      const width = Math.min(window.innerWidth - 16, 800);
      const height = Math.floor(width * 9 / 16);
      return { width, height };
    }
    return { width: 400, height: 225 };
  }, []);
  const handleIframeLoad = useCallback(() => {
    console.log(`Simple mobile iframe loaded: ${server} - ${videoId}`);
    hasLoadedRef.current = true;
    setIsLoading(false);
    setLoadError(null);
  }, [server, videoId]);

  const handleVideoLoad = useCallback(() => {
    console.log(`Simple mobile HLS video loaded: ${server} - ${videoId}`);
    hasLoadedRef.current = true;
    setIsLoading(false);
    setLoadError(null);
  }, [server, videoId]);

  const handleIframeError = useCallback(() => {
    console.error(`Simple mobile iframe error: ${server} - ${videoId}`);
    setIsLoading(false);
    setLoadError(`Không thể tải video từ server ${server}`);
  }, [server, videoId]);

  const handleVideoError = useCallback(() => {
    console.error(`Simple mobile HLS video error: ${server} - ${videoId} (attempt ${retryCount + 1})`);

    if (retryCount < 2 && server === 'hls') {
      console.log(`Auto-retrying HLS load (attempt ${retryCount + 2}/3)...`);
      setRetryCount(prev => prev + 1);
      setIsLoading(true);
      setLoadError(null);

      setTimeout(() => {
        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }
      }, 1000);
      return;
    }

    setIsLoading(false);
    if (hlsSupported === false) {
      setLoadError(`HLS không được hỗ trợ trên thiết bị này. Vui lòng thử server khác.`);
    } else {
      setLoadError(`Không thể tải HLS stream sau ${retryCount + 1} lần thử. Vui lòng thử lại hoặc chọn server khác.`);
    }
  }, [server, videoId, hlsSupported, retryCount]);

  useEffect(() => {
    if (!iframeUrl) return;

    console.log(`Setting up timeout for ${server} - ${videoId}`);
    hasLoadedRef.current = false;
    setIsLoading(true);
    setLoadError(null);

    let isMounted = true;

    const timeoutId = setTimeout(() => {
      if (isMounted && !hasLoadedRef.current) {
        console.warn(`Timeout loading ${server} - ${videoId}`);
        setIsLoading(false);
        setLoadError(`Timeout khi tải từ server ${server}`);
      }
    }, 20000);

    const handleOrientationChange = () => {
      console.log('Orientation changed - maintaining player state');
    };

    if (!hasLoadedRef.current) {
      window.addEventListener('orientationchange', handleOrientationChange, { passive: true });
    }

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, [iframeUrl, server, videoId]);

  useEffect(() => {
    console.log(`Mobile player reset: ${server} - ${videoId}`);
    hasLoadedRef.current = false;
    setIsLoading(true);
    setLoadError(null);
    setRetryCount(0);
  }, [videoId, server]);

  useEffect(() => {
    if (server !== 'hls' || !iframeUrl || !videoRef.current) return;

    const video = videoRef.current;
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      console.log('Native HLS support detected - using native player');
      setHlsSupported(true);
      video.src = iframeUrl;
      return;
    }

    const loadHLS = async () => {
      try {
        const { default: Hls } = await import('hls.js');

        if (Hls.isSupported()) {
          console.log('HLS.js supported - initializing for mobile');
          setHlsSupported(true);

          if (hlsRef.current) {
            hlsRef.current.destroy();
          }

          const hls = new Hls({
            enableWorker: false,
            lowLatencyMode: false,
            backBufferLength: 10,
            maxBufferLength: 20,
            maxMaxBufferLength: 40,
            maxBufferSize: 10 * 1000 * 1000,
            maxBufferHole: 0.5,
            manifestLoadingTimeOut: 30000,
            manifestLoadingMaxRetry: 5,
            manifestLoadingRetryDelay: 1000,
            fragLoadingTimeOut: 30000,
            fragLoadingMaxRetry: 8,
            fragLoadingRetryDelay: 500,
            startLevel: -1,
            capLevelToPlayerSize: true,
            testBandwidth: false,
            startFragPrefetch: true,
            progressive: true,
          });

          hlsRef.current = hls;

          hls.on(Hls.Events.MEDIA_ATTACHED, () => {
            console.log('HLS media attached to mobile video element');
          });

          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            console.log('HLS manifest parsed for mobile player');
            handleVideoLoad();
          });

          hls.on(Hls.Events.ERROR, (_event: any, data: any) => {
            console.error('HLS mobile error:', data);

            // Handle different types of errors
            if (data.fatal) {
              if (data.type === 'networkError') {
                console.log('HLS network error detected - will trigger auto-retry');
                handleVideoError();
              } else if (data.type === 'mediaError') {
                console.log('HLS media error - attempting recovery');
                try {
                  hls.recoverMediaError();
                } catch (recoverError) {
                  console.error('Failed to recover from media error:', recoverError);
                  handleVideoError();
                }
              } else {
                console.log('HLS fatal error - triggering error handler');
                setHlsSupported(false);
                handleVideoError();
              }
            } else {
              console.warn('Non-fatal HLS error:', data);
            }
          });

          hls.attachMedia(video);
          hls.loadSource(iframeUrl);
        } else {
          console.warn('HLS.js not supported - trying direct source');
          setHlsSupported(false);
          video.src = iframeUrl;
        }
      } catch (error) {
        console.error('Failed to load HLS.js:', error);
        setHlsSupported(false);
        video.src = iframeUrl;
      }
    };

    loadHLS();

    // Cleanup function
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [server, iframeUrl, handleVideoLoad, handleVideoError]);

  if (!iframeUrl) {
    return (
      <Card className={cn("w-full overflow-hidden shadow-lg rounded-lg", className)}>
        <div className="aspect-video bg-muted relative flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-destructive mb-2 mx-auto" />
            <p className="text-sm text-muted-foreground">
              {server === 'hls'
                ? `Không có HLS stream cho episode này`
                : `Không có video cho server ${server}`
              }
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Video ID: {videoId}
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
                {server === 'hls'
                  ? `Đang tải HLS stream ${episodeTitle}...`
                  : `Đang tải ${episodeTitle} từ ${server}...`
                }
              </div>
              {retryCount > 0 && (
                <div className="text-xs text-blue-500 text-center px-2">
                  Đang thử lại... (lần {retryCount + 1}/3)
                </div>
              )}
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
                  hasLoadedRef.current = false;
                  setLoadError(null);
                  setIsLoading(true);

                  if (server === 'hls') {
                    if (hlsRef.current) {
                      hlsRef.current.destroy();
                      hlsRef.current = null;
                    }
                    if (videoRef.current) {
                      const video = videoRef.current;
                      setTimeout(() => {
                        if (video && iframeUrl) {
                          video.load();
                        }
                      }, 100);
                    }
                  } else {
                    if (iframeRef.current) {
                      const currentSrc = iframeRef.current.src;
                      iframeRef.current.src = '';
                      setTimeout(() => {
                        if (iframeRef.current) {
                          iframeRef.current.src = currentSrc;
                        }
                      }, 100);
                    }
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

        {/* HLS Video Player for mobile HLS streaming */}
        {server === 'hls' && (
          <video
            ref={videoRef}
            key={`hls-${server}-${videoId}`}
            width={iframeDimensions.width}
            height={iframeDimensions.height}
            controls={true}
            autoPlay={false}
            muted={false}
            playsInline={true}
            preload="metadata"
            onLoadedData={handleVideoLoad}
            onError={handleVideoError}
            className="w-full h-full"
            style={{
              border: 'none',
              outline: 'none',
              opacity: isLoading ? 0 : 1,
              transition: 'opacity 0.3s ease-in-out',
              minHeight: '200px',
            }}
            aria-label={`HLS video content for ${episodeTitle}`}
          />
        )}

        {/* Simple iframe for other servers with loading state and error boundary */}
        {server !== 'hls' && (
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
              minHeight: '200px',
            }}
            title={`Video player for ${episodeTitle}`}
            aria-label={`Video content for ${episodeTitle}`}
          />
        )}
      </div>
    </Card>
  );
}
