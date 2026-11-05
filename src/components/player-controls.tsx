"use client";

import React, { useRef, useState } from "react";
import * as Slider from "@radix-ui/react-slider";
import { Camera, Flag, PictureInPicture2 } from "lucide-react";
import {
  Maximize,
  Minimize,
  Pause,
  Play,
  Volume1,
  Volume2,
  VolumeX,
} from "lucide";
import { MorphIcon } from "morphicons/react";
import { BackwardIcon, ForwardIcon } from "./ui/player-icon";
import { cn } from "@/lib/utils";

interface PlayerControlsProps {
  visible: boolean;
  isTouchDevice: boolean;
  isPlaying: boolean;
  isReady: boolean;
  isBuffering: boolean;
  isMuted: boolean;
  isFullscreen: boolean;
  isInPip: boolean;
  pipSupported: boolean;
  canCapture: boolean;
  hasChapters: boolean;
  position: number;
  duration: number;
  buffered: number;
  volume: number;
  onTogglePlay: () => void;
  onSkip: (seconds: number) => void;
  onSeekPreview: (seconds: number) => void;
  onSeekCommit: (seconds: number) => void;
  onScrubStart: () => void;
  onToggleMute: () => void;
  onVolumeChange: (volume: number) => void;
  onNextChapter: () => void;
  onCapture: () => void;
  onTogglePip: () => void;
  onToggleFullscreen: () => void;
  onInteraction: () => void;
  onHoverChange: (hovering: boolean) => void;
}

function formatTime(seconds: number) {
  const total = Math.floor(Number.isFinite(seconds) ? Math.max(0, seconds) : 0);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainder = String(total % 60).padStart(2, "0");
  return hours > 0
    ? `${hours}:${String(minutes).padStart(2, "0")}:${remainder}`
    : `${minutes}:${remainder}`;
}

const buttonClass =
  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white/85 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300/80 disabled:pointer-events-none disabled:opacity-35";

