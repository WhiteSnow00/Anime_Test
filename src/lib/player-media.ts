export interface NextEpisodeAction {
  label: string;
  onSelect: () => void;
}

export function shouldShowNextEpisode(duration: number, position: number): boolean {
  return Number.isFinite(duration) && duration > 0 && Number.isFinite(position) && position > 0 && duration - position <= 25 && duration - position >= -0.5;
}

export interface PlayerMediaHandle {
  getVideo: () => HTMLVideoElement | null;
  getDuration: () => number;
  canSeek: (time?: number) => boolean;
  seekTo: (time: number) => Promise<boolean>;
  play: () => void;
  pause: () => void;
}

export function isMediaSeekable(video: HTMLVideoElement | null, time?: number): boolean {
  if (!video || video.readyState < 1 || !Number.isFinite(video.duration) || video.duration <= 0 || video.error) return false;
  const target = time === undefined ? null : Math.max(0, Math.min(video.duration - 0.05, time));
  if (target !== null && !Number.isFinite(target)) return false;
  for (let index = 0; index < video.seekable.length; index++) {
    if (target === null || target >= video.seekable.start(index) - 0.1 && target <= video.seekable.end(index) + 0.1) return true;
  }
  return false;
}

export function createPlayerMediaHandle(options: {
  getVideo: () => HTMLVideoElement | null;
  requestSeek: (time: number) => void;
  play: () => void;
  pause: () => void;
}): PlayerMediaHandle {
  return {
    getVideo: options.getVideo,
    getDuration: () => {
      const duration = options.getVideo()?.duration;
      return duration !== undefined && Number.isFinite(duration) ? Math.max(0, duration) : 0;
    },
    canSeek: (time) => isMediaSeekable(options.getVideo(), time),
    play: options.play,
    pause: options.pause,
    seekTo: (time) => {
      const video = options.getVideo();
      if (!isMediaSeekable(video, time) || !video) return Promise.resolve(false);
      const target = Math.max(0, Math.min(video.duration - 0.05, time));
      return new Promise<boolean>((resolve) => {
        let done = false;
        const finish = (success: boolean) => {
          if (done) return;
          done = true;
          clearTimeout(timeout);
          video.removeEventListener("seeked", verify);
          video.removeEventListener("canplay", verify);
          video.removeEventListener("loadeddata", verify);
          video.removeEventListener("error", fail);
          video.removeEventListener("emptied", fail);
          resolve(success);
        };
        const verify = () => {
          if (options.getVideo() !== video || video.error) return finish(false);
          if (!video.seeking && video.readyState >= 2 && Math.abs(video.currentTime - target) < 0.5) finish(true);
        };
        const fail = () => finish(false);
        // This is a failure deadline, not a fixed delay before attempting resume.
        const timeout = setTimeout(() => finish(false), 15000);
        video.addEventListener("seeked", verify);
        video.addEventListener("canplay", verify);
        video.addEventListener("loadeddata", verify);
        video.addEventListener("error", fail);
        video.addEventListener("emptied", fail);
        try {
          options.requestSeek(target);
          verify();
        } catch {
          finish(false);
        }
      });
    },
  };
}
