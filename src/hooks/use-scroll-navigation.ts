"use client";

import { useRef, useCallback, useEffect } from 'react';

export interface ScrollSectionRefs {
  videoRef: React.RefObject<HTMLDivElement>;
  episodesRef: React.RefObject<HTMLDivElement>;
  infoRef: React.RefObject<HTMLDivElement>;
  commentRef: React.RefObject<HTMLDivElement>;
}

export interface ScrollActions {
  scrollToSection: (section: string) => void;
  scrollToTop: () => void;
  scrollToBottom: () => void;
  scrollToElement: (ref: React.RefObject<HTMLElement>) => void;
  isElementInView: (ref: React.RefObject<HTMLElement>) => boolean;
}

export interface UseScrollNavigationOptions {
  behavior?: ScrollBehavior;
  block?: ScrollLogicalPosition;
  inline?: ScrollLogicalPosition;
  offset?: number;
}

export function useScrollNavigation(options: UseScrollNavigationOptions = {}) {
  const {
    behavior = 'smooth',
    block = 'start',
    inline = 'nearest',
    offset = 0,
  } = options;

  // Create refs for sections
  const videoRef = useRef<HTMLDivElement>(null);
  const episodesRef = useRef<HTMLDivElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);
  const commentRef = useRef<HTMLDivElement>(null);

  // Intersection Observer for tracking visible sections
  const observerRef = useRef<IntersectionObserver | null>(null);
  const visibleSections = useRef<Set<string>>(new Set());

  // Generic scroll to element function
  const scrollToElement = useCallback((ref: React.RefObject<HTMLElement>) => {
    if (ref.current) {
      const element = ref.current;
      const elementPosition = element.offsetTop - offset;
      
      window.scrollTo({
        top: elementPosition,
        behavior,
      });
    }
  }, [behavior, offset]);

  // Check if element is in view
  const isElementInView = useCallback((ref: React.RefObject<HTMLElement>) => {
    if (!ref.current) return false;
    
    const rect = ref.current.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    
    return rect.top >= 0 && rect.bottom <= windowHeight;
  }, []);

  // Section-specific scroll functions
  const scrollToSection = useCallback((section: string) => {
    const sectionMap: Record<string, React.RefObject<HTMLElement>> = {
      video: videoRef,
      episodes: episodesRef,
      info: infoRef,
      comment: commentRef,
    };

    const targetRef = sectionMap[section];
    if (targetRef) {
      scrollToElement(targetRef);
    } else if (section === 'top') {
      scrollToTop();
    }
  }, [scrollToElement]);

  const scrollToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior });
  }, [behavior]);

  const scrollToBottom = useCallback(() => {
    window.scrollTo({ 
      top: document.documentElement.scrollHeight, 
      behavior 
    });
  }, [behavior]);

  // Setup intersection observer for tracking visible sections
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const sectionId = entry.target.id || entry.target.getAttribute('data-section');
          if (sectionId) {
            if (entry.isIntersecting) {
              visibleSections.current.add(sectionId);
            } else {
              visibleSections.current.delete(sectionId);
            }
          }
        });
      },
      {
        threshold: 0.3,
        rootMargin: '-20px 0px',
      }
    );

    observerRef.current = observer;

    // Observe sections when they're available
    const elements = [videoRef.current, episodesRef.current, infoRef.current];
    elements.forEach((element) => {
      if (element) observer.observe(element);
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  const refs: ScrollSectionRefs = {
    videoRef,
    episodesRef,
    infoRef,
    commentRef,
  };

  const actions: ScrollActions = {
    scrollToSection,
    scrollToTop,
    scrollToBottom,
    scrollToElement,
    isElementInView,
  };

  return { refs, actions };
}
