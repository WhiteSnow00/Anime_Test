// Only VOD playlists that explicitly guarantee independent segments are safe
// to use as coarse seek points. Master/live playlists keep exact previews.
export function parseIndependentSegmentStarts(manifest: string): number[] {
  if (!/^#EXTM3U/m.test(manifest) || !/^#EXT-X-INDEPENDENT-SEGMENTS\s*$/m.test(manifest) || !/^#EXT-X-ENDLIST\s*$/m.test(manifest) || /^#EXT-X-STREAM-INF/m.test(manifest)) return [];
  const starts: number[] = [];
  let position = 0;
  let pendingDuration: number | null = null;
  for (const raw of manifest.split(/\r?\n/)) {
    const line = raw.trim();
    if (line.startsWith("#EXTINF:")) {
      const duration = Number(line.slice(8).split(",")[0]);
      if (!Number.isFinite(duration) || duration <= 0) return [];
      pendingDuration = duration;
    } else if (line && !line.startsWith("#") && pendingDuration !== null) {
      starts.push(position);
      position += pendingDuration;
      pendingDuration = null;
    }
  }
  return starts;
}

export function getSegmentPreviewTime(time: number, starts: number[]): number {
  if (starts.length === 0 || time <= 0) return time;
  let low = 0;
  let high = starts.length - 1;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    if (starts[middle] <= time) low = middle;
    else high = middle - 1;
  }
  // HLS streams can begin a few milliseconds after the segment timestamp.
  return Math.min(time, starts[low] + 0.12);
}

export interface SeekableVideo {
  currentTime: number;
  duration: number;
  readyState: number;
  seeking: boolean;
  fastSeek?: (time: number) => void;
}

interface SeekControllerOptions {
  getVideo: () => SeekableVideo | null;
  getDuration: () => number;
  getPreviewTime?: (time: number) => number;
  fallbackSeek: (time: number) => void;
  onTargetChange: (time: number | null) => void;
  onSettled?: (time: number) => void;
  now?: () => number;
  setTimer?: (callback: () => void, delay: number) => ReturnType<typeof setTimeout>;
  clearTimer?: (timer: ReturnType<typeof setTimeout>) => void;
}

// Keep decoder/network work bounded, without a trailing debounce that waits for
// the pointer to stop. The latest target replaces queued work, never the UI.
const PREVIEW_INTERVAL_MS = 100;
const PREVIEW_MAX_WAIT_MS = 250;
const SEEK_WATCHDOG_MS = 1200;
const POSITION_TOLERANCE = 0.12;

type Target = { time: number; exact: boolean };

