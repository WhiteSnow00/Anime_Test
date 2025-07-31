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

  // Advanced anti-tracking protection system
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Custom context menu implementation with complete override
    let customContextMenu: HTMLElement | null = null;

    const showCustomContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'VIDEO' || target.closest('#kana-jwplayer')) {
        // Completely prevent the default context menu
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        // Remove existing custom menu if any
        if (customContextMenu) {
          customContextMenu.remove();
        }
        
        // Create custom context menu
        customContextMenu = document.createElement('div');
        customContextMenu.style.cssText = `
          position: fixed;
          top: ${e.clientY}px;
          left: ${e.clientX}px;
          background: #1a1a1a;
          border: 1px solid #333;
          border-radius: 4px;
          padding: 8px 0;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          font-size: 13px;
          color: #fff;
          box-shadow: 0 2px 10px rgba(0,0,0,0.5);
          z-index: 999999;
          min-width: 180px;
          user-select: none;
        `;
        
        // Create menu item
        const menuItem = document.createElement('div');
        menuItem.style.cssText = `
          padding: 8px 16px;
          cursor: default;
          color: #ccc;
          font-weight: 500;
        `;
        menuItem.textContent = 'Powered by KanaFansub';
        
        customContextMenu.appendChild(menuItem);
        document.body.appendChild(customContextMenu);
        
        // Position menu properly if it goes off screen
        const menuRect = customContextMenu.getBoundingClientRect();
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;
        
        if (menuRect.right > windowWidth) {
          customContextMenu.style.left = `${e.clientX - menuRect.width}px`;
        }
        if (menuRect.bottom > windowHeight) {
          customContextMenu.style.top = `${e.clientY - menuRect.height}px`;
        }
        
        return false;
      }
    };

    // More aggressive context menu blocking
    const blockContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'VIDEO' || target.closest('#kana-jwplayer')) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        showCustomContextMenu(e);
        return false;
      }
    };

    // Hide custom context menu when clicking elsewhere
    const hideCustomContextMenu = (e: MouseEvent) => {
      if (customContextMenu && !customContextMenu.contains(e.target as Node)) {
        customContextMenu.remove();
        customContextMenu = null;
      }
    };

    // Anti dev tools detection (basic deterrent)
    let devtools = { open: false, orientation: null };
    const threshold = 160;

    const checkDevTools = () => {
      if (window.outerHeight - window.innerHeight > threshold || 
          window.outerWidth - window.innerWidth > threshold) {
        if (!devtools.open) {
          devtools.open = true;
          // Obfuscate network requests when dev tools detected
          console.clear();
          console.log('%cDeveloper tools detected. Stream protection enabled.', 'color: red; font-size: 20px;');
          
          // Create fake network noise to confuse monitoring
          for (let i = 0; i < 10; i++) {
            setTimeout(() => {
              fetch(`/api/decoy-${Math.random().toString(36)}?fake=${btoa(Math.random().toString())}`).catch(() => {});
            }, i * 100);
          }
        }
      } else {
        devtools.open = false;
      }
    };

    // Monitor for dev tools
    const devToolsTimer = setInterval(checkDevTools, 1000);

    // Obfuscate console messages
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;

    console.log = (...args: any[]) => {
      const message = args.join(' ');
      // Allow HLS logs for debugging but filter sensitive content
      if (message.includes('m3u8') || message.includes('blob:') || message.includes('stream')) {
        const filteredArgs = args.map(arg => 
          typeof arg === 'string' ? arg.replace(/blob:[^"\s]+/g, 'blob:***').replace(/https?:\/\/[^\s"]+/g, 'https://***') : arg
        );
        originalLog.apply(console, ['[HLS DEBUG]', ...filteredArgs]);
        return;
      }
      originalLog.apply(console, args);
    };

    console.error = (...args: any[]) => {
      const message = args.join(' ');
      
      // Filter out JWPlayer core-shim errors and other common errors
      if (message.includes('core-shim') || 
          message.includes('[helpers/jwplayer/api/core-shim]') ||
          message.includes('jwplayer.core.controls.js')) {
        // Suppress these errors as they are typically non-critical JWPlayer internal errors
        return;
      }
      
      // Allow HLS errors for debugging but filter sensitive content
      if (message.includes('m3u8') || message.includes('stream') || message.includes('segment')) {
        const filteredArgs = args.map(arg => 
          typeof arg === 'string' ? arg.replace(/blob:[^"\s]+/g, 'blob:***').replace(/https?:\/\/[^\s"]+/g, 'https://***') : arg
        );
        originalError.apply(console, ['[HLS ERROR]', ...filteredArgs]);
        return;
      }
      originalError.apply(console, args);
    };

    console.warn = (...args: any[]) => {
      const message = args.join(' ');
      // Allow HLS warnings for debugging but filter sensitive content
      if (message.includes('m3u8') || message.includes('stream')) {
        const filteredArgs = args.map(arg => 
          typeof arg === 'string' ? arg.replace(/blob:[^"\s]+/g, 'blob:***').replace(/https?:\/\/[^\s"]+/g, 'https://***') : arg
        );
        originalWarn.apply(console, ['[HLS WARN]', ...filteredArgs]);
        return;
      }
      originalWarn.apply(console, args);
    };

    // Block text selection on player
    const preventSelection = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.closest('#kana-jwplayer')) {
        e.preventDefault();
        return false;
      }
    };

    // Block drag operations on video
    const preventDrag = (e: DragEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'VIDEO' || target.closest('#kana-jwplayer')) {
        e.preventDefault();
        return false;
      }
    };

    // Block keyboard shortcuts that might expose URLs
    const blockKeyboardShortcuts = (e: KeyboardEvent) => {
      // Block F12, Ctrl+Shift+I, Ctrl+U, Ctrl+S when focused on player
      const target = e.target as HTMLElement;
      if (target.closest('#kana-jwplayer')) {
        if (e.key === 'F12' || 
            (e.ctrlKey && e.shiftKey && e.key === 'I') ||
            (e.ctrlKey && e.key === 'u') ||
            (e.ctrlKey && e.key === 's')) {
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      }
    };

    // Override DOM inspection methods to hide video element content
    const originalQuerySelector = document.querySelector.bind(document);
    const originalQuerySelectorAll = document.querySelectorAll.bind(document);
    const originalGetElementById = document.getElementById.bind(document);
    const originalGetElementsByTagName = document.getElementsByTagName.bind(document);

    // Intercept DOM queries for video elements
    document.querySelector = function(selector: string) {
      const result = originalQuerySelector(selector);
      if (selector.includes('video') && result && result.tagName === 'VIDEO') {
        // Return a proxy object that hides sensitive properties
        return new Proxy(result, {
          get(target, prop) {
            if (prop === 'src' || prop === 'currentSrc') {
              return 'blob:protected-stream';
            }
            if (prop === 'getAttribute') {
              return function(attr: string) {
                if (attr === 'src') return 'blob:protected-stream';
                return target.getAttribute(attr);
              };
            }
            if (prop === 'outerHTML' || prop === 'innerHTML') {
              const html = target[prop as keyof HTMLVideoElement];
              return typeof html === 'string' ? html.replace(/blob:[^"\s]+/g, 'blob:protected-stream') : html;
            }
            return target[prop as keyof HTMLVideoElement];
          }
        });
      }
      return result;
    };

    document.querySelectorAll = function(selector: string) {
      const results = originalQuerySelectorAll(selector);
      if (selector.includes('video')) {
        return new Proxy(results, {
          get(target, prop) {
            if (typeof prop === 'string' && /^\d+$/.test(prop)) {
              const element = target[parseInt(prop)];
              if (element && element.tagName === 'VIDEO') {
                return new Proxy(element, {
                  get(videoTarget, videoProp) {
                    if (videoProp === 'src' || videoProp === 'currentSrc') {
                      return 'blob:protected-stream';
                    }
                    return videoTarget[videoProp as keyof HTMLVideoElement];
                  }
                });
              }
              return element;
            }
            return target[prop as keyof NodeListOf<Element>];
          }
        });
      }
      return results;
    };

    // Override console inspect methods
    const originalConsoleDir = console.dir;
    const originalConsoleLog = console.log;
    
    console.dir = function(obj: any) {
      if (obj && obj.tagName === 'VIDEO') {
        const sanitized = { ...obj, src: 'blob:protected-stream', currentSrc: 'blob:protected-stream' };
        return originalConsoleDir(sanitized);
      }
      return originalConsoleDir(obj);
    };

    // Advanced DOM mutation observer to continuously protect video elements
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          try {
            if (node && node.nodeType === Node.ELEMENT_NODE) {
              const element = node as Element;
              
              // Find video elements and apply protection
              let videos: NodeListOf<HTMLVideoElement> | HTMLVideoElement[] = [];
              
              if (element.tagName === 'VIDEO' && element instanceof HTMLVideoElement) {
                videos = [element];
              } else {
                videos = Array.from(element.querySelectorAll('video'));
              }
              
              videos.forEach((video) => {
                try {
                  if (video instanceof HTMLVideoElement && video.closest('#kana-jwplayer')) {
                    // Apply real-time protection to video elements
                    protectVideoElement(video);
                  }
                } catch (videoError) {
                  console.debug('Error protecting individual video element:', videoError);
                }
              });
            }
          } catch (nodeError) {
            console.debug('Error processing mutation node:', nodeError);
          }
        });
      });
    });

    // Start observing DOM changes
    observer.observe(document.body, { childList: true, subtree: true });

    // Create decoy video elements to confuse tracking
    const createDecoyElements = () => {
      for (let i = 0; i < 3; i++) {
        const decoyVideo = document.createElement('video');
        decoyVideo.src = `blob:decoy-${Math.random().toString(36).substring(7)}`;
        decoyVideo.style.cssText = 'position: absolute; left: -9999px; opacity: 0; pointer-events: none;';
        decoyVideo.id = `decoy-video-${i}`;
        document.body.appendChild(decoyVideo);
        
        // Remove decoy after random time
        setTimeout(() => {
          decoyVideo.remove();
        }, Math.random() * 10000 + 5000);
      }
    };

    // Create initial decoys and periodic new ones
    createDecoyElements();
    const decoyInterval = setInterval(createDecoyElements, 15000);

    // Override fetch to add protection
    const originalFetch = window.fetch;
    window.fetch = function(input: RequestInfo | URL, init?: RequestInit) {
      // Add protection headers to all requests
      const headers = new Headers(init?.headers);
      headers.set('X-Anti-Track', btoa(Date.now().toString()));
      headers.set('X-Session-Guard', Math.random().toString(36));
      
      const modifiedInit = {
        ...init,
        headers: headers
      };
      
      return originalFetch(input, modifiedInit);
    };

    // Add event listeners with more aggressive blocking
    document.addEventListener('contextmenu', blockContextMenu, true); // Use capture phase
    document.addEventListener('contextmenu', showCustomContextMenu, false); // Also listen in bubble phase
    document.addEventListener('click', hideCustomContextMenu);
    document.addEventListener('selectstart', preventSelection);
    document.addEventListener('dragstart', preventDrag);
    document.addEventListener('keydown', blockKeyboardShortcuts);

    // Cleanup
    return () => {
      clearInterval(devToolsTimer);
      document.removeEventListener('contextmenu', blockContextMenu, true);
      document.removeEventListener('contextmenu', showCustomContextMenu, false);
      document.removeEventListener('click', hideCustomContextMenu);
      document.removeEventListener('selectstart', preventSelection);
      document.removeEventListener('dragstart', preventDrag);
      document.removeEventListener('keydown', blockKeyboardShortcuts);
      
      // Remove custom context menu if it exists
      if (customContextMenu) {
        customContextMenu.remove();
        customContextMenu = null;
      }
      
      // Restore original methods
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
      console.dir = originalConsoleDir;
      window.fetch = originalFetch;
      document.querySelector = originalQuerySelector;
      document.querySelectorAll = originalQuerySelectorAll;
      document.getElementById = originalGetElementById;
      document.getElementsByTagName = originalGetElementsByTagName;
      observer.disconnect();
      clearInterval(decoyInterval);
    };
  }, []); // Empty dependency array - run only once on mount

  // Generate HLS URL with advanced protection (with fallback for reliability)
  const getVideoUrl = useCallback(() => {
    if (server === 'hls') {
      // Start with simple format to ensure playback works
      // Add obfuscation layers gradually
      return `/api/hls?file=${videoId}`;
    } else if (server === 'helvid') {
      return `https://helvid.net/play/index/${videoId}`;
    } else if (server === 'hydax') {
      return `https://player.hidatv.live/player/?id=${videoId}`;
    }
    return '';
  }, [videoId, server]);

  // Function to apply comprehensive protection to video elements
  const protectVideoElement = useCallback((video: HTMLVideoElement) => {
    try {
      // Validate that video is a proper HTMLVideoElement
      if (!video || !(video instanceof HTMLVideoElement) || !video.nodeType) {
        console.debug('Invalid video element provided to protectVideoElement');
        return;
      }

      // Safely override getAttribute specifically for src
      const originalGetAttribute = video.getAttribute;
      video.getAttribute = function(name: string) {
        if (name === 'src') return 'blob:protected-stream';
        return originalGetAttribute.call(this, name);
      };

      // Safely override setAttribute to prevent URL leaks
      const originalSetAttribute = video.setAttribute;
      video.setAttribute = function(name: string, value: string) {
        if (name === 'src' && value.includes('blob:')) {
          // Allow setting but don't expose the real URL
          return originalSetAttribute.call(this, name, value);
        }
        return originalSetAttribute.call(this, name, value);
      };

      // Advanced property protection with periodic reapplication
      const protectionInterval = setInterval(() => {
        try {
          // Check if video element still exists and is connected to DOM
          if (!video || !video.nodeType || !video.isConnected) {
            clearInterval(protectionInterval);
            return;
          }

          // Safely redefine src and currentSrc properties periodically
          const srcDescriptor = Object.getOwnPropertyDescriptor(video, 'src');
          if (!srcDescriptor || srcDescriptor.configurable !== false) {
            Object.defineProperty(video, 'src', {
              get: () => 'blob:protected-stream',
              set: () => {}, // Ignore attempts to read src
              configurable: true
            });
          }

          const currentSrcDescriptor = Object.getOwnPropertyDescriptor(video, 'currentSrc');
          if (!currentSrcDescriptor || currentSrcDescriptor.configurable !== false) {
            Object.defineProperty(video, 'currentSrc', {
              get: () => 'blob:protected-stream',
              configurable: true
            });
          }

          // Safely hide the video from element inspection (avoid circular reference)
          const outerHTMLDescriptor = Object.getOwnPropertyDescriptor(video, 'outerHTML');
          if (!outerHTMLDescriptor || outerHTMLDescriptor.configurable !== false) {
            Object.defineProperty(video, 'outerHTML', {
              get: function() { 
                // Get the original outerHTML from the prototype to avoid circular reference
                const originalOuterHTML = Object.getOwnPropertyDescriptor(HTMLVideoElement.prototype, 'outerHTML')?.get;
                if (originalOuterHTML) {
                  try {
                    const html = originalOuterHTML.call(this);
                    return typeof html === 'string' ? html.replace(/blob:[^"\s]+/g, 'blob:protected-stream') : html;
                  } catch (e) {
                    return '<video>Protected Video Element</video>';
                  }
                }
                return '<video>Protected Video Element</video>';
              },
              configurable: true
            });
          }

        } catch (e) {
          // Silently handle protection failures
          console.debug('Protection reapplication error:', e);
        }
      }, 2000); // Reapply protection every 2 seconds (less frequent to avoid conflicts)

      // Clean up protection when video is removed (with better error handling)
      const cleanupObserver = new MutationObserver((mutations) => {
        try {
          mutations.forEach((mutation) => {
            mutation.removedNodes.forEach((node) => {
              // Proper type checking for nodes
              if (node && node.nodeType === Node.ELEMENT_NODE) {
                if (node === video || (node as Element).contains(video)) {
                  clearInterval(protectionInterval);
                  cleanupObserver.disconnect();
                }
              }
            });
          });
        } catch (observerError) {
          console.debug('Cleanup observer error:', observerError);
          clearInterval(protectionInterval);
          cleanupObserver.disconnect();
        }
      });

      cleanupObserver.observe(document.body, { childList: true, subtree: true });

    } catch (e) {
      console.debug('Video protection error:', e);
    }
  }, []);

  const initializePlayer = useCallback(async () => {
    if (typeof window === 'undefined' || !(window as any).jwplayer) {
      return;
    }

    // Check if we're in the middle of a fullscreen transition
    const isFullscreen = document.fullscreenElement !== null;
    if (isFullscreen && playerInstanceRef.current) {
      console.log('Skipping player initialization due to fullscreen state');
      return;
    }

    // Check if player exists and is in fullscreen mode
    if (playerInstanceRef.current && playerInstanceRef.current._isFullscreen) {
      console.log('Skipping player initialization due to player fullscreen flag');
      return;
    }

    try {
      const jwplayer = (window as any).jwplayer;
      const videoUrl = getVideoUrl();

      // Remove existing player instance
      if (playerInstanceRef.current) {
        try {
          // Save current playback position before removing
          const currentPosition = playerInstanceRef.current.getPosition();
          const wasPlaying = playerInstanceRef.current.getState() === 'playing';
          
          playerInstanceRef.current.remove();
          
          // If we had a position, we'll restore it after recreation
          if (currentPosition > 0) {
            console.log('Saving playback position:', currentPosition);
            playerInstanceRef.current._savedPosition = currentPosition;
            playerInstanceRef.current._wasPlaying = wasPlaying;
          }
        } catch (e) {
          console.warn('Error removing previous player:', e);
        }
      }

      // Setup player configuration based on server type
      let playerConfig: any = {
        width: "100%",
        height: "100%",
        autostart: autoPlay, 
        mute: autoPlay && !muted ? false : muted, 
        volume: muted ? 0 : 100, 
        controls: true,
        displaytitle: false,
        displaydescription: false,
        key: "cLGMn8T20tGvW+0eXPhq4NNmLB57TrscPjd1IyJF84o=",
        playbackRateControls: true,
        playbackRates: [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2],
        repeat: false,
        stretching: "uniform",
        logo: {
          hide: true
        },
        abouttext: "Powered by KanaFansub",
        aboutlink: "#",
        localization: {
          player: "Trình phát video",
          play: "Phát",
          pause: "Tạm dừng",
          replay: "Phát lại", 
          buffer: "Đang tải...",
          more: "Thêm",
          liveBroadcast: "Phát trực tiếp",
          volume: "Âm lượng",
          prevUp: "Tập trước",
          nextUp: "Tập tiếp theo",
          audioTracks: "Âm thanh",
          playbackRates: "Tốc độ phát",
          qualityLevels: "Chất lượng",
          ccOff: "Tắt phụ đề",
          fullscreen: "Toàn màn hình"
        }
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
          hlsjsdefault: true, // Force hls.js for better external CDN support
          enableNativeHls: false, // Disable native HLS to use hls.js which handles CORS better
          safarihlsjs: true, // Use hls.js even on Safari for external CDN
          title: `Episode ${videoId}`,
          // Optimized HLS settings for external CDN content
          hlshtml5: {
            enableWorker: true,
            lowLatencyMode: false,
            // More conservative buffering for external CDN
            backBufferLength: 30, // Reduce back buffer for external CDN
            maxBufferLength: 30, // Increase forward buffer for external CDN
            maxMaxBufferLength: 60, // Reduce max buffer for external CDN
            maxBufferSize: 20 * 1000 * 1000, // 20MB buffer for external CDN
            maxBufferHole: 0.5,
            highBufferWatchdogPeriod: 2,
            nudgeOffset: 0.1,
            nudgeMaxRetry: 5,
            maxSeekHole: 2,
            seekHoleNudgeDuration: 0.1,
            maxFragLookUpTolerance: 0.5,
            // Enhanced CDN optimization for TikTok CDN
            liveSyncDurationCount: 3,
            liveMaxLatencyDurationCount: 6,
            enableSoftwareAES: true,
            // Increased timeouts and retries for external CDN
            manifestLoadingTimeOut: 20000, // Increased for external CDN
            manifestLoadingMaxRetry: 5,
            manifestLoadingRetryDelay: 2000,
            fragmentLoadingTimeOut: 45000, // Much higher for TikTok CDN
            fragmentLoadingMaxRetry: 10, // More retries for external CDN
            fragmentLoadingRetryDelay: 2000,
            startFragPrefetch: true,
            testBandwidth: false, // Disable for external CDN
            progressive: true,
            // Additional optimizations for external CDN
            abrEwmaFastLive: 3.0,
            abrEwmaSlowLive: 9.0,
            abrEwmaFastVoD: 3.0,
            abrEwmaSlowVoD: 9.0,
            maxStarvationDelay: 8,
            maxLoadingDelay: 8,
            // Enable segment prefetching for external CDN
            startLevel: -1,
            capLevelToPlayerSize: false,
            // CORS and anti-tracking setup for external CDN
            xhrSetup: function(xhr: XMLHttpRequest, url: string) {
              // Essential headers for external CDN access
              xhr.setRequestHeader('Cache-Control', 'no-cache');
              xhr.setRequestHeader('Accept', '*/*');
              xhr.setRequestHeader('Accept-Language', 'en-US,en;q=0.9');
              
              // Add anti-tracking headers
              xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
              xhr.setRequestHeader('X-Client-Session', Math.random().toString(36));
              xhr.setRequestHeader('X-Player-Token', btoa(Date.now().toString()));
              
              // Handle CORS for external CDN
              xhr.withCredentials = false;
              
              // Store original methods before modification
              const originalOpen = xhr.open.bind(xhr);
              const originalSend = xhr.send.bind(xhr);
              
              // Override open method to add noise parameters (only for internal URLs)
              xhr.open = function(method: string, requestUrl: string, async: boolean = true, user?: string | null, password?: string | null) {
                let modifiedUrl = requestUrl;
                
                // Only modify internal API URLs, not external CDN URLs
                if (requestUrl.startsWith('/api/') || requestUrl.startsWith(window.location.origin)) {
                  const separator = requestUrl.includes('?') ? '&' : '?';
                  const noiseParams = `_t=${Date.now()}&_r=${Math.random()}&_s=${btoa(Math.random().toString()).slice(0, 8)}`;
                  modifiedUrl = requestUrl + separator + noiseParams;
                }
                
                return originalOpen(method, modifiedUrl, async, user, password);
              };
              
              // Override send method for tracking protection
              xhr.send = function(data: any) {
                // Attempt to mask response URL for internal requests only
                try {
                  if (!url.includes('tiktokcdn.com')) {
                    const descriptor = Object.getOwnPropertyDescriptor(XMLHttpRequest.prototype, 'responseURL');
                    if (descriptor && descriptor.configurable) {
                      Object.defineProperty(xhr, 'responseURL', {
                        get: function() { return window.location.origin + '/stream'; },
                        configurable: true
                      });
                    }
                  }
                } catch (e) {
                  // Silently handle browsers that don't allow responseURL modification
                }
                return originalSend(data);
              };
            }
          },
          // Enhanced buffering for external CDN
          buffering: {
            enabled: true,
            length: 15, // Increased buffer for external CDN
            position: 5
          },
          preload: "auto", // Preload more for external CDN
          // Additional JWPlayer optimizations for external CDN
          bandwidthEstimate: 1000000, // Conservative estimate for external CDN
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
        
        // Restore saved position if available (from fullscreen or other reinitialization)
        if (playerInstanceRef.current && playerInstanceRef.current._savedPosition) {
          const savedPosition = playerInstanceRef.current._savedPosition;
          const wasPlaying = playerInstanceRef.current._wasPlaying;
          
          console.log('Restoring playback position:', savedPosition);
          
          setTimeout(() => {
            player.seek(savedPosition);
            if (wasPlaying) {
              player.play();
            }
            // Clear saved position
            playerInstanceRef.current._savedPosition = null;
            playerInstanceRef.current._wasPlaying = false;
          }, 1000); // Wait a bit for player to be fully ready
        }
        
        // Additional UI customizations and protection after player is ready
        setTimeout(() => {
          // Hide JWPlayer branding if still visible
          const jwLogo = document.querySelector('.jw-logo');
          if (jwLogo) (jwLogo as HTMLElement).style.display = 'none';
          
          const jwWatermark = document.querySelector('.jw-watermark');
          if (jwWatermark) (jwWatermark as HTMLElement).style.display = 'none';
          
          // Custom volume control styling
          const volumeSlider = document.querySelector('.jw-slider-volume .jw-progress');
          if (volumeSlider) {
            (volumeSlider as HTMLElement).style.backgroundColor = '#ff6b35';
          }

          // Add advanced video element protection
          const videoElement = document.querySelector('#kana-jwplayer video');
          if (videoElement) {
            try {
              // Apply comprehensive protection immediately
              protectVideoElement(videoElement as HTMLVideoElement);

              // Additional event-based protection with complete context menu override
              videoElement.addEventListener('contextmenu', (e) => {
                const mouseEvent = e as MouseEvent;
                mouseEvent.preventDefault();
                mouseEvent.stopPropagation();
                mouseEvent.stopImmediatePropagation();
                
                // Create and show custom context menu directly
                const existingMenu = document.querySelector('#kana-custom-menu');
                if (existingMenu) {
                  existingMenu.remove();
                }
                
                const customMenu = document.createElement('div');
                customMenu.id = 'kana-custom-menu';
                customMenu.style.cssText = `
                  position: fixed;
                  top: ${mouseEvent.clientY}px;
                  left: ${mouseEvent.clientX}px;
                  background: #1a1a1a;
                  border: 1px solid #333;
                  border-radius: 4px;
                  padding: 8px 0;
                  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                  font-size: 13px;
                  color: #fff;
                  box-shadow: 0 2px 10px rgba(0,0,0,0.5);
                  z-index: 999999;
                  min-width: 180px;
                  user-select: none;
                `;
                
                const menuItem = document.createElement('div');
                menuItem.style.cssText = `
                  padding: 8px 16px;
                  cursor: default;
                  color: #ccc;
                  font-weight: 500;
                `;
                menuItem.textContent = 'Powered by KanaFansub';
                
                customMenu.appendChild(menuItem);
                document.body.appendChild(customMenu);
                
                // Auto-hide menu after 3 seconds or on click elsewhere
                const hideMenu = () => {
                  if (customMenu && customMenu.parentNode) {
                    customMenu.remove();
                  }
                };
                
                setTimeout(hideMenu, 3000);
                
                // Hide on click elsewhere
                const clickHandler = (clickEvent: Event) => {
                  if (!customMenu.contains(clickEvent.target as Node)) {
                    hideMenu();
                    document.removeEventListener('click', clickHandler);
                  }
                };
                document.addEventListener('click', clickHandler);
                
                return false;
              });

              // Override video element's toString methods to hide URLs
              try {
                const originalToString = HTMLVideoElement.prototype.toString;
                videoElement.toString = function() {
                  const result = originalToString.call(this);
                  return result.replace(/blob:[^"\s]+/g, 'blob:protected-stream');
                };
              } catch (e) {
                console.debug('Cannot override toString, skipping...');
              }

              // Add invisible overlay to prevent direct video interaction
              const overlay = document.createElement('div');
              overlay.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                z-index: 1;
                pointer-events: none;
                background: transparent;
              `;
              
              const playerContainer = document.querySelector('#kana-jwplayer');
              if (playerContainer) {
                playerContainer.appendChild(overlay);
              }
            } catch (protectionError) {
              console.debug('Video protection failed:', protectionError);
              // Continue without protection if it fails
            }
          }

          // Obfuscate player internal references
          if (playerInstanceRef.current) {
            try {
              const originalGetPlaylist = playerInstanceRef.current.getPlaylist;
              const originalGetPlaylistItem = playerInstanceRef.current.getPlaylistItem;
              
              if (originalGetPlaylist) {
                playerInstanceRef.current.getPlaylist = function() {
                  const playlist = originalGetPlaylist.call(this);
                  if (playlist && Array.isArray(playlist)) {
                    return playlist.map((item: any) => ({
                      ...item,
                      file: 'blob:protected-stream',
                      sources: item.sources?.map((source: any) => ({
                        ...source,
                        file: 'blob:protected-stream'
                      }))
                    }));
                  }
                  return playlist;
                };
              }

              if (originalGetPlaylistItem) {
                playerInstanceRef.current.getPlaylistItem = function() {
                  const item = originalGetPlaylistItem.call(this);
                  if (item) {
                    return {
                      ...item,
                      file: 'blob:protected-stream',
                      sources: item.sources?.map((source: any) => ({
                        ...source,
                        file: 'blob:protected-stream'
                      }))
                    };
                  }
                  return item;
                };
              }
            } catch (playerProtectionError) {
              console.debug('Player obfuscation failed:', playerProtectionError);
              // Continue without player obfuscation if it fails
            }
          }
        }, 500);
        
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
        
        // Handle different types of errors with retry logic
        let errorMessage = `Lỗi phát video: ${e.message || 'Không thể tải video'}`;
        let shouldRetry = false;
        
        // Provide more specific error messages for common issues
        if (e.message && e.message.includes('network')) {
          errorMessage = 'Lỗi mạng: Đang thử kết nối lại...';
          shouldRetry = true;
        } else if (e.message && e.message.includes('CORS')) {
          errorMessage = 'Lỗi CORS: Video bị chặn bởi chính sách bảo mật';
        } else if (e.message && e.message.includes('404')) {
          errorMessage = 'Lỗi 404: Không tìm thấy file video';
        } else if (e.code === 'hlsError' || e.type === 'hlsError') {
          errorMessage = 'Lỗi HLS: Đang thử kết nối lại...';
          shouldRetry = true;
        } else if (e.message && e.message.includes('core-shim')) {
          errorMessage = 'Lỗi tạm thời: Đang thử kết nối lại...';
          shouldRetry = true;
        }
        
        setError(errorMessage);
        
        // Auto-retry for network/HLS errors after a short delay
        if (shouldRetry) {
          setTimeout(() => {
            console.log('Attempting to retry video load...');
            try {
              // Try to reload the player
              player.load();
              setError(null);
            } catch (retryError) {
              console.error('Retry failed:', retryError);
              setError('Không thể kết nối lại. Vui lòng thử lại sau.');
            }
          }, 2000);
        }
        setIsLoading(false);
        onError?.(errorMessage);
      });

      player.on('setupError', (e: any) => {
        console.error('JWPlayer setup error:', e);
        const errorMessage = `Lỗi thiết lập player: ${e.message || 'Khởi tạo player thất bại'}`;
        setError(errorMessage);
        setIsLoading(false);
        onError?.(errorMessage);
      });

      // Add more detailed event logging for debugging
      player.on('firstFrame', () => {
        console.log('First frame loaded successfully');
        if (!muted) {
          player.setMute(false);
        }
      });

      player.on('bufferChange', (e: any) => {
        console.log('Buffer status:', e.newstate ? 'buffering' : 'ready');
      });

      player.on('warning', (e: any) => {
        console.warn('JWPlayer warning:', e);
      });

      // Monitor playback issues
      player.on('playbackRateChanged', (e: any) => {
        console.log('Playback rate changed to:', e.playbackRate);
      });

      // Add network quality monitoring
      player.on('levels', () => {
        console.log('Quality levels detected');
        const levels = player.getQualityLevels();
        if (levels && levels.length > 0) {
          console.log('Available quality levels:', levels.map((l: any) => l.label));
        }
      });

      player.on('levelsChanged', (e: any) => {
        console.log('Quality level changed to:', e.currentQuality);
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

      // Additional event handlers for enhanced UX
      player.on('complete', () => {
        console.log('Video playback completed');
        // Could trigger next episode functionality here
      });

      player.on('time', (e: any) => {
        // Update progress, could be used for analytics
        const progress = (e.position / e.duration) * 100;
        if (progress % 25 === 0) { // Log every 25% progress
          console.log(`Playback progress: ${Math.round(progress)}%`);
        }
      });

      player.on('levels', () => {
        console.log('Quality levels available');
        // Auto-select best quality based on connection
        const levels = player.getQualityLevels();
        if (levels && levels.length > 0) {
          // Select highest quality by default
          const highestQuality = levels[levels.length - 1];
          console.log('Auto-selected highest quality:', highestQuality.label);
        }
      });

      player.on('fullscreen', (e: any) => {
        console.log('Fullscreen toggled:', e.fullscreen);
        
        // Prevent player reinitialization during fullscreen changes
        if (e.fullscreen) {
          console.log('Entering fullscreen mode - preventing player reload');
          // Add a flag to prevent reinitialization
          playerInstanceRef.current._isFullscreen = true;
        } else {
          console.log('Exiting fullscreen mode - preventing player reload');
          // Track when we exit fullscreen to prevent immediate reinitialization
          playerInstanceRef.current._lastFullscreenExit = Date.now();
          // Remove the flag after a short delay to prevent immediate reinitialization
          setTimeout(() => {
            if (playerInstanceRef.current) {
              playerInstanceRef.current._isFullscreen = false;
            }
          }, 1000);
        }
      });

      player.on('resize', (e: any) => {
        console.log('Player resized:', e.width, 'x', e.height);
        // Handle responsive adjustments
      });

      // Handle volume changes
      player.on('volume', (e: any) => {
        console.log('Volume changed to:', e.volume);
        // Could save volume preference
      });

      // Handle mute changes
      player.on('mute', (e: any) => {
        console.log('Mute toggled:', e.mute);
        // Could save mute preference
      });

    } catch (err) {
      console.error('Error initializing player:', err);
      setError('Khởi tạo player thất bại');
      setIsLoading(false);
    }
  }, [videoId, server, autoPlay, muted, onLoad, onError, getVideoUrl, protectVideoElement]);

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
  }, [videoId, server]); // Remove initializePlayer from dependencies to prevent constant reinitializations

  // Handle server/video changes separately to prevent fullscreen issues
  useEffect(() => {
    if (playerLoaded && playerInstanceRef.current) {
      // Don't reinitialize if only fullscreen state changed
      const isFullscreen = document.fullscreenElement !== null;
      if (isFullscreen || (playerInstanceRef.current && playerInstanceRef.current._isFullscreen)) {
        console.log('Skipping player reinitialization due to fullscreen state');
        return;
      }
      
      // Also check if we just exited fullscreen recently
      const now = Date.now();
      if (playerInstanceRef.current._lastFullscreenExit && (now - playerInstanceRef.current._lastFullscreenExit) < 2000) {
        console.log('Skipping player reinitialization - recently exited fullscreen');
        return;
      }
      
      setIsLoading(true);
      initializePlayer();
    }
  }, [videoId, server, playerLoaded]);

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
