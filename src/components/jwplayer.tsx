"use client";
import React, { useEffect, useRef, useState, useCallback } from 'react';
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
      
      // Filter out JWPlayer empty error objects - these are benign and don't prevent playback
      if (message.includes('JWPlayer error:') && args.length >= 2) {
        const errorObj = args[1];
        if (typeof errorObj === 'object' && errorObj !== null) {
          // Check if it's an empty error object or has no meaningful properties
          if (Object.keys(errorObj).length === 0 || 
              (!errorObj.code && !errorObj.message && !errorObj.type && !errorObj.sourceError)) {
            // This is an empty/meaningless JWPlayer error - suppress it completely
            console.debug('Suppressed JWPlayer empty error object');
            return;
          }
        }
      }
      
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

    // Advanced DOM inspection protection system with proper TypeScript typing
    const originalQuerySelector = document.querySelector.bind(document);
    const originalQuerySelectorAll = document.querySelectorAll.bind(document);
    const originalGetElementById = document.getElementById.bind(document);
    const originalGetElementsByTagName = document.getElementsByTagName.bind(document);

    // Type-safe video element proxy handler
    const createVideoElementProxy = (videoElement: HTMLVideoElement): HTMLVideoElement => {
      return new Proxy(videoElement, {
        get(target: HTMLVideoElement, prop: string | symbol, receiver: any): any {
          // Handle property access interception
          if (prop === 'src' || prop === 'currentSrc') {
            return 'blob:protected-stream';
          }
          
          // Handle method interceptions
          if (prop === 'getAttribute') {
            return function(this: HTMLVideoElement, attr: string): string | null {
              if (attr === 'src') return 'blob:protected-stream';
              return HTMLVideoElement.prototype.getAttribute.call(this, attr);
            };
          }
          
          if (prop === 'setAttribute') {
            return function(this: HTMLVideoElement, attr: string, value: string): void {
              if (attr === 'src' && value.includes('blob:')) {
                // Allow setting but mask the value in debugging
                return HTMLVideoElement.prototype.setAttribute.call(this, attr, value);
              }
              return HTMLVideoElement.prototype.setAttribute.call(this, attr, value);
            };
          }
          
          // Handle HTML content properties
          if (prop === 'outerHTML' || prop === 'innerHTML') {
            const originalValue = Reflect.get(target, prop, receiver);
            if (typeof originalValue === 'string') {
              // Sanitize blob URLs in HTML content
              return originalValue.replace(/blob:[^"\s'>]+/g, 'blob:protected-stream');
            }
            return originalValue;
          }
          
          // Handle toString method
          if (prop === 'toString') {
            return function(this: HTMLVideoElement): string {
              return '[object HTMLVideoElement (Protected)]';
            };
          }
          
          // Handle valueOf method
          if (prop === 'valueOf') {
            return function(this: HTMLVideoElement): HTMLVideoElement {
              return this;
            };
          }
          
          // Default property access
          return Reflect.get(target, prop, receiver);
        },
        
        set(target: HTMLVideoElement, prop: string | symbol, value: any, receiver: any): boolean {
          // Intercept src setting attempts
          if (prop === 'src' && typeof value === 'string' && value.includes('blob:')) {
            // Allow the setting but don't expose the real URL in debug
            return Reflect.set(target, prop, value, receiver);
          }
          return Reflect.set(target, prop, value, receiver);
        },
        
        has(target: HTMLVideoElement, prop: string | symbol): boolean {
          return Reflect.has(target, prop);
        },
        
        ownKeys(target: HTMLVideoElement): ArrayLike<string | symbol> {
          return Reflect.ownKeys(target);
        },
        
        getOwnPropertyDescriptor(target: HTMLVideoElement, prop: string | symbol): PropertyDescriptor | undefined {
          const descriptor = Reflect.getOwnPropertyDescriptor(target, prop);
          if (descriptor && (prop === 'src' || prop === 'currentSrc')) {
            return {
              ...descriptor,
              value: 'blob:protected-stream'
            };
          }
          return descriptor;
        }
      });
    };

    // Type-safe NodeList proxy for querySelectorAll results
    const createNodeListProxy = (nodeList: NodeListOf<Element>): NodeListOf<Element> => {
      return new Proxy(nodeList, {
        get(target: NodeListOf<Element>, prop: string | symbol, receiver: any): any {
          // Handle numeric indices
          if (typeof prop === 'string' && /^\d+$/.test(prop)) {
            const index = parseInt(prop, 10);
            const element = target[index];
            
            if (element && element.tagName === 'VIDEO') {
              return createVideoElementProxy(element as HTMLVideoElement);
            }
            return element;
          }
          
          // Handle NodeList methods and properties
          if (prop === 'forEach') {
            return function(this: NodeListOf<Element>, callback: (value: Element, key: number, parent: NodeListOf<Element>) => void, thisArg?: any): void {
              for (let i = 0; i < target.length; i++) {
                const element = target[i];
                const proxiedElement = element.tagName === 'VIDEO' ? 
                  createVideoElementProxy(element as HTMLVideoElement) : element;
                callback.call(thisArg, proxiedElement, i, this);
              }
            };
          }
          
          if (prop === 'item') {
            return function(this: NodeListOf<Element>, index: number): Element | null {
              const element = target.item(index);
              if (element && element.tagName === 'VIDEO') {
                return createVideoElementProxy(element as HTMLVideoElement);
              }
              return element;
            };
          }
          
          // Handle entries, values, keys iterators
          if (prop === 'entries') {
            return function* (this: NodeListOf<Element>): IterableIterator<[number, Element]> {
              for (let i = 0; i < target.length; i++) {
                const element = target[i];
                const proxiedElement = element.tagName === 'VIDEO' ? 
                  createVideoElementProxy(element as HTMLVideoElement) : element;
                yield [i, proxiedElement];
              }
            };
          }
          
          if (prop === 'values') {
            return function* (this: NodeListOf<Element>): IterableIterator<Element> {
              for (let i = 0; i < target.length; i++) {
                const element = target[i];
                const proxiedElement = element.tagName === 'VIDEO' ? 
                  createVideoElementProxy(element as HTMLVideoElement) : element;
                yield proxiedElement;
              }
            };
          }
          
          if (prop === 'keys') {
            return function* (this: NodeListOf<Element>): IterableIterator<number> {
              for (let i = 0; i < target.length; i++) {
                yield i;
              }
            };
          }
          
          // Handle Symbol.iterator
          if (prop === Symbol.iterator) {
            return function* (this: NodeListOf<Element>): IterableIterator<Element> {
              for (let i = 0; i < target.length; i++) {
                const element = target[i];
                const proxiedElement = element.tagName === 'VIDEO' ? 
                  createVideoElementProxy(element as HTMLVideoElement) : element;
                yield proxiedElement;
              }
            };
          }
          
          return Reflect.get(target, prop, receiver);
        }
      });
    };

    // Enhanced querySelector override with proper typing
    document.querySelector = function<E extends Element>(selectors: string): E | null {
      const result = originalQuerySelector(selectors);
      
      if (result && result.tagName === 'VIDEO' && selectors.includes('video')) {
        return createVideoElementProxy(result as HTMLVideoElement) as any;
      }
      
      return result as E | null;
    };

    // Enhanced querySelectorAll override with proper typing
    document.querySelectorAll = function<E extends Element>(selectors: string): NodeListOf<E> {
      const results = originalQuerySelectorAll(selectors);
      
      if (selectors.includes('video')) {
        return createNodeListProxy(results) as any;
      }
      
      return results as NodeListOf<E>;
    };

    // Enhanced getElementById override
    document.getElementById = function(elementId: string): HTMLElement | null {
      const result = originalGetElementById(elementId);
      
      if (result && result.tagName === 'VIDEO') {
        return createVideoElementProxy(result as HTMLVideoElement) as any;
      }
      
      return result;
    };

    // Enhanced getElementsByTagName override
    document.getElementsByTagName = function(qualifiedName: string): HTMLCollectionOf<Element> {
      const results = originalGetElementsByTagName(qualifiedName);
      
      if (qualifiedName.toLowerCase() === 'video') {
        // Create a proxy for HTMLCollection to handle video elements
        return new Proxy(results, {
          get(target: HTMLCollectionOf<Element>, prop: string | symbol, receiver: any): any {
            if (typeof prop === 'string' && /^\d+$/.test(prop)) {
              const index = parseInt(prop, 10);
              const element = target[index];
              
              if (element && element.tagName === 'VIDEO') {
                return createVideoElementProxy(element as HTMLVideoElement);
              }
              return element;
            }
            
            if (prop === 'item') {
              return function(this: HTMLCollectionOf<Element>, index: number): Element | null {
                const element = target.item(index);
                if (element && element.tagName === 'VIDEO') {
                  return createVideoElementProxy(element as HTMLVideoElement);
                }
                return element;
              };
            }
            
            if (prop === 'namedItem') {
              return function(this: HTMLCollectionOf<Element>, name: string): Element | null {
                const element = target.namedItem(name);
                if (element && element.tagName === 'VIDEO') {
                  return createVideoElementProxy(element as HTMLVideoElement);
                }
                return element;
              };
            }
            
            return Reflect.get(target, prop, receiver);
          }
        }) as any;
      }
      
      return results;
    };

    // Advanced console inspection protection with comprehensive object sanitization
    const originalConsoleDir = console.dir;
    const originalConsoleLog = console.log;
    const originalConsoleTable = console.table;
    const originalConsoleTrace = console.trace;
    
    // Deep sanitization function for objects containing video elements
    const sanitizeObjectForConsole = (obj: any, depth: number = 0): any => {
      if (depth > 10) return '[Circular or Deep Object]'; // Prevent infinite recursion
      
      if (!obj || typeof obj !== 'object') return obj;
      
      // Handle video elements specifically
      if (obj.tagName === 'VIDEO' || obj instanceof HTMLVideoElement) {
        return {
          tagName: 'VIDEO',
          src: 'blob:protected-stream',
          currentSrc: 'blob:protected-stream',
          id: obj.id || '',
          className: obj.className || '',
          '[Protected Video Element]': true
        };
      }
      
      // Handle arrays
      if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObjectForConsole(item, depth + 1));
      }
      
      // Handle NodeList and HTMLCollection
      if (obj instanceof NodeList || obj instanceof HTMLCollection) {
        const sanitized: any[] = [];
        for (let i = 0; i < obj.length; i++) {
          sanitized.push(sanitizeObjectForConsole(obj[i], depth + 1));
        }
        return sanitized;
      }
      
      // Handle regular objects
      const sanitized: any = {};
      for (const key in obj) {
        try {
          if (obj.hasOwnProperty(key)) {
            const value = obj[key];
            
            // Sanitize URL-like strings
            if (typeof value === 'string' && value.includes('blob:')) {
              sanitized[key] = value.replace(/blob:[^"\s]+/g, 'blob:protected-stream');
            } else if (key === 'src' || key === 'currentSrc') {
              sanitized[key] = 'blob:protected-stream';
            } else {
              sanitized[key] = sanitizeObjectForConsole(value, depth + 1);
            }
          }
        } catch (e) {
          sanitized[key] = '[Protected Property]';
        }
      }
      
      return sanitized;
    };
    
    console.dir = function(obj: any, options?: any) {
      const sanitized = sanitizeObjectForConsole(obj);
      return originalConsoleDir(sanitized, options);
    };
    
    console.table = function(tabularData: any, properties?: string[]) {
      const sanitized = sanitizeObjectForConsole(tabularData);
      return originalConsoleTable(sanitized, properties);
    };
    
    console.trace = function(...data: any[]) {
      const sanitizedData = data.map(item => sanitizeObjectForConsole(item));
      return originalConsoleTrace(...sanitizedData);
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
                  // Error protecting individual video element
                }
              });
            }
          } catch (nodeError) {
            // Error processing mutation node
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
      
      // Restore original methods with proper cleanup
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
      console.dir = originalConsoleDir;
      console.table = originalConsoleTable;
      console.trace = originalConsoleTrace;
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
      // For HLS, videoId already contains the full m3u8 filename (e.g., 'kanasub-01.m3u8')
      // Use it directly without modification
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
          clearInterval(protectionInterval);
          cleanupObserver.disconnect();
        }
      });

      cleanupObserver.observe(document.body, { childList: true, subtree: true });

    } catch (e) {
      // Video protection error
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
      
      console.log('Initializing JWPlayer with URL:', videoUrl);
      console.log('Video ID:', videoId, 'Server:', server);

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

        // HLS configuration simplified for better compatibility with external CDN
        playerConfig = {
          ...playerConfig,
          file: videoUrl,
          type: "hls",
          // Use native HLS when available, fallback to hls.js
          hlsjsdefault: !isNativeHLSSupported,
          enableNativeHls: isNativeHLSSupported,
          safarihlsjs: false, // Let Safari use native HLS
          title: `Episode ${videoId}`,
          // Simplified HLS settings for better external CDN compatibility
          hlshtml5: {
            enableWorker: false, // Disable worker for better compatibility
            lowLatencyMode: false,
            // Conservative buffering for external CDN
            backBufferLength: 10,
            maxBufferLength: 20,
            maxMaxBufferLength: 40,
            maxBufferSize: 10 * 1000 * 1000, // 10MB buffer
            maxBufferHole: 0.5,
            highBufferWatchdogPeriod: 3,
            nudgeOffset: 0.1,
            nudgeMaxRetry: 3,
            maxSeekHole: 2,
            seekHoleNudgeDuration: 0.1,
            maxFragLookUpTolerance: 0.25,
            // Simplified CDN settings
            liveSyncDurationCount: 3,
            liveMaxLatencyDurationCount: 6,
            enableSoftwareAES: false, // Disable for compatibility
            // Reduced timeouts for faster failure detection
            manifestLoadingTimeOut: 10000,
            manifestLoadingMaxRetry: 3,
            manifestLoadingRetryDelay: 1000,
            fragmentLoadingTimeOut: 20000,
            fragmentLoadingMaxRetry: 6,
            fragmentLoadingRetryDelay: 1000,
            startFragPrefetch: false, // Disable prefetch for compatibility
            testBandwidth: false,
            progressive: false, // Disable for HLS
            // Simplified ABR settings
            abrEwmaFastLive: 3.0,
            abrEwmaSlowLive: 9.0,
            abrEwmaFastVoD: 3.0,
            abrEwmaSlowVoD: 9.0,
            maxStarvationDelay: 4,
            maxLoadingDelay: 4,
            // Basic configuration
            startLevel: -1,
            capLevelToPlayerSize: false,
            // Simplified CORS setup for external CDN
            xhrSetup: function(xhr, url) {
              // Basic headers only
              xhr.setRequestHeader('Accept', '*/*');
              xhr.withCredentials = false;
              
              // Don't modify external CDN URLs
              if (url.includes('tiktokcdn.com')) {
                // Let external URLs load normally
                return;
              }
              
              // Only modify internal API URLs
              if (url.startsWith('/api/') || url.startsWith(window.location.origin)) {
                xhr.setRequestHeader('Cache-Control', 'no-cache');
                xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
              }
            }
          },
          // Basic buffering
          buffering: {
            enabled: true,
            length: 5,
            position: 2
          },
          preload: "metadata", // Reduce preload for external CDN
          // Basic JWPlayer settings
          bandwidthEstimate: 500000, // Conservative estimate
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
                // Cannot override toString, skipping
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
              // Continue without player obfuscation if it fails
            }
          }
        }, 500);
        
        // Handle autoplay and muting based on browser policies
        if (autoPlay) {
          try {
            // Try to play the video
            player.play();
            
            // Set mute state after attempting autoplay
            if (!muted) {
              // Small delay to ensure player is ready
              setTimeout(() => {
                player.setMute(false);
              }, 100);
            }
          } catch (e) {
            console.warn('Autoplay failed, trying muted autoplay:', e);
            // If autoplay fails, try with muted
            try {
              player.setMute(true);
              player.play();
            } catch (e2) {
              console.warn('Tất cả các lần thử autoplay đều thất bại:', e2);
            }
          }
        } else {
          // If not autoplay, just set the mute state
          if (!muted) {
            player.setMute(false);
          }
        }
        
        onLoad?.(); // Call onLoad callback
      });

      player.on('error', (e: any) => {
        // Check for empty error object first - this is a common JWPlayer/HLS.js issue that doesn't prevent playback
        if (Object.keys(e).length === 0 || (typeof e === 'object' && !e.code && !e.message && !e.type && !e.sourceError)) {
          // Empty error object - often the video still works despite this error, so we'll ignore it completely
          return; // Don't trigger any error handling, logging, or callbacks for empty errors
        }
        
        
        // Extract more detailed error information
        let errorDetails = '';
        if (e.code) errorDetails += `Code: ${e.code}, `;
        if (e.type) errorDetails += `Type: ${e.type}, `;
        if (e.message) errorDetails += `Message: ${e.message}, `;
        if (e.sourceError) errorDetails += `Source: ${JSON.stringify(e.sourceError)}, `;
        
        console.log('Error details:', errorDetails);
        
        // Handle different types of errors with retry logic
        let errorMessage = `Failed to load video: hls - ${videoId} (JWPlayer error: ${e.message || e.code || 'Unknown error'})`;
        let shouldRetry = false;
        
        // Provide more specific error messages for common issues
        if (e.code === 232011 || e.code === '232011') {
          errorMessage = `Failed to load video: hls - ${videoId} (HLS network error - cannot load segments)`;
          shouldRetry = false;
        } else if (e.code === 232404 || e.code === '232404') {
          errorMessage = `Failed to load video: hls - ${videoId} (HLS manifest not found)`;
          shouldRetry = false;
        } else if (e.message && e.message.includes('network')) {
          errorMessage = `Failed to load video: hls - ${videoId} (network error)`;
          shouldRetry = false; // Don't retry, trigger fallback instead
        } else if (e.message && e.message.includes('CORS')) {
          errorMessage = `Failed to load video: hls - ${videoId} (CORS error)`;
        } else if (e.message && e.message.includes('404')) {
          errorMessage = `Failed to load video: hls - ${videoId} (404 not found)`;
        } else if (e.code === 'hlsError' || e.type === 'hlsError') {
          errorMessage = `Failed to load video: hls - ${videoId} (HLS error)`;
          shouldRetry = false; // Don't retry, trigger fallback instead
        } else if (e.message && e.message.includes('core-shim')) {
          errorMessage = `Failed to load video: hls - ${videoId} (core-shim error)`;
          shouldRetry = false; // Don't retry, trigger fallback instead
        } else if (e.code === 232400 || String(e.code).includes('232400')) {
          // Specific handling for 232400 error (file not found)
          errorMessage = `Failed to load video: hls - ${videoId} (file not found)`;
          shouldRetry = false;
        }
        
        setError(errorMessage);
        
        // Auto-retry for network/HLS errors after a short delay
        if (shouldRetry) {
          setTimeout(() => {
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
        
        // Always call onError to trigger fallback in VideoPlayer
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
        if (!muted) {
          player.setMute(false);
        }
      });

      player.on('bufferChange', (e: any) => {
      });

      player.on('warning', (e: any) => {
        console.warn('JWPlayer warning:', e);
      });

      // Monitor playback issues
      player.on('playbackRateChanged', (e: any) => {
      });

      // Add network quality monitoring
      player.on('levels', () => {
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
