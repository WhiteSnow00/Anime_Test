"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useVideoResume } from "@/hooks/use-video-resume";
import { isFeatureEnabled, getResumeConfig } from "@/lib/feature-flags";
import type { NextEpisodeAction, PlayerMediaHandle } from "@/lib/player-media";
import { ResumeDialog } from "./resume-dialog";
import NJWPlayerComponent from "./new-jwplayer";

interface JWPlayerWithResumeProps {
  videoId: string;
  server: string;
  episodeId: number;
  episodeNumber: number;
  autoPlay?: boolean;
  muted?: boolean;
  controls?: boolean;
  onLoad?: () => void;
  onError?: (error: string) => void;
  onHudHeightChange?: (height: number) => void;
  className?: string;
  chapters?: number[];
  nextEpisode?: NextEpisodeAction;
}

// Keying the session also resets stale async resume attempts when callers reuse
// the wrapper for another source/episode instead of remounting it themselves.
export function JWPlayerWithResume(props: JWPlayerWithResumeProps) {
  return <ResumeSession key={`${props.server}:${props.videoId}:${props.episodeId}`} {...props} />;
}

function ResumeSession({
  videoId,
  server,
  episodeId,
  episodeNumber,
  autoPlay = false,
  muted = false,
  controls = true,
  onLoad,
  onError,
  onHudHeightChange,
  className = "",
  chapters = [],
  nextEpisode,
}: JWPlayerWithResumeProps) {
  const { user } = useAuth();
  const [media, setMedia] = useState<PlayerMediaHandle | null>(null);
  const [duration, setDuration] = useState(0);
  const [hasAppliedResume, setHasAppliedResume] = useState(false);
  const [resumePending, setResumePending] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const mountedRef = useRef(true);
  const applyingRef = useRef(false);
  const decisionRef = useRef(false);
  const autoAttemptedRef = useRef(false);

  const isResumeEnabled = isFeatureEnabled("RESUME_FEATURE_ENABLED");
  const isPromptEnabled = isFeatureEnabled("RESUME_PROMPT_ENABLED");
  const minThreshold = getResumeConfig("MIN_RESUME_THRESHOLD");
  const maxPercentage = getResumeConfig("MAX_RESUME_PERCENTAGE");
  const mediaReady = media !== null && duration > 0 && media.canSeek();
  const {
    savedProgress,
    shouldShowDialog,
    updateProgress,
    flushProgress,
    markDeclined,
    clearEpisodeProgress,
    isNearCompletion,
  } = useVideoResume({ episodeId, user, duration, mediaReady });

  const needsDecision = isResumeEnabled && !hasAppliedResume && !!savedProgress &&
    Number.isFinite(savedProgress.time) && savedProgress.time >= minThreshold &&
    !savedProgress.declined && (duration === 0 || savedProgress.time < duration * maxPercentage);
  const dialogOpen = mediaReady && needsDecision && isPromptEnabled && shouldShowDialog;
  const holdPlayback = needsDecision || resumePending;
  const holdRef = useRef(holdPlayback);
  holdRef.current = holdPlayback;

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const handleMediaReady = useCallback((handle: PlayerMediaHandle) => {
    if (!handle.canSeek()) return;
    setDuration(handle.getDuration());
    setMedia(handle);
    if (holdRef.current) handle.pause();
  }, []);

  useEffect(() => {
    if (!holdPlayback) return;
    media?.pause();
  }, [holdPlayback, media]);

  const applyResume = useCallback(async (): Promise<boolean> => {
    if (applyingRef.current || !media || !savedProgress || !media.canSeek(savedProgress.time)) return false;
    applyingRef.current = true;
    setResumePending(true);
    setResumeError(null);
    media.pause();
    const success = await media.seekTo(savedProgress.time);
    if (!mountedRef.current) return false;
    applyingRef.current = false;
    setResumePending(false);
    if (!success) {
      setResumeError("Chưa tua được đến vị trí đã lưu. Bạn có thể thử lại.");
      return false;
    }
    decisionRef.current = true;
    setHasAppliedResume(true);
    media.play();
    return true;
  }, [media, savedProgress]);

  const handleStartOver = useCallback(async () => {
    if (applyingRef.current) return;
    markDeclined();
    decisionRef.current = true;
    setHasAppliedResume(true);
    setResumeError(null);
    if (media && (media.getVideo()?.currentTime ?? 0) > 0.5) await media.seekTo(0);
    if (mountedRef.current) media?.play();
  }, [markDeclined, media]);

  useEffect(() => {
    if (isPromptEnabled || !needsDecision || !mediaReady || autoAttemptedRef.current) return;
    autoAttemptedRef.current = true;
    void applyResume();
  }, [applyResume, isPromptEnabled, mediaReady, needsDecision]);

  // Native listeners bind to this exact video's lifetime. No global player
  // lookup, late ready listener, or accumulating anonymous JW listeners.
  const progressCallbacks = useRef({ updateProgress, flushProgress, clearEpisodeProgress, isNearCompletion });
  progressCallbacks.current = { updateProgress, flushProgress, clearEpisodeProgress, isNearCompletion };
  useEffect(() => {
    const video = media?.getVideo();
    if (!isResumeEnabled || !video) return;
    const onTime = () => {
      if (holdRef.current && !decisionRef.current || video.seeking || applyingRef.current) return;
      setDuration(Number.isFinite(video.duration) ? video.duration : 0);
      if (video.currentTime > 0 && !progressCallbacks.current.isNearCompletion(video.currentTime)) {
        progressCallbacks.current.updateProgress(video.currentTime);
      }
    };
    const onPause = () => {
      if (holdRef.current && !decisionRef.current || applyingRef.current) return;
      progressCallbacks.current.flushProgress();
    };
    const onEnded = () => progressCallbacks.current.clearEpisodeProgress();
    video.addEventListener("timeupdate", onTime);
    video.addEventListener("pause", onPause);
    video.addEventListener("ended", onEnded);
    return () => {
      video.removeEventListener("timeupdate", onTime);
      video.removeEventListener("pause", onPause);
      video.removeEventListener("ended", onEnded);
    };
  }, [isResumeEnabled, media]);

  return (
    <>
      <NJWPlayerComponent
        videoId={videoId}
        server={server}
        autoPlay={autoPlay && !holdPlayback}
        muted={muted}
        controls={controls}
        onLoad={onLoad}
        onMediaReady={handleMediaReady}
        onError={onError}
        onHudHeightChange={onHudHeightChange}
        className={className}
        chapters={chapters}
        nextEpisode={nextEpisode}
      />
      {isResumeEnabled && isPromptEnabled && savedProgress && (
        <ResumeDialog
          open={dialogOpen}
          episodeNumber={episodeNumber}
          savedTime={savedProgress.time}
          onContinue={applyResume}
          onStartOver={handleStartOver}
          pending={resumePending}
          error={resumeError}
        />
      )}
    </>
  );
}

export default JWPlayerWithResume;
