"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface HTML5VideoPlayerProps {
  videoId: string;
  server: 'hls' | 'helvid' | 'hydax';
  autoPlay?: boolean;
  muted?: boolean;
  controls?: boolean;
  onLoad?: () => void;
  onError?: (error: string) => void;
  className?: string;
}

export function HTML5VideoPlayer({ 
  videoId, 
  server, 
  autoPlay = false,
  muted = false,
  controls = true,
  onLoad,
  onError,
  className 
}: HTML5VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const hlsRef = useRef<any>(null);

  const loadVideo = useCallback(async () => {
    if (!videoRef.current) return;

    setIsLoading(true);
    setError(null);

    try {
      if (server === 'hls') {
        // Try to use HLS.js directly for better control
        if (typeof window !== 'undefined') {
          // Load HLS.js
          const HLS = await import('hls.js');
          
          if (HLS.default.isSupported()) {
            const hls = new HLS.default({
              debug: false,
              enableWorker: false,
              lowLatencyMode: false,
              backBufferLength: 10,
              maxBufferLength: 20,
              maxBufferSize: 10 * 1000 * 1000,
              manifestLoadingTimeOut: 10000,
              manifestLoadingMaxRetry: 3,
              fragmentLoadingTimeOut: 20000,
              fragmentLoadingMaxRetry: 6,
              xhrSetup: function(xhr, url) {
                xhr.setRequestHeader('Accept', '*/*');
                xhr.withCredentials = false;
              }
            });
            
            hlsRef.current = hls;
            
            hls.on(HLS.default.Events.MANIFEST_LOADED, () => {
              console.log('HLS manifest loaded successfully');
              setIsLoading(false);
              onLoad?.();
            });
            
            hls.on(HLS.default.Events.ERROR, (event, data) => {
              console.error('HLS.js error:', data);
              setError(`HLS playback error: ${data.details || 'Unknown error'}`);
              setIsLoading(false);
              onError?.(`HLS playback error: ${data.details || 'Unknown error'}`);
            });
            
            hls.on(HLS.default.Events.FRAG_LOADED, () => {
              console.log('HLS segment loaded');
            });
            
            const videoUrl = `/api/hls?file=${videoId}`;
            hls.loadSource(videoUrl);
            hls.attachMedia(videoRef.current);
            
            if (autoPlay) {
              videoRef.current.muted = muted;
              videoRef.current.play().catch(e => {
                console.warn('Autoplay failed:', e);
              });
            }
          } else if (videoRef.current.canPlayType('application/vnd.apple.mpegurl')) {
            // Use native HLS support (Safari)
            console.log('Using native HLS support');
            const videoUrl = `/api/hls?file=${videoId}`;
            videoRef.current.src = videoUrl;
            videoRef.current.muted = muted;
            
            videoRef.current.addEventListener('loadedmetadata', () => {
              console.log('Native HLS loaded');
              setIsLoading(false);
              onLoad?.();
            });
            
            videoRef.current.addEventListener('error', (e) => {
              console.error('Native HLS error:', e);
              setError('Native HLS playback error');
              setIsLoading(false);
              onError?.('Native HLS playback error');
            });
            
            if (autoPlay) {
              videoRef.current.play().catch(e => {
                console.warn('Autoplay failed:', e);
              });
            }
          } else {
            throw new Error('HLS not supported in this browser');
          }
        }
      } else {
        // For external servers, show message to switch back to HLS
        setError('Please switch back to HLS server for the best experience');
        setIsLoading(false);
        onError?.('Please switch back to HLS server');
      }
    } catch (err) {
      console.error('Video loading error:', err);
      setError('Failed to load video player');
      setIsLoading(false);
      onError?.('Failed to load video player');
    }
  }, [videoId, server, autoPlay, muted, onLoad, onError]);

  useEffect(() => {
    loadVideo();
    
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [loadVideo]);

  const handlePlay = () => {
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleVolumeChange = () => {
    // Handle volume changes if needed
  };

  return (
    <div className={cn("relative w-full aspect-video bg-black rounded-lg overflow-hidden", className)}>
      {error ? (
        <div className="absolute inset-0 flex items-center justify-center bg-red-900/30 border border-red-500/50 rounded-lg">
          <div className="text-center p-6">
            <div className="text-red-400 text-6xl mb-4">⚠️</div>
            <h3 className="text-red-300 text-xl font-semibold mb-2">Video Player Error</h3>
            <p className="text-red-200 mb-4">{error}</p>
            <button 
              onClick={loadVideo}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            className="w-full h-full"
            controls={controls}
            autoPlay={autoPlay}
            muted={muted}
            playsInline
            onPlay={handlePlay}
            onPause={handlePause}
            onVolumeChange={handleVolumeChange}
            style={{ objectFit: 'contain' }}
          />
          
          {/* Loading indicator */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 z-10">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                <p className="text-white">Loading video player...</p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
