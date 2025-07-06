"use client";

import { useState, useEffect, useCallback, useRef } from 'react';

export interface ViewportState {
  width: number;
  height: number;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  orientation: 'portrait' | 'landscape';
  pixelRatio: number;
}

export interface UseViewportOptions {
  mobileBreakpoint?: number;
  tabletBreakpoint?: number;
  debounceMs?: number;
}

export function useViewport(options: UseViewportOptions = {}) {
  const {
    mobileBreakpoint = 768,
    tabletBreakpoint = 1024,
    debounceMs = 100,
  } = options;

  const [viewport, setViewport] = useState<ViewportState>(() => {
    if (typeof window === 'undefined') {
      return {
        width: 0,
        height: 0,
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        orientation: 'landscape',
        pixelRatio: 1,
      };
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    const pixelRatio = window.devicePixelRatio || 1;

    return {
      width,
      height,
      isMobile: width < mobileBreakpoint,
      isTablet: width >= mobileBreakpoint && width < tabletBreakpoint,
      isDesktop: width >= tabletBreakpoint,
      orientation: width > height ? 'landscape' : 'portrait',
      pixelRatio,
    };
  });

  const timeoutRef = useRef<NodeJS.Timeout>();

  const updateViewport = useCallback(() => {
    if (typeof window === 'undefined') return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const pixelRatio = window.devicePixelRatio || 1;

    setViewport({
      width,
      height,
      isMobile: width < mobileBreakpoint,
      isTablet: width >= mobileBreakpoint && width < tabletBreakpoint,
      isDesktop: width >= tabletBreakpoint,
      orientation: width > height ? 'landscape' : 'portrait',
      pixelRatio,
    });
  }, [mobileBreakpoint, tabletBreakpoint]);

  const debouncedUpdateViewport = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(updateViewport, debounceMs);
  }, [updateViewport, debounceMs]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Initial update
    updateViewport();

    // Event listeners
    window.addEventListener('resize', debouncedUpdateViewport, { passive: true });
    window.addEventListener('orientationchange', debouncedUpdateViewport);

    return () => {
      window.removeEventListener('resize', debouncedUpdateViewport);
      window.removeEventListener('orientationchange', debouncedUpdateViewport);
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [debouncedUpdateViewport, updateViewport]);

  return viewport;
}
