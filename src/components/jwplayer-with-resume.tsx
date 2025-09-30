/**
 * JWPlayer with Resume Functionality
 *
 * Wrapper component that adds resume memory to JWPlayer:
 * - Tracks playback progress with debouncing
 * - Shows "Continue watching?" dialog on episode load
 * - Handles seek to saved position
 * - Manages declined prompt state
 */

"use client";

import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useVideoResume } from '@/hooks/use-video-resume';
import { ResumeDialog } from './resume-dialog';
import { isFeatureEnabled } from '@/lib/feature-flags';
// Import the actual JWPlayer component used in the project
import NJWPlayerComponent from './new-jwplayer';

interface JWPlayerWithResumeProps {
  videoId: string;
  server: "hls" | "helvid" | "hydax";
  episodeId: number;
  episodeNumber: number;
  autoPlay?: boolean;
  muted?: boolean;
  controls?: boolean;
  onLoad?: () => void;
  onError?: (error: string) => void;
  className?: string;
  chapters?: number[];
}

// Global player instance tracker
let globalPlayerInstance: any = null;

// Module load verification
console.warn('📦 jwplayer-with-resume.tsx MODULE LOADED');

/**
 * JWPlayer with integrated resume functionality
 */
export function JWPlayerWithResume({
  videoId,
  server,
  episodeId,
  episodeNumber,
  autoPlay = false,
  muted = false,
  controls = true,
  onLoad,
  onError,
  className = "",
  chapters = [],
}: JWPlayerWithResumeProps) {
  // CRITICAL: Log component render
  console.warn('🎬 JWPlayerWithResume RENDERED', { episodeId, episodeNumber, videoId });

  const { user } = useAuth();
  const [playerReady, setPlayerReady] = useState(false);
  const [duration, setDuration] = useState(0);
  const [hasAppliedResume, setHasAppliedResume] = useState(false);
  const playerInstanceRef = useRef<any>(null);
  const resumeAppliedRef = useRef(false);

  const isResumeEnabled = isFeatureEnabled('RESUME_FEATURE_ENABLED');
  const isPromptEnabled = isFeatureEnabled('RESUME_PROMPT_ENABLED');

  console.warn('🎬 JWPlayerWithResume FLAGS', { isResumeEnabled, isPromptEnabled });

  // Resume hook
  const {
    savedProgress,
    shouldShowDialog,
    updateProgress,
    flushProgress,
    markDeclined,
    clearEpisodeProgress,
    isNearCompletion,
  } = useVideoResume({
    episodeId,
    user,
    duration,
  });

  // Debug logging on mount and state changes
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[jwplayer-resume] State update:', {
        episodeId,
        episodeNumber,
        isResumeEnabled,
        isPromptEnabled,
        playerReady,
        savedProgress,
        shouldShowDialog,
        hasAppliedResume,
      });
    }
  }, [episodeId, episodeNumber, isResumeEnabled, isPromptEnabled, playerReady, savedProgress, shouldShowDialog, hasAppliedResume]);

  /**
   * Seek to specific time
   */
  const seekTo = useCallback((time: number) => {
    if (!playerInstanceRef.current) return;
    
    try {
      // JWPlayer API
      if (typeof playerInstanceRef.current.seek === 'function') {
        playerInstanceRef.current.seek(time);
      }
      // HTML5 video fallback
      else if (playerInstanceRef.current.currentTime !== undefined) {
        playerInstanceRef.current.currentTime = time;
      }
      
      if (process.env.NODE_ENV === 'development') {
  console.warn('[jwplayer-resume] Seeked to', time);
      }
    } catch (error) {
      console.error('[jwplayer-resume] Seek error:', error);
    }
  }, []);

  /**
   * Handle resume dialog - Continue
   */
  const handleContinue = useCallback(() => {
    if (!savedProgress) return;
    
    seekTo(savedProgress.time);
    setHasAppliedResume(true);
    resumeAppliedRef.current = true;
    try {
      const p = playerInstanceRef.current;
      p?.play?.(true);
    } catch {}
    
    if (process.env.NODE_ENV === 'development') {
  console.warn('[jwplayer-resume] Resumed from', savedProgress.time);
    }
  }, [savedProgress, seekTo]);

  /**
   * Handle resume dialog - Start Over
   */
  const handleStartOver = useCallback(() => {
    markDeclined();
    setHasAppliedResume(true);
    resumeAppliedRef.current = true;
    try {
      const p = playerInstanceRef.current;
      p?.play?.(true);
    } catch {}
    
    if (process.env.NODE_ENV === 'development') {
  console.warn('[jwplayer-resume] User declined resume');
    }
  }, [markDeclined]);

  /**
   * Handle player load
   */
  const handlePlayerLoad = useCallback(() => {
    setPlayerReady(true);
    onLoad?.();
  }, [onLoad]);

  /**
   * Expose player instance for time tracking
   * Uses multiple strategies to capture the JWPlayer instance
   */
  useEffect(() => {
    if (!isResumeEnabled || !playerReady) return;

    let mounted = true;
    let retryCount = 0;
    const maxRetries = 10;

    const checkPlayer = () => {
      if (!mounted) return;

      const jwplayer = (window as any).jwplayer;
      if (!jwplayer) {
        if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(checkPlayer, 200);
        }
        return;
      }

      try {
        // Try multiple methods to get player instance
        let player = null;

        // Method 1: Get by index
        try {
          player = jwplayer(0);
        } catch (e) {
          // Method 2: Get by ID (common pattern)
          try {
            player = jwplayer('player-container');
          } catch (e2) {
            // Method 3: Get first available player
            const players = document.querySelectorAll('.jwplayer');
            if (players.length > 0) {
              const playerId = players[0].id;
              if (playerId) {
                player = jwplayer(playerId);
              }
            }
          }
        }

        if (player && typeof player.on === 'function') {
          playerInstanceRef.current = player;
          globalPlayerInstance = player;

          // Listen to time updates
          player.on('time', (e: any) => {
            if (!mounted) return;

            const currentTime = e?.position || 0;
            const dur = e?.duration || 0;

            if (dur > 0 && dur !== duration) {
              setDuration(dur);
            }

            // Update progress (debounced)
            if (currentTime > 0 && !isNearCompletion(currentTime)) {
              updateProgress(currentTime);
            }
          });

          // Flush on pause
          player.on('pause', () => {
            if (!mounted) return;
            flushProgress();
          });

          // Clear progress on complete (treat as finished)
          player.on('complete', () => {
            if (!mounted) return;
            try {
              clearEpisodeProgress();
            } catch (e) {
              console.warn('[jwplayer-resume] Failed to clear progress on complete:', e);
            }
          });

          // Get duration when ready
          player.on('ready', () => {
            if (!mounted) return;
            try {
              const dur = player.getDuration();
              if (dur > 0) {
                setDuration(dur);
              }
            } catch (e) {
              console.warn('[jwplayer-resume] Could not get duration:', e);
            }
          });

          if (process.env.NODE_ENV === 'development') {
            console.warn('[jwplayer-resume] Player instance attached successfully');
          }
        } else if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(checkPlayer, 200);
        }
      } catch (error) {
        console.error('[jwplayer-resume] Failed to attach player:', error);
        if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(checkPlayer, 200);
        }
      }
    };

    // Start checking after a short delay to ensure player is initialized
    const initialTimer = setTimeout(checkPlayer, 300);

    return () => {
      mounted = false;
      clearTimeout(initialTimer);
    };
  }, [
    isResumeEnabled,
    playerReady,
    updateProgress,
    flushProgress,
    isNearCompletion,
    duration,
    clearEpisodeProgress,
  ]);

  // Detect page reloads (for auto-continue behavior on refresh)
  const isPageReloadRef = useRef(false);
  useEffect(() => {
    try {
      const navEntries = (performance?.getEntriesByType?.('navigation') || []) as any[];
      if (navEntries.length > 0) {
        isPageReloadRef.current = navEntries[0]?.type === 'reload';
      } else {
        // Legacy fallback
        // @ts-ignore
        const nav = (performance as any).navigation;
        isPageReloadRef.current = nav && nav.type === 1; // 1 = reload
      }
    } catch {}
  }, []);

  // Auto-apply resume if no dialog needed; on page reload do NOT override if prompt should show
  useEffect(() => {
    if (!isResumeEnabled) return;
    if (!playerReady || hasAppliedResume || resumeAppliedRef.current) return;
    if (!savedProgress) return;

    // On refresh: continue automatically only if no prompt is expected
    if (
      isPageReloadRef.current &&
      savedProgress.time > 0 &&
      !savedProgress.declined &&
      !(isPromptEnabled && shouldShowDialog)
    ) {
      const timer = setTimeout(() => {
        seekTo(savedProgress.time);
        setHasAppliedResume(true);
        resumeAppliedRef.current = true;
        if (process.env.NODE_ENV === 'development') {
          console.warn('[jwplayer-resume] Auto-resumed after page reload to', savedProgress.time);
        }
      }, 400);
      return () => clearTimeout(timer);
    }

    // If dialog should show (non-reload), don't auto-seek
    if (shouldShowDialog) return;

    // Auto-seek on refresh if progress exists
    if (savedProgress.time > 0 && !savedProgress.declined) {
      // Wait a bit for player to be fully ready
      const timer = setTimeout(() => {
        seekTo(savedProgress.time);
        setHasAppliedResume(true);
        resumeAppliedRef.current = true;

        if (process.env.NODE_ENV === 'development') {
          console.warn('[jwplayer-resume] Auto-seeked to', savedProgress.time);
        }
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [
    isResumeEnabled,
    playerReady,
    hasAppliedResume,
    savedProgress,
    shouldShowDialog,
    isPromptEnabled,
    seekTo,
  ]);

  // Reset resume state on episode change
  useEffect(() => {
    setHasAppliedResume(false);
    resumeAppliedRef.current = false;
    setPlayerReady(false);
    setDuration(0);

    if (process.env.NODE_ENV === 'development') {
      console.warn('[jwplayer-resume] Episode changed to', episodeId, '- resetting state');
    }
  }, [episodeId]);

  // If a resume prompt should show, ensure playback is paused until user decides
  useEffect(() => {
    if (!isResumeEnabled) return;
    if (isPromptEnabled && shouldShowDialog) {
      try {
        const p = playerInstanceRef.current;
        p?.pause?.();
      } catch {}
    }
  }, [isResumeEnabled, isPromptEnabled, shouldShowDialog]);

  return (
    <>
      {/* Visual indicator that resume wrapper is active (dev only) */}
      {process.env.NODE_ENV === 'development' && (
        <div
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            background: 'rgba(34, 197, 94, 0.9)',
            color: 'white',
            padding: '4px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 'bold',
            zIndex: 9999,
            pointerEvents: 'none',
          }}
        >
          RESUME ACTIVE (Ep {episodeId})
        </div>
      )}

      <NJWPlayerComponent
        videoId={videoId}
        server={server}
        autoPlay={autoPlay && !(isPromptEnabled && shouldShowDialog)}
        muted={muted}
        controls={controls}
        onLoad={handlePlayerLoad}
        onError={onError}
        className={className}
        chapters={chapters}
      />

      {isResumeEnabled && isPromptEnabled && shouldShowDialog && savedProgress && (
        <ResumeDialog
          open={shouldShowDialog && !hasAppliedResume}
          episodeNumber={episodeNumber}
          savedTime={savedProgress.time}
          onContinue={handleContinue}
          onStartOver={handleStartOver}
        />
      )}
    </>
  );
}

export default JWPlayerWithResume;

