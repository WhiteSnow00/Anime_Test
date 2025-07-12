"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { fp } from '@/lib/advanced-utils';

export interface VideoTransitionOptions {
  transitionDuration?: number;
  loadingDelay?: number;
  fadeInDuration?: number;
  preloadNext?: boolean;
}

export interface VideoTransitionState {
  isTransitioning: boolean;
  isLoading: boolean;
  isVisible: boolean;
  currentVideoId: string | null;
  nextVideoId: string | null;
  transitionPhase: 'idle' | 'fade-out' | 'loading' | 'fade-in' | 'complete';
}

export function useVideoTransition(
  videoId: string,
  options: VideoTransitionOptions = {}
) {
  const {
    transitionDuration = 300,
    loadingDelay = 100,
    fadeInDuration = 200,
    preloadNext = false,
  } = options;

  // Mobile-optimized transition settings
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const mobileOptimizedSettings = {
    transitionDuration: isMobile ? Math.min(transitionDuration, 250) : transitionDuration,
    loadingDelay: isMobile ? Math.min(loadingDelay, 80) : loadingDelay,
    fadeInDuration: isMobile ? Math.min(fadeInDuration, 150) : fadeInDuration,
  };

  const [state, setState] = useState<VideoTransitionState>({
    isTransitioning: false,
    isLoading: false,
    isVisible: true,
    currentVideoId: videoId,
    nextVideoId: null,
    transitionPhase: 'idle',
  });

  const timeoutRef = useRef<NodeJS.Timeout>();
  const previousVideoIdRef = useRef<string>(videoId);

  // Clean up timeouts
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Handle video ID changes with smooth transition
  useEffect(() => {
    if (previousVideoIdRef.current !== videoId) {
      startTransition(videoId);
      previousVideoIdRef.current = videoId;
    }
  }, [videoId]);

  const startTransition = useCallback((newVideoId: string) => {
    if (state.isTransitioning) return;

    setState(prev => ({
      ...prev,
      isTransitioning: true,
      nextVideoId: newVideoId,
      transitionPhase: 'fade-out',
      isVisible: false,
    }));      // Phase 1: Fade out current video
      timeoutRef.current = setTimeout(() => {
        setState(prev => ({
          ...prev,
          transitionPhase: 'loading',
          isLoading: true,
          currentVideoId: newVideoId,
          nextVideoId: null,
        }));

        // Phase 2: Load new video
        timeoutRef.current = setTimeout(() => {
          setState(prev => ({
            ...prev,
            transitionPhase: 'fade-in',
            isVisible: true,
          }));

          // Phase 3: Fade in new video
          timeoutRef.current = setTimeout(() => {
            setState(prev => ({
              ...prev,
              isTransitioning: false,
              isLoading: false,
              transitionPhase: 'complete',
            }));

            // Phase 4: Complete transition
            timeoutRef.current = setTimeout(() => {
              setState(prev => ({
                ...prev,
                transitionPhase: 'idle',
              }));
            }, 50);
          }, mobileOptimizedSettings.fadeInDuration);
        }, mobileOptimizedSettings.loadingDelay);
      }, mobileOptimizedSettings.transitionDuration);
  }, [state.isTransitioning, transitionDuration, loadingDelay, fadeInDuration]);

  // Force complete transition (useful for cleanup)
  const completeTransition = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setState(prev => ({
      ...prev,
      isTransitioning: false,
      isLoading: false,
      isVisible: true,
      currentVideoId: videoId,
      nextVideoId: null,
      transitionPhase: 'idle',
    }));
  }, [videoId]);

  // Reset to initial state
  const resetTransition = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    setState({
      isTransitioning: false,
      isLoading: false,
      isVisible: true,
      currentVideoId: videoId,
      nextVideoId: null,
      transitionPhase: 'idle',
    });
  }, [videoId]);

  // Debounced transition trigger for rapid episode changes
  const triggerTransition = useCallback(
    fp.debounce((newVideoId: string) => {
      startTransition(newVideoId);
    }, 150),
    [startTransition]
  );

  // Get transition styles for smooth animations (mobile-optimized)
  const getTransitionStyles = useCallback(() => {
    const duration = mobileOptimizedSettings.transitionDuration;
    const baseStyle = {
      transition: `opacity ${duration}ms cubic-bezier(0.4, 0, 0.2, 1), transform ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`,
      // Add will-change for better mobile performance
      willChange: 'opacity, transform',
    };

    switch (state.transitionPhase) {
      case 'fade-out':
        return {
          ...baseStyle,
          opacity: 0,
          transform: isMobile ? 'scale(0.99)' : 'scale(0.98)', // Less aggressive scaling on mobile
        };
      case 'loading':
        return {
          ...baseStyle,
          opacity: 0,
          transform: isMobile ? 'scale(0.99)' : 'scale(0.98)',
        };
      case 'fade-in':
        return {
          ...baseStyle,
          opacity: 1,
          transform: 'scale(1)',
        };
      default:
        return {
          ...baseStyle,
          opacity: 1,
          transform: 'scale(1)',
        };
    }
  }, [state.transitionPhase, mobileOptimizedSettings.transitionDuration, isMobile]);

  // Get container classes for different transition phases (mobile-optimized)
  const getContainerClasses = useCallback(() => {
    const baseClasses = 'relative overflow-hidden';
    
    switch (state.transitionPhase) {
      case 'loading':
        return `${baseClasses} ${isMobile ? 'opacity-60' : 'opacity-50'}`;
      case 'fade-out':
      case 'fade-in':
        return `${baseClasses} transition-all ${isMobile ? 'duration-200' : 'duration-300'}`;
      default:
        return baseClasses;
    }
  }, [state.transitionPhase, isMobile]);

  // Loading overlay component props (mobile-optimized)
  const getLoadingOverlayProps = useCallback(() => ({
    isVisible: state.isLoading || state.transitionPhase === 'loading',
    opacity: state.transitionPhase === 'loading' ? 1 : 0,
    transition: `opacity ${mobileOptimizedSettings.fadeInDuration}ms ease-in-out`,
  }), [state.isLoading, state.transitionPhase, mobileOptimizedSettings.fadeInDuration]);

  return {
    state,
    actions: {
      startTransition,
      completeTransition,
      resetTransition,
      triggerTransition,
    },
    styles: {
      getTransitionStyles,
      getContainerClasses,
      getLoadingOverlayProps,
    },
    computed: {
      shouldShowLoader: state.isLoading || state.transitionPhase === 'loading',
      isAnimating: state.isTransitioning,
      currentVideoId: state.currentVideoId,
      transitionProgress: state.transitionPhase === 'idle' ? 100 : 
                         state.transitionPhase === 'fade-out' ? 25 :
                         state.transitionPhase === 'loading' ? 50 :
                         state.transitionPhase === 'fade-in' ? 75 : 100,
    },
  };
}

// Higher-order hook for episode-specific video transitions
export function useEpisodeVideoTransition(
  episode: { id: number; title: string; servers: Record<string, string> },
  server: string,
  options: VideoTransitionOptions = {}
) {
  const videoId = episode.servers[server] || '';
  const episodeKey = `${episode.id}-${server}`;
  
  const transition = useVideoTransition(videoId, {
    ...options,
    // Add episode-specific optimizations
    preloadNext: true,
  });

  // Enhanced state with episode context
  const enhancedState = {
    ...transition.state,
    episodeId: episode.id,
    episodeTitle: episode.title,
    server,
    episodeKey,
  };

  // Episode-specific actions
  const enhancedActions = {
    ...transition.actions,
    switchEpisode: useCallback((newEpisode: typeof episode, newServer?: string) => {
      const targetServer = newServer || server;
      const newVideoId = newEpisode.servers[targetServer] || '';
      
      if (newVideoId && newVideoId !== videoId) {
        transition.actions.triggerTransition(newVideoId);
      }
    }, [episode, server, videoId, transition.actions]),
  };

  return {
    state: enhancedState,
    actions: enhancedActions,
    styles: transition.styles,
    computed: transition.computed,
  };
}