export function createSeekController(options: SeekControllerOptions) {
  const now = options.now ?? (() => performance.now());
  const setTimer = options.setTimer ?? ((callback, delay) => setTimeout(callback, delay));
  const clearTimer = options.clearTimer ?? clearTimeout;
  let queued: Target | null = null;
  let active: Target | null = null;
  let lastTarget: number | null = null;
  let lastIssuedAt = -Infinity;
  let lastDecodedAt = -Infinity;
  let activeUsesFastSeek = false;
  let activeNativeTime: number | null = null;
  let lastSeekWasApproximate = false;
  let scrubbing = false;
  let disposed = false;
  let pacingTimer: ReturnType<typeof setTimeout> | null = null;
  let watchdog: ReturnType<typeof setTimeout> | null = null;

  const clearPacing = () => {
    if (pacingTimer !== null) clearTimer(pacingTimer);
    pacingTimer = null;
  };
  const clearWatchdog = () => {
    if (watchdog !== null) clearTimer(watchdog);
    watchdog = null;
  };
  const publishSettled = () => {
    if (active || queued || scrubbing) return;
    const position = options.getVideo()?.currentTime ?? lastTarget;
    lastTarget = null;
    options.onTargetChange(null);
    if (position !== null) options.onSettled?.(position);
  };

  const pump = (immediate = false) => {
    if (disposed || !queued) return;
    if (active) {
      // A far-away, unbuffered preview must not block the position under the
      // pointer for a whole segment download. Bound cancellations to 4/s.
      const wait = PREVIEW_MAX_WAIT_MS - (now() - lastIssuedAt);
      if (wait > 0) {
        if (pacingTimer === null) {
          pacingTimer = setTimer(() => { pacingTimer = null; pump(); }, wait);
        }
        return;
      }
      clearWatchdog();
      active = null;
    }
    clearPacing();
    const delay = Math.max(
      PREVIEW_INTERVAL_MS - (now() - lastIssuedAt),
      lastDecodedAt + 32 - now()
    );
    if (!immediate && !queued.exact && delay > 0) {
      pacingTimer = setTimer(() => { pacingTimer = null; pump(); }, delay);
      return;
    }

    const target = queued;
    queued = null;
    const video = options.getVideo();
    const usesFastSeek = !target.exact && typeof video?.fastSeek === "function";
    const coarseTime = !target.exact && !usesFastSeek
      ? options.getPreviewTime?.(target.time) ?? target.time
      : target.time;
    const previewTime = Number.isFinite(coarseTime) ? Math.max(0, Math.min(target.time, coarseTime)) : target.time;
    const tolerance = target.exact ? 0.001 : POSITION_TOLERANCE;
    if (video && !video.seeking && video.readyState >= 2 && (!target.exact || !lastSeekWasApproximate) && Math.abs(video.currentTime - previewTime) <= tolerance) {
      if (queued) pump();
      else publishSettled();
      return;
    }

    active = target;
    activeUsesFastSeek = usesFastSeek;
    lastSeekWasApproximate = activeUsesFastSeek || Math.abs(previewTime - target.time) > 0.001;
    activeNativeTime = previewTime;
    lastIssuedAt = now();
    // A release can supersede a slow preview. Old watchdogs must not clear it.
    clearWatchdog();
    const checkCompletion = () => {
      watchdog = null;
      if (disposed) return;
      const currentVideo = options.getVideo();
      if (queued) {
        active = null;
        pump(true);
      } else if (currentVideo && (currentVideo.seeking || currentVideo.readyState < 2)) {
        // A slow network is not a completed seek. Keep the target/loading UI
        // until the browser has decoded a frame, or reset on a player error.
        watchdog = setTimer(checkCompletion, SEEK_WATCHDOG_MS);
      } else {
        active = null;
        publishSettled();
      }
    };
    watchdog = setTimer(checkCompletion, SEEK_WATCHDOG_MS);

    try {
      if (video && video.readyState >= 1) {
        if (!target.exact && typeof video.fastSeek === "function") video.fastSeek(target.time);
        else video.currentTime = previewTime;
      } else {
        options.fallbackSeek(previewTime);
      }
    } catch {
      try {
        options.fallbackSeek(target.time);
      } catch {
        clearWatchdog();
        active = null;
        queued = null;
        publishSettled();
      }
    }
  };

  const request = (time: number, exact: boolean) => {
    if (disposed || !Number.isFinite(time)) return;
    const duration = options.getDuration();
    if (!Number.isFinite(duration) || duration <= 0) return;
    const clamped = Math.max(0, Math.min(duration, time));
    lastTarget = clamped;
    options.onTargetChange(clamped);
    // Pointer movement within the same independent segment shares one preview
    // load. Keep its decoder alive instead of restarting the same timestamp.
    if (!exact && active && activeNativeTime !== null && !activeUsesFastSeek) {
      const preview = options.getPreviewTime?.(clamped) ?? clamped;
      if (Math.abs(preview - activeNativeTime) <= 0.001) {
        active.time = clamped;
        queued = null;
        clearPacing();
        return;
      }
    }
    // Releasing at the in-flight target must not restart its download. A
    // fastSeek/keyframe preview still needs a final exact currentTime seek.
    if (exact && active && !lastSeekWasApproximate && Math.abs(active.time - clamped) <= 0.001) {
      active.exact = true;
      queued = null;
      clearPacing();
      return;
    }
    queued = { time: clamped, exact };
    // Never make pointerup wait for an obsolete, unbuffered preview.
    if (exact) {
      clearPacing();
      clearWatchdog();
      active = null;
    }
    pump(exact);
  };

  return {
    begin() {
      if (disposed) return;
      scrubbing = true;
    },
    preview(time: number) {
      request(time, false);
    },
    commit(time: number) {
      scrubbing = false;
      request(time, true);
    },
    complete() {
      if (disposed) return;
      const video = options.getVideo();
      // Ignore a late seeked event from a preview superseded by pointerup.
      if (video?.seeking) return;
      clearWatchdog();
      active = null;
      // Let a decoded preview reach the compositor before seeking again.
      lastDecodedAt = now();
      if (queued) pump(queued.exact);
      else publishSettled();
    },
    getTarget() {
      return lastTarget;
    },
    isPending() {
      return scrubbing || active !== null || queued !== null;
    },
    reset() {
      clearPacing();
      clearWatchdog();
      queued = null;
      active = null;
      activeUsesFastSeek = false;
      activeNativeTime = null;
      lastSeekWasApproximate = false;
      lastTarget = null;
      lastIssuedAt = -Infinity;
      lastDecodedAt = -Infinity;
      scrubbing = false;
      options.onTargetChange(null);
    },
    destroy() {
      disposed = true;
      clearPacing();
      clearWatchdog();
      queued = null;
      active = null;
    },
  };
}
