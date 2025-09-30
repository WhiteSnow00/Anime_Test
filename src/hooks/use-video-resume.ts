/**
 * Video Resume Hook
 * 
 * Manages playback progress tracking and resume functionality for video player.
 * 
 * Features:
 * - Debounced progress saving (3-5s intervals)
 * - Flush on pause/visibility change/beforeunload
 * - Resume dialog integration
 * - Declined prompt suppression
 */

"use client";

import { useEffect, useCallback, useRef, useState } from 'react';
import { isFeatureEnabled, getResumeConfig } from '@/lib/feature-flags';
import { 
  getUserId, 
  getProgress, 
  setProgress,
  clearProgress,
  type EpisodeProgress,
} from '@/lib/resume-storage';

interface UseVideoResumeOptions {
  /** Current episode ID */
  episodeId: number;
  
  /** User object from AuthContext */
  user?: { id: string } | null;
  
  /** Video duration in seconds (for completion detection) */
  duration?: number;
  
  /** Callback when resume is triggered */
  onResume?: (time: number) => void;
}

interface UseVideoResumeReturn {
  /** Saved progress for current episode */
  savedProgress: EpisodeProgress | null;
  
  /** Whether to show resume dialog */
  shouldShowDialog: boolean;
  
  /** Update playback progress (call from timeupdate) */
  updateProgress: (currentTime: number) => void;
  
  /** Flush progress immediately (call on pause) */
  flushProgress: () => void;
  
  /** Mark prompt as declined */
  markDeclined: () => void;
  
  /** Clear progress for current episode */
  clearEpisodeProgress: () => void;
  
  /** Check if episode is near completion */
  isNearCompletion: (currentTime: number) => boolean;
}

/**
 * Hook for managing video playback resume
 */
