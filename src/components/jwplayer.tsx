"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface JWPlayerProps {
  videoId: string;
  server: 'hls' | 'helvid' | 'hydax';
  autoPlay?: boolean;
  muted?: boolean;
  controls?: boolean;
  onLoad?: () => void;
  onError?: (error: string) => void;
  className?: string;
}

export function JWPlayerComponent({ 
  videoId, 
  server, 
  autoPlay = false,
  muted = false,
  controls = true,
  onLoad,
  onError,
  className 
}: JWPlayerProps) {
  const playerRef = useRef<HTMLDivElement>(null);
  const [playerLoaded, setPlayerLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [autoplayBlocked, setAutoplayBlocked] = useState(false);
  const playerInstanceRef = useRef<any>(null);

  // Generate HLS URL for local m3u8 files
  const getVideoUrl = useCallback(() => {
    if (server === 'hls') {
      // Use our HLS API route
      return `/api/hls?file=${videoId}`;
    } else if (server === 'helvid') {
      // Helvid server URL - use the actual videoId passed from episode data
      return `https://helvid.net/play/index/${videoId}`;
    } else if (server === 'hydax') {
      // Hydax server URL - use the actual videoId passed from episode data
      return `https://player.hidatv.live/player/?id=${videoId}`;
    }
    return '';
  }, [videoId, server]);

  const initializePlayer = useCallback(async () => {
    if (typeof window === 'undefined' || !(window as any).jwplayer) {
      return;
    }

    try {
      const jwplayer = (window as any).jwplayer;
      const videoUrl = getVideoUrl();

      // Remove existing player instance
      if (playerInstanceRef.current) {
        try {
          playerInstanceRef.current.remove();
        } catch (e) {
          console.warn('Error removing previous player:', e);
        }
      }

      // Setup player configuration based on server type
      let playerConfig: any = {
        width: "100%",
        height: "100%",
        autostart: autoPlay, // Use the autoPlay prop
        mute: autoPlay && !muted ? false : muted, // Start unmuted only if autoplay is enabled and not explicitly muted
        volume: muted ? 0 : 100, // Set volume to 100% when not muted
        controls: true,
        displaytitle: false,
        displaydescription: false,
        key: "cLGMn8T20tGvW+0eXPhq4NNmLB57TrscPjd1IyJF84o=",
        playbackRateControls: true,
        playbackRates: [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2],
        // Additional autoplay settings
        repeat: false,
        stretching: "uniform"
      };

      if (server === 'hls') {
        // Check if browser supports native HLS (Safari, iOS, some Android browsers)
        const isNativeHLSSupported = (() => {
          const video = document.createElement('video');
          return video.canPlayType('application/vnd.apple.mpegurl') !== '';
        })();

        // HLS configuration optimized for external CDN segments (TikTok CDN)
        playerConfig = {
          ...playerConfig,
          file: videoUrl,
          type: "hls",
          hlsjsdefault: !isNativeHLSSupported, // Use native HLS when available for better performance
          enableNativeHls: isNativeHLSSupported,
          safarihlsjs: !isNativeHLSSupported,
          title: `Episode ${videoId}`,
          // Optimized HLS settings for external CDN content
          hlshtml5: {
            enableWorker: true,
            lowLatencyMode: false,
            // Aggressive buffering for better seeking with external CDN
            backBufferLength: 60, // Keep more back buffer for reverse seeking
            maxBufferLength: 20, // Moderate forward buffer
            maxMaxBufferLength: 120, // Reasonable max buffer
            maxBufferSize: 40 * 1000 * 1000, // 40MB buffer
            maxBufferHole: 0.3,
            highBufferWatchdogPeriod: 1,
            nudgeOffset: 0.1,
            nudgeMaxRetry: 3,
            maxSeekHole: 1,
            seekHoleNudgeDuration: 0.01,
            maxFragLookUpTolerance: 0.2,
            // CDN optimization
            liveSyncDurationCount: 3,
            liveMaxLatencyDurationCount: 6,
            enableSoftwareAES: true,
            // Increased timeouts for external CDN
            manifestLoadingTimeOut: 15000,
            manifestLoadingMaxRetry: 3,
            manifestLoadingRetryDelay: 1000,
            fragmentLoadingTimeOut: 30000, // Increased for TikTok CDN
            fragmentLoadingMaxRetry: 6,
            fragmentLoadingRetryDelay: 1000,
            startFragPrefetch: true,
            testBandwidth: true,
            progressive: true,
            // Additional optimizations for external CDN
            abrEwmaFastLive: 5.0,
            abrEwmaSlowLive: 9.0,
            abrEwmaFastVoD: 5.0,
            abrEwmaSlowVoD: 9.0,
            maxStarvationDelay: 4,
            maxLoadingDelay: 4,
            // Enable segment prefetching
            startLevel: -1,
            capLevelToPlayerSize: false,
            // CORS handling
            xhrSetup: function(xhr: XMLHttpRequest, url: string) {
              xhr.setRequestHeader('Cache-Control', 'no-cache');
            }
          },
          // Buffering optimized for seeking performance
          buffering: {
            enabled: true,
            length: 8, // Reasonable buffer for seeking
            position: 3
          },
          preload: "metadata", // Load metadata first for faster seeking
          // Additional JWPlayer optimizations
          bandwidthEstimate: 2000000, // 2Mbps default estimate
          bitrateSelection: "auto"
        };
      } else {
        // For external servers (Helvid, Hydax), use iframe or direct embed
        playerConfig = {
          ...playerConfig,
          file: videoUrl,
          type: "mp4", // Default to mp4 for external servers
        };
      }

      // Initialize player
      const player = jwplayer("kana-jwplayer").setup(playerConfig);
      playerInstanceRef.current = player;

      // Event listeners
      player.on('ready', () => {
        console.log('JWPlayer ready');
        setPlayerLoaded(true);
        setIsLoading(false);
        setError(null);
        
        // Handle autoplay and muting based on browser policies
        if (autoPlay) {
          try {
            // Try to play the video
            player.play();
            console.log('Autoplay started successfully');
            
            // Set mute state after attempting autoplay
            if (!muted) {
              // Small delay to ensure player is ready
              setTimeout(() => {
                player.setMute(false);
                console.log('Âm thanh đã được bật sau autoplay');
              }, 100);
            }
          } catch (e) {
            console.warn('Autoplay failed, trying muted autoplay:', e);
            // If autoplay fails, try with muted
            try {
              player.setMute(true);
              player.play();
              console.log('Autoplay tắt tiếng đã bắt đầu');
            } catch (e2) {
              console.warn('Tất cả các lần thử autoplay đều thất bại:', e2);
            }
          }
        } else {
          // If not autoplay, just set the mute state
          if (!muted) {
            player.setMute(false);
            console.log('Âm thanh đã được bật thành công');
          }
        }
        
        onLoad?.(); // Call onLoad callback
      });

      player.on('error', (e: any) => {
        console.error('JWPlayer error:', e);
        const errorMessage = `Lỗi phát video: ${e.message || 'Không thể tải video'}`;
        setError(errorMessage);
        setIsLoading(false);
        onError?.(errorMessage); // Call onError callback
      });

      player.on('setupError', (e: any) => {
        console.error('JWPlayer setup error:', e);
        const errorMessage = `Lỗi thiết lập player: ${e.message || 'Khởi tạo player thất bại'}`;
        setError(errorMessage);
        setIsLoading(false);
        onError?.(errorMessage); // Call onError callback
      });

      player.on('buffer', () => {
        console.log('Player buffering...');
      });

      player.on('idle', () => {
        console.log('Player idle');
      });

      // Handle autoplay blocked by browser
      player.on('autostartNotAllowed', () => {
        console.log('Autoplay was blocked by browser policy');
        setAutoplayBlocked(true);
        
        // Try to unmute since autoplay is blocked anyway
        if (!muted) {
          setTimeout(() => {
            player.setMute(false);
            console.log('Âm thanh đã được bật sau khi autoplay bị chặn');
          }, 100);
        }
      });

      // Handle successful play events
      player.on('play', () => {
        console.log('Bắt đầu phát video');
        setAutoplayBlocked(false); // Hide autoplay blocked message
        
        // Ensure audio is unmuted when playback starts (if not intended to be muted)
        if (!muted && autoPlay) {
          setTimeout(() => {
            player.setMute(false);
            console.log('Âm thanh đã được bật trong quá trình phát');
          }, 200);
        }
      });

      // Handle first interaction to unmute if needed
      player.on('firstFrame', () => {
        console.log('First frame loaded');
        if (!muted) {
          player.setMute(false);
        }
      });

    } catch (err) {
      console.error('Error initializing player:', err);
      setError('Khởi tạo player thất bại');
      setIsLoading(false);
    }
  }, [videoId, server, autoPlay, muted, onLoad, onError, getVideoUrl]);

  useEffect(() => {
    let scriptLoaded = false;

    const loadJWPlayer = () => {
      // Check if JWPlayer is already loaded
      if (typeof window !== 'undefined' && (window as any).jwplayer) {
        initializePlayer();
        return;
      }

      // Load JWPlayer script
      const script = document.createElement('script');
      script.src = 'https://ssl.p.jwpcdn.com/player/v/8.38.3/jwplayer.js';
      script.async = true;
      
      script.onload = () => {
        console.log('JWPlayer script loaded');
        scriptLoaded = true;
        initializePlayer();
      };

      script.onerror = () => {
        console.error('Failed to load JWPlayer script');
        setError('Không thể tải script player');
        setIsLoading(false);
      };

      document.head.appendChild(script);
    };

    loadJWPlayer();

    // Cleanup
    return () => {
      if (playerInstanceRef.current) {
        try {
          playerInstanceRef.current.remove();
        } catch (e) {
          console.warn('Error during player cleanup:', e);
        }
      }
    };
  }, [videoId, server, initializePlayer]);

  // Handle server/video changes
  useEffect(() => {
    if (playerLoaded) {
      setIsLoading(true);
      initializePlayer();
    }
  }, [videoId, server, playerLoaded, initializePlayer]);

  if (server !== 'hls') {
    // For external servers (Helvid, Hydax), use iframe embed
    const iframeUrl = getVideoUrl();
    
    return (
      <div className={cn("relative w-full aspect-video bg-black rounded-lg overflow-hidden", className)}>
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 z-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
              <p className="text-white">Đang tải player...</p>
            </div>
          </div>
        )}
        
        <iframe
          src={iframeUrl}
          className="w-full h-full border-0"
          allowFullScreen
          allow="autoplay; encrypted-media; picture-in-picture"
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setError('Không thể tải player bên ngoài');
            setIsLoading(false);
          }}
        />
      </div>
    );
  }

  // For HLS server, use JWPlayer
  return (
    <div className={cn("relative w-full aspect-video bg-black rounded-lg overflow-hidden", className)}>
      {error ? (
        <div className="absolute inset-0 flex items-center justify-center bg-red-900/30 border border-red-500/50 rounded-lg">
          <div className="text-center p-6">
            <div className="text-red-400 text-6xl mb-4">⚠️</div>
                        <h3 className="text-red-300 text-xl font-semibold mb-2">Lỗi phát video</h3>
            <p className="text-red-200 mb-4">{error}</p>
            <button 
              onClick={() => {
                setError(null);
                setIsLoading(true);
                initializePlayer();
              }}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              Thử lại
            </button>
          </div>
        </div>
      ) : (
        <>
          <div id="kana-jwplayer" className="w-full h-full"></div>
          
          {/* Loading indicator */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 z-10">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                <p className="text-white">Đang tải trình phát HLS...</p>
              </div>
            </div>
          )}

          {/* Autoplay blocked overlay */}
          {autoplayBlocked && !isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-20">
              <div className="text-center">
                <button
                  onClick={() => {
                    if (playerInstanceRef.current) {
                      playerInstanceRef.current.play();
                      setAutoplayBlocked(false);
                    }
                  }}
                  className="group flex items-center justify-center w-20 h-20 bg-white/20 hover:bg-white/30 rounded-full transition-all duration-300 border-2 border-white/50 hover:border-white/80 mb-4 mx-auto"
                >
                  <div className="w-0 h-0 border-l-[16px] border-l-white border-t-[12px] border-t-transparent border-b-[12px] border-b-transparent ml-1 group-hover:scale-110 transition-transform"></div>
                </button>
                <p className="text-white text-sm">Nhấp để phát video</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
