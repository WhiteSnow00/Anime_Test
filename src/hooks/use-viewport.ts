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
  isTouchDevice: boolean;
  isActualMobile: boolean;
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

  // Helper function to detect if device is actually mobile
  const detectActualMobile = useCallback(() => {
    if (typeof window === 'undefined') return false;
    
    // Check for touch support
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // Check user agent for mobile indicators
    const userAgent = navigator.userAgent.toLowerCase();
    const mobileKeywords = ['mobile', 'android', 'iphone', 'ipad', 'ipod', 'blackberry', 'windows phone'];
    const isMobileUA = mobileKeywords.some(keyword => userAgent.includes(keyword));
    
    // Check for mobile device characteristics
    const hasSmallScreen = window.screen && (window.screen.width <= 768 || window.screen.height <= 768);
    
    // Device is considered actually mobile if it has touch AND (mobile UA OR small screen)
    return isTouchDevice && (isMobileUA || hasSmallScreen);
  }, []);

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
        isTouchDevice: false,
        isActualMobile: false,
      };
    }

    const width = window.innerWidth;
    const height = window.innerHeight;
    const pixelRatio = window.devicePixelRatio || 1;
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // Initially use simple width-based detection to avoid hydration mismatch
    // The actual mobile detection will be done in useEffect after hydration
    const isMobile = width < mobileBreakpoint;

    return {
      width,
      height,
      isMobile,
      isTablet: width >= mobileBreakpoint && width < tabletBreakpoint,
      isDesktop: width >= tabletBreakpoint,
      orientation: width > height ? 'landscape' : 'portrait',
      pixelRatio,
      isTouchDevice,
      isActualMobile: false, // Will be updated after hydration
    };
  });

  const timeoutRef = useRef<NodeJS.Timeout>();

  const updateViewport = useCallback(() => {
    if (typeof window === 'undefined') return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const pixelRatio = window.devicePixelRatio || 1;
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isActualMobile = detectActualMobile();

    // For actual mobile devices, always consider them mobile regardless of orientation
    const isMobile = isActualMobile ? true : width < mobileBreakpoint;

    setViewport({
      width,
      height,
      isMobile,
      isTablet: !isActualMobile && width >= mobileBreakpoint && width < tabletBreakpoint,
      isDesktop: !isActualMobile && width >= tabletBreakpoint,
      orientation: width > height ? 'landscape' : 'portrait',
      pixelRatio,
      isTouchDevice,
      isActualMobile,
    });
  }, [mobileBreakpoint, tabletBreakpoint, detectActualMobile]);

  const debouncedUpdateViewport = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(updateViewport, debounceMs);
  }, [updateViewport, debounceMs]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Initial update with proper mobile detection after hydration
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