export function useVideoResume({
  episodeId,
  user,
  duration,
  onResume,
}: UseVideoResumeOptions): UseVideoResumeReturn {
  const [savedProgress, setSavedProgress] = useState<EpisodeProgress | null>(null);
  const [shouldShowDialog, setShouldShowDialog] = useState(false);
  const [hasCheckedResume, setHasCheckedResume] = useState(false);
  
  const userId = getUserId(user);
  const lastSavedTime = useRef<number>(0);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isFeatureActive = isFeatureEnabled('RESUME_FEATURE_ENABLED');
  
  const DEBOUNCE_MS = getResumeConfig('PROGRESS_SAVE_DEBOUNCE_MS');
  const MIN_THRESHOLD = getResumeConfig('MIN_RESUME_THRESHOLD');
  const MAX_PERCENTAGE = getResumeConfig('MAX_RESUME_PERCENTAGE');
  const TIME_TOLERANCE = getResumeConfig('DECLINED_TIME_TOLERANCE');

  // Load saved progress on mount or episode change
  useEffect(() => {
    if (!isFeatureActive) return;

    // Reset all state when episode changes
    setShouldShowDialog(false);
    setHasCheckedResume(false);
    lastSavedTime.current = 0;

    const progress = getProgress(userId, episodeId);
    setSavedProgress(progress);

    if (process.env.NODE_ENV === 'development') {
      console.info('[use-video-resume] Episode changed to', episodeId, '- loaded progress:', progress);
    }
  }, [episodeId, userId, isFeatureActive]);

  // Check if we should show resume dialog
  useEffect(() => {
    if (!isFeatureActive || hasCheckedResume || !savedProgress) return;

    const { time, declined } = savedProgress;

    if (process.env.NODE_ENV === 'development') {
      console.info('[use-video-resume] Checking resume eligibility:', {
        time,
        declined,
        MIN_THRESHOLD,
        duration,
      });
    }

    // Don't show if below threshold
    if (time < MIN_THRESHOLD) {
      if (process.env.NODE_ENV === 'development') {
        console.info('[use-video-resume] Below threshold, no dialog');
      }
      setHasCheckedResume(true);
      return;
    }

    // Don't show if near completion
    if (duration && time >= duration * MAX_PERCENTAGE) {
      if (process.env.NODE_ENV === 'development') {
        console.info('[use-video-resume] Near completion, no dialog');
      }
      setHasCheckedResume(true);
      return;
    }

    // Don't show if user previously declined
    if (declined) {
      if (process.env.NODE_ENV === 'development') {
        console.info('[use-video-resume] Previously declined, no dialog');
      }
      setHasCheckedResume(true);
      return;
    }

    // Show dialog
    if (process.env.NODE_ENV === 'development') {
      console.info('[use-video-resume] Showing resume dialog');
    }
    setShouldShowDialog(true);
    setHasCheckedResume(true);
  }, [
    isFeatureActive,
    hasCheckedResume,
    savedProgress,
    duration,
    MIN_THRESHOLD,
    MAX_PERCENTAGE,
  ]);

  /**
   * Save progress to storage (debounced)
   */
  const saveProgressDebounced = useCallback((time: number, currentEpisodeId: number) => {
    if (!isFeatureActive) return;

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Schedule save
    saveTimeoutRef.current = setTimeout(() => {
      setProgress(userId, currentEpisodeId, { time, declined: false });
      lastSavedTime.current = time;

      if (process.env.NODE_ENV === 'development') {
        console.info('[use-video-resume] Saved progress', { episodeId: currentEpisodeId, time });
      }
    }, DEBOUNCE_MS);
  }, [userId, isFeatureActive, DEBOUNCE_MS]);

  /**
   * Update progress (call from timeupdate event)
   */
  const updateProgress = useCallback((currentTime: number) => {
    if (!isFeatureActive || currentTime < 1) return;

    // Don't save if near completion
    if (duration && currentTime >= duration * MAX_PERCENTAGE) {
      return;
    }

    // Pass current episodeId to ensure correct episode is updated
    saveProgressDebounced(currentTime, episodeId);
  }, [isFeatureActive, duration, MAX_PERCENTAGE, saveProgressDebounced, episodeId]);

  /**
   * Flush progress immediately (call on pause/visibility change)
   */
  const flushProgress = useCallback(() => {
    if (!isFeatureActive) return;

    // Cancel pending save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    // Save immediately if we have a pending time
    if (lastSavedTime.current > 0) {
      setProgress(userId, episodeId, {
        time: lastSavedTime.current,
        declined: false
      });

      if (process.env.NODE_ENV === 'development') {
        console.info('[use-video-resume] Flushed progress', { episodeId, time: lastSavedTime.current });
      }
    }
  }, [userId, episodeId, isFeatureActive]);

  /**
   * Mark prompt as declined
   */
  const markDeclined = useCallback(() => {
    if (!isFeatureActive || !savedProgress) return;
    
    setProgress(userId, episodeId, { 
      time: savedProgress.time, 
      declined: true 
    });
    setShouldShowDialog(false);
    
    if (process.env.NODE_ENV === 'development') {
      console.info('[use-video-resume] Marked as declined', { episodeId });
    }
  }, [userId, episodeId, savedProgress, isFeatureActive]);

  /**
   * Clear progress for current episode
   */
  const clearEpisodeProgress = useCallback(() => {
    if (!isFeatureActive) return;
    
    clearProgress(userId, episodeId);
    setSavedProgress(null);
    lastSavedTime.current = 0;
  }, [userId, episodeId, isFeatureActive]);

  /**
   * Check if video is near completion
   */
  const isNearCompletion = useCallback((currentTime: number): boolean => {
    if (!duration) return false;
    return currentTime >= duration * MAX_PERCENTAGE;
  }, [duration, MAX_PERCENTAGE]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Flush on visibility change
  useEffect(() => {
    if (!isFeatureActive) return;
    
    const handleVisibilityChange = () => {
      if (document.hidden) {
        flushProgress();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [flushProgress, isFeatureActive]);

  // Flush on beforeunload
  useEffect(() => {
    if (!isFeatureActive) return;
    
    const handleBeforeUnload = () => {
      flushProgress();
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [flushProgress, isFeatureActive]);

  return {
    savedProgress,
    shouldShowDialog,
    updateProgress,
    flushProgress,
    markDeclined,
    clearEpisodeProgress,
    isNearCompletion,
  };
}