export const PlayerControls = React.forwardRef<HTMLDivElement, PlayerControlsProps>(
  function PlayerControls(
    {
      visible,
      isTouchDevice,
      isPlaying,
      isReady,
      isBuffering,
      isMuted,
      isFullscreen,
      isInPip,
      pipSupported,
      canCapture,
      hasChapters,
      position,
      duration,
      buffered,
      volume,
      onTogglePlay,
      onSkip,
      onSeekPreview,
      onSeekCommit,
      onScrubStart,
      onToggleMute,
      onVolumeChange,
      onNextChapter,
      onCapture,
      onTogglePip,
      onToggleFullscreen,
      onInteraction,
      onHoverChange,
    },
    ref
  ) {
    const [showRemaining, setShowRemaining] = useState(false);
    const [hoverTime, setHoverTime] = useState<{ percent: number; time: number } | null>(null);
    const [scrubTime, setScrubTime] = useState<number | null>(null);
    const scrubbingRef = useRef(false);
    const dragPointerIdRef = useRef<number | null>(null);
    const latestScrubTimeRef = useRef<number | null>(null);
    const safeDuration = Number.isFinite(duration) ? Math.max(0, duration) : 0;
    const currentTime = Math.max(0, Math.min(safeDuration, scrubTime ?? position));
    const playedPercent = safeDuration > 0 ? (currentTime / safeDuration) * 100 : 0;
    const bufferedPercent = safeDuration > 0 ? Math.max(0, Math.min(100, (buffered / safeDuration) * 100)) : 0;
    const playLabel = isPlaying ? "Tạm dừng" : "Phát video";
    const muteLabel = isMuted || volume === 0 ? "Bật âm thanh" : "Tắt âm thanh";
    const fullscreenLabel = isFullscreen ? "Thoát toàn màn hình" : "Toàn màn hình";
    const volumeIcon = isMuted || volume === 0 ? VolumeX : volume > 50 ? Volume2 : Volume1;

    const finishScrubbing = () => {
      if (!scrubbingRef.current) return;
      // Use a ref, not the last React render: pointerup can follow pointermove
      // within one frame. Commit once even after pointercancel/lost capture.
      const target = latestScrubTimeRef.current ?? currentTime;
      scrubbingRef.current = false;
      dragPointerIdRef.current = null;
      latestScrubTimeRef.current = null;
      onSeekCommit(target);
      setScrubTime(null);
      onInteraction();
    };

    return (
      <>
        {isTouchDevice && (
          <div
            aria-hidden={!visible}
            className={`pointer-events-none absolute inset-0 z-40 flex items-center justify-center transition-opacity duration-200 motion-reduce:transition-none ${visible ? "opacity-100" : "opacity-0"}`}
          >
            <div className="flex -translate-y-3 items-center gap-6 sm:translate-y-0 sm:gap-10">
              <button
                type="button"
                aria-label="Lùi 10 giây"
                tabIndex={visible ? 0 : -1}
                disabled={!isReady || safeDuration === 0}
                className={cn(buttonClass, "h-12 w-12 rounded-full bg-black/35", visible ? "pointer-events-auto" : "pointer-events-none")}
                onClick={() => { onSkip(-10); onInteraction(); }}
              >
                <BackwardIcon className="h-8 w-8" />
              </button>
              <button
                type="button"
                aria-label={playLabel}
                tabIndex={visible ? 0 : -1}
                disabled={!isReady || isBuffering}
                className={cn(buttonClass, "h-16 w-16 rounded-full bg-black/50", visible ? "pointer-events-auto" : "pointer-events-none", isBuffering && "invisible")}
                onClick={() => { onTogglePlay(); onInteraction(); }}
              >
                <MorphIcon icon={isPlaying ? Pause : Play} size={32} strokeWidth={2.2} spring="snappy" reducedMotion="user" />
              </button>
              <button
                type="button"
                aria-label="Tiến 10 giây"
                tabIndex={visible ? 0 : -1}
                disabled={!isReady || safeDuration === 0}
                className={cn(buttonClass, "h-12 w-12 rounded-full bg-black/35", visible ? "pointer-events-auto" : "pointer-events-none")}
                onClick={() => { onSkip(10); onInteraction(); }}
              >
                <ForwardIcon className="h-8 w-8" />
              </button>
            </div>
          </div>
        )}

        <div
          ref={ref}
          role="group"
          aria-label="Điều khiển video"
          aria-hidden={!visible}
          className={`absolute inset-x-0 bottom-0 z-30 bg-gradient-to-t from-black/95 via-black/65 to-transparent px-3 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-8 text-white transition-opacity duration-200 motion-reduce:transition-none sm:px-5 sm:pb-[max(0.5rem,env(safe-area-inset-bottom))] ${visible ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"}`}
          onClick={(event) => event.stopPropagation()}
          onMouseDown={(event) => event.stopPropagation()}
          onMouseEnter={() => onHoverChange(true)}
          onMouseLeave={() => onHoverChange(false)}
          onFocusCapture={onInteraction}
        >
          <div
            className="group/timeline relative mb-1"
            onMouseMove={(event) => {
              if (isTouchDevice || safeDuration === 0) return;
              const rect = event.currentTarget.getBoundingClientRect();
              const percent = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
              setHoverTime({ percent: percent * 100, time: percent * safeDuration });
            }}
            onMouseLeave={() => setHoverTime(null)}
          >
            <Slider.Root
              aria-label="Tiến trình phát"
              min={0}
              max={safeDuration || 1}
              step={0.1}
              value={[currentTime]}
              disabled={!isReady || safeDuration === 0}
              className="relative flex h-6 w-full touch-none select-none items-center data-[disabled]:opacity-40"
              onPointerDownCapture={(event) => {
                if (scrubbingRef.current || event.button !== 0 || !isReady || safeDuration === 0) return;
                scrubbingRef.current = true;
                dragPointerIdRef.current = event.pointerId;
                latestScrubTimeRef.current = currentTime;
                setScrubTime(currentTime);
                onScrubStart();
                onInteraction();
              }}
              onValueChange={([nextTime]) => {
                if (scrubbingRef.current) {
                  latestScrubTimeRef.current = nextTime;
                  setScrubTime(nextTime);
                  onSeekPreview(nextTime);
                } else {
                  onSeekCommit(nextTime);
                }
                onInteraction();
              }}
              onValueCommit={() => finishScrubbing()}
              onPointerUp={(event) => {
                if (event.pointerId === dragPointerIdRef.current) finishScrubbing();
              }}
              onPointerCancel={(event) => {
                if (event.pointerId === dragPointerIdRef.current) finishScrubbing();
              }}
              onLostPointerCapture={(event) => {
                if (event.pointerId === dragPointerIdRef.current) finishScrubbing();
              }}
            >
              <Slider.Track className="relative h-[3px] w-full grow overflow-hidden rounded-full bg-white/20 transition-[height] duration-150 group-hover/timeline:h-[5px] group-focus-within/timeline:h-[5px]">
                <div className="absolute inset-y-0 left-0 bg-white/30" style={{ width: `${bufferedPercent}%` }} />
                <Slider.Range className="absolute h-full bg-white/95" />
              </Slider.Track>
              <Slider.Thumb
                aria-label="Tiến trình phát"
                aria-valuetext={`${formatTime(currentTime)} / ${formatTime(safeDuration)}`}
                tabIndex={visible ? 0 : -1}
                className={cn("block h-2.5 w-2.5 rounded-full bg-white transition-opacity duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black", scrubTime !== null || isTouchDevice ? "opacity-100" : "opacity-0 group-hover/timeline:opacity-100 group-focus-within/timeline:opacity-100")}
              />
            </Slider.Root>
            {(hoverTime || scrubTime !== null) && (
              <div
                className="pointer-events-none absolute bottom-8 rounded-lg border border-white/10 bg-zinc-950/95 px-3 py-1.5 text-xs font-medium tabular-nums text-white shadow-lg"
                style={{
                  left: `clamp(2rem, ${scrubTime !== null ? playedPercent : hoverTime?.percent ?? 0}%, calc(100% - 2rem))`,
                  transform: "translateX(-50%)",
                }}
              >
                {formatTime(scrubTime ?? hoverTime?.time ?? currentTime)}
              </div>
            )}
          </div>

          <div className="flex min-h-11 flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
            <div className="flex min-w-0 items-center gap-0.5 sm:gap-1">
              {!isTouchDevice && (
                <>
                  <button type="button" aria-label={playLabel} title={`${playLabel} (Space)`} disabled={!isReady} tabIndex={visible ? 0 : -1} className={buttonClass} onClick={() => { onTogglePlay(); onInteraction(); }}>
                    <MorphIcon icon={isPlaying ? Pause : Play} size={25} strokeWidth={2.2} spring="snappy" reducedMotion="user" />
                  </button>
                  <div className="hidden items-center gap-0.5 sm:flex">
                    <button type="button" aria-label="Lùi 10 giây" title="Lùi 10 giây (←)" disabled={!isReady || safeDuration === 0} tabIndex={visible ? 0 : -1} className={buttonClass} onClick={() => { onSkip(-10); onInteraction(); }}>
                      <BackwardIcon className="h-7 w-7" />
                    </button>
                    <button type="button" aria-label="Tiến 10 giây" title="Tiến 10 giây (→)" disabled={!isReady || safeDuration === 0} tabIndex={visible ? 0 : -1} className={buttonClass} onClick={() => { onSkip(10); onInteraction(); }}>
                      <ForwardIcon className="h-7 w-7" />
                    </button>
                  </div>
                </>
              )}
              <div className="group/volume flex shrink-0 items-center">
                <button type="button" aria-label={muteLabel} title={`${muteLabel} (M)`} aria-pressed={isMuted || volume === 0} disabled={!isReady} tabIndex={visible ? 0 : -1} className={buttonClass} onClick={() => { onToggleMute(); onInteraction(); }}>
                  <MorphIcon icon={volumeIcon} size={25} strokeWidth={2} spring="snappy" reducedMotion="user" />
                </button>
                {!isTouchDevice && (
                  <Slider.Root
                    aria-label="Âm lượng"
                    min={0}
                    max={100}
                    step={1}
                    value={[isMuted ? 0 : volume]}
                    disabled={!isReady}
                    className="group/volume-slider relative mr-3 hidden h-8 w-[72px] touch-none select-none items-center md:flex"
                    onValueChange={([value]) => { onVolumeChange(value); onInteraction(); }}
                  >
                    <Slider.Track className="relative h-[3px] w-full grow overflow-hidden rounded-full bg-white/20">
                      <Slider.Range className="absolute h-full bg-white/90" />
                    </Slider.Track>
                    <Slider.Thumb
                      aria-label="Âm lượng"
                      aria-valuetext={`${isMuted ? 0 : volume}%`}
                      tabIndex={visible ? 0 : -1}
                      className="block h-2 w-2 rounded-full bg-white opacity-0 transition-opacity duration-150 group-hover/volume:opacity-100 group-focus-within/volume:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                    />
                  </Slider.Root>
                )}
              </div>
              <button
                type="button"
                tabIndex={visible ? 0 : -1}
                aria-label={showRemaining ? "Hiển thị thời gian đã xem" : "Hiển thị thời gian còn lại"}
                title="Bấm để đổi cách hiển thị thời gian"
                className="flex h-11 shrink-0 items-center gap-1.5 rounded-lg px-1 text-xs font-medium tabular-nums text-white/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300/80 sm:px-2 sm:text-[13px]"
                onClick={() => setShowRemaining((previous) => !previous)}
              >
                <span>{showRemaining ? `−${formatTime(safeDuration - currentTime)}` : formatTime(currentTime)}</span>
                <span className="text-white/35">/</span>
                <span className="text-white/60">{formatTime(safeDuration)}</span>
              </button>
            </div>

            <div className="ml-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
              {hasChapters && (
                <button type="button" aria-label="Tới mốc tiếp theo" title="Tới mốc tiếp theo" disabled={!isReady} tabIndex={visible ? 0 : -1} className={buttonClass} onClick={() => { onNextChapter(); onInteraction(); }}>
                  <Flag className="h-[22px] w-[22px]" strokeWidth={1.8} />
                </button>
              )}
              {canCapture && (
                <button type="button" aria-label="Chụp màn hình" title="Chụp màn hình" disabled={!isReady} tabIndex={visible ? 0 : -1} className={buttonClass} onClick={() => { onCapture(); onInteraction(); }}>
                  <Camera className="h-[22px] w-[22px]" strokeWidth={1.8} />
                </button>
              )}
              {pipSupported && (
                <button type="button" aria-label={isInPip ? "Thoát hình trong hình" : "Hình trong hình"} title="Hình trong hình" aria-pressed={isInPip} tabIndex={visible ? 0 : -1} className={`${buttonClass} ${isInPip ? "bg-white/10 text-pink-300" : ""}`} onClick={() => { onTogglePip(); onInteraction(); }}>
                  <PictureInPicture2 className="h-[22px] w-[22px]" strokeWidth={1.8} />
                </button>
              )}
              <button type="button" aria-label={fullscreenLabel} title={fullscreenLabel} tabIndex={visible ? 0 : -1} className={buttonClass} onClick={() => { onToggleFullscreen(); onInteraction(); }}>
                <MorphIcon icon={isFullscreen ? Minimize : Maximize} size={24} strokeWidth={1.9} spring="snappy" reducedMotion="user" />
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }
);
