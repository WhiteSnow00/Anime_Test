"use client";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { LoaderCircle, SkipForward, X } from "lucide-react";
import { PlayerControls } from "./player-controls";
import { SeekFeedback, type SeekFeedbackEvent } from "./seek-feedback";
import { consoleProtection } from "../lib/console-protection";
import { createFullscreenController } from "@/lib/fullscreen-controller";
import { createPipController } from "@/lib/pip-controller";
import { createSeekController, getSegmentPreviewTime, parseIndependentSegmentStarts } from "@/lib/seek-controller";
import { createPlayerMediaHandle, shouldShowNextEpisode, type NextEpisodeAction, type PlayerMediaHandle } from "@/lib/player-media";

function useSyncedRef<T>(value: T) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return ref;
}

/* =====================================================================================
 * CONFIG – tweak here without touching logic below
 * ===================================================================================*/
const CONFIG = {
  JW_PLAYER_VERSION: "8.38.3",
  JW_PLAYER_KEY: "cLGMn8T20tGvW+0eXPhq4NNmLB57TrscPjd1IyJF84o=",
  JW_ABOUT_TEXT: "Được Tạo Bởi KanaFansub",
  PLAYER_PRIMARY: "html5" as const,
  HLS_TYPE: "hls" as const,
  DEFAULT_VOLUME: 80,
  AUTOPLAY_RETRY_DELAY_MS: 250,
  CONTROLS_AUTOHIDE_MS_TOUCH: 2500,
  CONTROLS_AUTOHIDE_MS_DESKTOP: 2500,
  DOUBLE_TAP_ZONE_RATIO: 0.5,
  SKIP_SECONDS: 10,
  ERRORS: {
    SCRIPT_LOAD: "Failed to load JWPlayer script",
    SETUP: "Player setup error",
    GENERAL: "Player error",
    INIT: "Failed to initialize player",
  },
  ABOUT_MESSAGE_TIMEOUT_MS: 500,
};

const JW_PLAYER_SCRIPT_SRC =
  `https://ssl.p.jwpcdn.com/player/v/${CONFIG.JW_PLAYER_VERSION}/jwplayer.js` as const;

/* =====================================================================================
 * TYPES
 * ===================================================================================*/
interface JWPlayerProps {
  videoId: string;
  server: string;
  autoPlay?: boolean;
  muted?: boolean;
  controls?: boolean; // custom controls visibility
  onLoad?: () => void;
  onError?: (error: string) => void;
  onHudHeightChange?: (height: number) => void;
  onMediaReady?: (media: PlayerMediaHandle) => void;
  nextEpisode?: NextEpisodeAction;
  className?: string;
  chapters?: number[]; // seconds from start
}

/* =====================================================================================
 * UTILS
 * ===================================================================================*/
const isAndroidUA = () =>
  typeof navigator !== "undefined" && /android/i.test(navigator.userAgent);
const isIOSUA = () =>
  typeof navigator !== "undefined" &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.userAgent.includes("Mac") && "ontouchend" in document));

function detectPipSupport(p: any, video: HTMLVideoElement | null): boolean {
  if (!video) return false;
  // JW API
  if (typeof p?.isPipSupported === "function") {
    try {
      if (p.isPipSupported() === true) return true;
    } catch { }
  }
  // Standard
  const supportsStandard =
    "pictureInPictureEnabled" in document &&
    (document as any).pictureInPictureEnabled === true &&
    (video as any).disablePictureInPicture !== true &&
    typeof (video as any).requestPictureInPicture === "function";
  // WebKit
  const supportsWebkit =
    typeof (video as any).webkitSupportsPresentationMode === "function" &&
    (video as any).webkitSupportsPresentationMode("picture-in-picture") ===
    true;
  return !!(supportsStandard || supportsWebkit);
}

function protectVideoElement(video: HTMLVideoElement, isAndroid: boolean) {
  if (
    !video ||
    !(video instanceof HTMLVideoElement) ||
    (video as any)._protectedStreamSetup
  )
    return;
  if (isAndroid) return; // skip on Android to avoid vendor quirks
  (video as any)._protectedStreamSetup = true;
  try {
    consoleProtection.start({
      showWarning: true,
      allowPatterns: [
        /^JWPlayer ready$/,
        /^Initializing JWPlayer/,
        /^Video playback completed$/,
      ],
    });
    consoleProtection.detectConsoleAccess();
  } catch { }
  const applyProtection = () => {
    const originalGetAttribute = video.getAttribute;
    video.getAttribute = function (this: HTMLVideoElement, name: string) {
      if (name === "src") return "blob:protected-stream";
      return originalGetAttribute.call(this, name);
    } as any;
    const originalSetAttribute = video.setAttribute;
    video.setAttribute = function (
      this: HTMLVideoElement,
      name: string,
      value: string
    ) {
      if (name === "src" && value.includes("blob:"))
        return originalSetAttribute.call(this, name, value);
      return originalSetAttribute.call(this, name, value);
    } as any;
    const srcDesc = Object.getOwnPropertyDescriptor(
      HTMLVideoElement.prototype,
      "src"
    );
    if (srcDesc) {
      Object.defineProperty(video, "src", {
        get: () => {
          const realSrc = srcDesc.get?.call(video);
          return typeof realSrc === "string" && realSrc.startsWith("blob:")
            ? realSrc
            : "blob:protected-stream";
        },
        set: (url) => {
          if (typeof url === "string" && url.startsWith("blob:"))
            srcDesc.set?.call(video, url);
        },
        configurable: true,
      });
    }
    const csDesc = Object.getOwnPropertyDescriptor(video, "currentSrc");
    if (!csDesc || csDesc.configurable !== false) {
      Object.defineProperty(video, "currentSrc", {
        get: () => "blob:protected-stream",
        configurable: true,
      });
    }
    const ohDesc = Object.getOwnPropertyDescriptor(video, "outerHTML");
    if (!ohDesc || ohDesc.configurable !== false) {
      Object.defineProperty(video, "outerHTML", {
        get: function () {
          const g = Object.getOwnPropertyDescriptor(
            HTMLVideoElement.prototype,
            "outerHTML"
          )?.get;
          try {
            const html = g?.call(this);
            return typeof html === "string"
              ? html.replace(/blob:[^"\s]+/g, "blob:protected-stream")
              : (html as any);
          } catch {
            return "<video>Protected Video Element</video>";
          }
        },
        configurable: true,
      });
    }
  };
  video.addEventListener("play", applyProtection, { once: true });
}

/* =====================================================================================
 * HOOKS – loader & player setup
 * ===================================================================================*/
function useJWScript(onError?: (msg: string) => void) {
  const [ready, setReady] = useState(false);
  const loadingRef = useRef(false);
  const loadedRef = useRef(false);

  useEffect(() => {
    const w = window as any;
    if (loadedRef.current || loadingRef.current) return setReady(!!w.jwplayer);
    if (w.jwplayer) {
      loadedRef.current = true;
      setReady(true);
      return;
    }
    loadingRef.current = true;
    const s = document.createElement("script");
    s.src = JW_PLAYER_SCRIPT_SRC;
    s.async = true;
    s.onload = () => {
      loadedRef.current = true;
      loadingRef.current = false;
      setReady(true);
    };
    s.onerror = () => {
      loadingRef.current = false;
      onError?.(CONFIG.ERRORS.SCRIPT_LOAD);
    };
    document.head.appendChild(s);
  }, [onError]);

  return ready;
}

/* =====================================================================================
 * COMPONENT
 * ===================================================================================*/
const NJWPlayerComponent = ({
  videoId,
  server,
  autoPlay = false,
  muted = false,
  controls = true,
  onLoad,
  onError,
  onHudHeightChange,
  onMediaReady,
  nextEpisode,
  className = "",
  chapters = [],
}: JWPlayerProps) => {
  const isAndroid = isAndroidUA();
  const isIOS = isIOSUA();
  const isHls = server === "hls";
  const fileUrl = useMemo(() => {
    if (!isHls) return "";

    if (videoId.startsWith('/')) {
      return videoId;
    }

    if (videoId.startsWith('http://') || videoId.startsWith('https://')) {
      return videoId;
    }

    const rel = `/api/hls?file=${encodeURIComponent(videoId)}`;
    if (typeof window !== "undefined")
      return new URL(rel, window.location.origin).toString();
    return rel;
  }, [isHls, videoId]);

  const playerHostRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const bottomHudRef = useRef<HTMLDivElement | null>(null);
  const playerInstance = useRef<any>(null);
  const prevFileUrlRef = useRef<string | null>(null);
  const savedPositionRef = useRef(0);
  const wasPlayingRef = useRef(false);
  const controlsHideTimerRef = useRef<number | null>(null);
  const aboutHideTimerRef = useRef<number | null>(null);
  const seekOverlayTimerRef = useRef<number | null>(null);
  const seekFeedbackSequenceRef = useRef(0);
  const seekFeedbackLastAtRef = useRef(0);
  const suppressClickRef = useRef(false);
  const forcedAutoplayMuteRef = useRef(false);
  const scheduleControlsAutohideRef = useRef<(() => void) | null>(null);
  const controllerRef = useRef<ReturnType<
    typeof createFullscreenController
  > | null>(null);
  const pipCtrlRef = useRef<ReturnType<typeof createPipController> | null>(
    null
  );

  const [libReady, setLibReady] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(!!muted);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [seekTarget, setSeekTarget] = useState<number | null>(null);
  const [isSeekLoading, setIsSeekLoading] = useState(false);
  const [buffer, setBuffer] = useState(0);
  const [controlsVisible, setControlsVisible] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isHoveringControls, setIsHoveringControls] = useState(false);
  const [cursorHidden, setCursorHidden] = useState(false);
  const [showAboutMsg, setShowAboutMsg] = useState(false);
  const [aboutPos, setAboutPos] = useState<{ x: number; y: number } | null>(
    null
  );
  const [isInPip, setIsInPip] = useState(false);
  const [pipSupported, setPipSupported] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [supportsAspectRatio, setSupportsAspectRatio] = useState(true);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [nextEpisodeDismissed, setNextEpisodeDismissed] = useState(false);
  const mediaReadyCallbackRef = useSyncedRef(onMediaReady);

  const isScrubbingRef = useSyncedRef(isScrubbing);
  const isHoveringRef = useSyncedRef(isHovering);
  const isHoveringControlsRef = useSyncedRef(isHoveringControls);
  const isFullscreenRef = useSyncedRef(isFullscreen);
  const isTouchDeviceRef = useSyncedRef(isTouchDevice);
  const isPlayingRef = useSyncedRef(isPlaying);
  const durationRef = useSyncedRef(duration);
  const seekControllerRef = useRef<ReturnType<typeof createSeekController> | null>(null);
  const segmentStartsRef = useRef<number[]>([]);
  const resumeAfterScrubRef = useRef(false);
  const seekLoadingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Mobile idle tracking: last time the user touched or interacted with the player
  const lastInteractionRef = useRef<number>(Date.now());

  const jwReady = useJWScript(onError);

  useEffect(() => {
    const host = playerHostRef.current;
    if (!host) return;
    const mediaVideo = { current: null as HTMLVideoElement | null };
    const clearSeekLoading = () => {
      if (seekLoadingTimerRef.current !== null) clearTimeout(seekLoadingTimerRef.current);
      seekLoadingTimerRef.current = null;
      setIsSeekLoading(false);
    };
    const media = createPlayerMediaHandle({
      getVideo: () => {
        const current = playerHostRef.current?.querySelector("video") ?? null;
        return current === mediaVideo.current ? current : null;
      },
      requestSeek: (time) => seekControllerRef.current?.commit(time),
      play: () => playerInstance.current?.play?.(true),
      pause: () => playerInstance.current?.pause?.(true),
    });
    let announcedVideo: HTMLVideoElement | null = null;
    const publishMediaReady = () => {
      const video = host.querySelector("video");
      if (!video || announcedVideo === video) return;
      mediaVideo.current = video;
      if (!media.canSeek()) return;
      const mediaDuration = media.getDuration();
      durationRef.current = mediaDuration;
      setDuration(mediaDuration);
      if (announcedVideo === video) return;
      announcedVideo = video;
      mediaReadyCallbackRef.current?.(media);
    };
    host.addEventListener("loadedmetadata", publishMediaReady, true);
    host.addEventListener("durationchange", publishMediaReady, true);
    host.addEventListener("canplay", publishMediaReady, true);
    host.addEventListener("progress", publishMediaReady, true);
    const mediaPoll = window.setInterval(publishMediaReady, 200);
    const controller = createSeekController({
      getVideo: () => host.querySelector("video"),
      getDuration: () => durationRef.current || playerInstance.current?.getDuration?.() || 0,
      getPreviewTime: (time) => {
        const video = host.querySelector("video");
        if (video) {
          for (let index = 0; index < video.buffered.length; index++) {
            if (time >= video.buffered.start(index) && time < video.buffered.end(index)) return time;
          }
        }
        return getSegmentPreviewTime(time, segmentStartsRef.current);
      },
      fallbackSeek: (time) => playerInstance.current?.seek?.(time),
      onTargetChange: (time) => {
        setSeekTarget(time);
        if (time === null) clearSeekLoading();
      },
      onSettled: (time) => {
        setPosition(time);
        if (!isScrubbingRef.current) {
          const video = host.querySelector("video");
          if (video && !video.seeking) {
            isPlayingRef.current = !video.paused && !video.ended;
            setIsPlaying(isPlayingRef.current);
          }
        }
        setIsBuffering(false);
        clearSeekLoading();
      },
    });
    seekControllerRef.current = controller;
    let video: HTMLVideoElement | null = null;
    const onSeeking = () => {
      if (seekLoadingTimerRef.current !== null) return;
      // Keep the last decoded frame visible; don't flash a spinner on fast seeks.
      seekLoadingTimerRef.current = setTimeout(() => {
        seekLoadingTimerRef.current = null;
        if (video?.seeking || video && video.readyState < 2) setIsSeekLoading(true);
      }, 180);
    };
    const onSeeked = () => {
      controller.complete();
      if (!video?.seeking && video && video.readyState >= 2) clearSeekLoading();
    };
    const updateBuffered = () => {
      if (!video) return;
      const current = video.currentTime;
      let end = current;
      for (let index = 0; index < video.buffered.length; index++) {
        if (current >= video.buffered.start(index) - 0.1 && current <= video.buffered.end(index) + 0.1) {
          end = video.buffered.end(index);
          break;
        }
      }
      setBuffer(end);
    };
    const bindVideo = () => {
      const next = host.querySelector("video");
      if (next === video) return;
      video?.removeEventListener("seeking", onSeeking);
      video?.removeEventListener("seeked", onSeeked);
      video?.removeEventListener("progress", updateBuffered);
      video?.removeEventListener("timeupdate", updateBuffered);
      video = next;
      video?.addEventListener("seeking", onSeeking);
      video?.addEventListener("seeked", onSeeked);
      video?.addEventListener("progress", updateBuffered);
      video?.addEventListener("timeupdate", updateBuffered);
      updateBuffered();
    };
    bindVideo();
    const observer = new MutationObserver(bindVideo);
    observer.observe(host, { subtree: true, childList: true });
    return () => {
      observer.disconnect();
      window.clearInterval(mediaPoll);
      host.removeEventListener("loadedmetadata", publishMediaReady, true);
      host.removeEventListener("durationchange", publishMediaReady, true);
      host.removeEventListener("canplay", publishMediaReady, true);
      host.removeEventListener("progress", publishMediaReady, true);
      video?.removeEventListener("seeking", onSeeking);
      video?.removeEventListener("seeked", onSeeked);
      video?.removeEventListener("progress", updateBuffered);
      video?.removeEventListener("timeupdate", updateBuffered);
      mediaVideo.current = null;
      controller.destroy();
      seekControllerRef.current = null;
      if (seekLoadingTimerRef.current !== null) clearTimeout(seekLoadingTimerRef.current);
    };
  }, [durationRef, isPlayingRef, isScrubbingRef, mediaReadyCallbackRef]);

  useEffect(() => {
    segmentStartsRef.current = [];
    if (!isHls || !fileUrl) return;
    const abort = new AbortController();
    // Read only the small manifest; never start a second video/segment loader.
    void fetch(fileUrl, { signal: abort.signal })
      .then((response) => response.ok ? response.text() : "")
      .then((manifest) => {
        if (!abort.signal.aborted) segmentStartsRef.current = parseIndependentSegmentStarts(manifest);
      })
      .catch(() => { /* CORS/master playlists simply retain exact previews. */ });
    return () => abort.abort();
  }, [fileUrl, isHls]);

  useEffect(() => {
    seekControllerRef.current?.reset();
    resumeAfterScrubRef.current = false;
    isScrubbingRef.current = false;
    setIsScrubbing(false);
    setNextEpisodeDismissed(false);
    setDuration(0);
    setPosition(0);
    setBuffer(0);
  }, [fileUrl, isScrubbingRef]);

  const beginScrubbing = useCallback(() => {
    if (isScrubbingRef.current) return;
    const video = playerHostRef.current?.querySelector("video");
    resumeAfterScrubRef.current = video ? !video.paused && !video.ended : isPlayingRef.current;
    if (resumeAfterScrubRef.current) {
      isPlayingRef.current = true;
      setIsPlaying(true);
    }
    isScrubbingRef.current = true;
    setIsScrubbing(true);
    seekControllerRef.current?.begin();
    if (resumeAfterScrubRef.current) playerInstance.current?.pause?.(true);
  }, [isPlayingRef, isScrubbingRef]);

  const commitSeek = useCallback((time: number) => {
    isScrubbingRef.current = false;
    setIsScrubbing(false);
    seekControllerRef.current?.commit(time);
    if (resumeAfterScrubRef.current) {
      resumeAfterScrubRef.current = false;
      playerInstance.current?.play?.(true);
    }
    scheduleControlsAutohideRef.current?.();
  }, [isScrubbingRef]);

  useEffect(() => {
    setLibReady(jwReady);
  }, [jwReady]);

  // env feature detects
  useEffect(() => {
    setIsTouchDevice(
      typeof window !== "undefined" &&
      ("ontouchstart" in window || navigator.maxTouchPoints > 0)
    );
    try {
      const ok =
        typeof CSS !== "undefined" &&
          typeof (CSS as any).supports === "function"
          ? CSS.supports("aspect-ratio: 16/9")
          : false;
      setSupportsAspectRatio(!!ok);
    } catch {
      setSupportsAspectRatio(false);
    }
  }, []);

  useEffect(() => {
    if (isTouchDevice) {
      onHudHeightChange?.(0);
      return;
    }

    const hudNode = bottomHudRef.current;
    if (!hudNode) return;

    const updateHudHeight = () => {
      const nextHeight = Math.ceil(hudNode.getBoundingClientRect().height);
      if (!Number.isFinite(nextHeight) || nextHeight <= 0) return;
      onHudHeightChange?.(nextHeight);
    };

    updateHudHeight();

    if (typeof ResizeObserver === "undefined") {
      const timeoutId = window.setTimeout(updateHudHeight, 100);
      return () => window.clearTimeout(timeoutId);
    }

    const observer = new ResizeObserver(() => updateHudHeight());
    observer.observe(hudNode);
    window.addEventListener("resize", updateHudHeight);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateHudHeight);
    };
  }, [fileUrl, isTouchDevice, onHudHeightChange]);

  useEffect(() => {
    if (!containerRef.current) return;

    controllerRef.current = createFullscreenController({
      container: containerRef.current,
      getVideo: () =>
        (containerRef.current?.querySelector(
          "video"
        ) as HTMLVideoElement | null) ?? null,
      getPlayer: () => playerInstance.current ?? null,
      onEnter: () => {
        (document.documentElement as any).__prevOverflow =
          document.documentElement.style.overflow || "";
        document.documentElement.style.overflow = "hidden";
        setIsFullscreen(true);
        scheduleControlsAutohide();
      },
      onExit: () => {
        setIsFullscreen(false);
        const prev = (document.documentElement as any).__prevOverflow ?? "";
        document.documentElement.style.overflow = prev;
        delete (document.documentElement as any).__prevOverflow;
      },
    });

    return () => {
      controllerRef.current = null;
    };
    // chú ý: KHÔNG đưa scheduleControlsAutohide vào deps để tránh recreate controller không cần thiết
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerRef.current]);

  useEffect(() => {
    const v = containerRef.current?.querySelector(
      "video"
    ) as HTMLVideoElement | null;
    const p = playerInstance.current;

    const onEnter = () => setIsInPip(true);
    const onLeave = () => setIsInPip(false);
    const onWK = () => {
      const vv = v as any;
      setIsInPip(vv?.webkitPresentationMode === "picture-in-picture");
    };

    v?.addEventListener("enterpictureinpicture", onEnter);
    v?.addEventListener("leavepictureinpicture", onLeave);
    v?.addEventListener("webkitpresentationmodechanged", onWK as any);
    p?.on?.("pip", ({ pip }: { pip: boolean }) => setIsInPip(!!pip));

    return () => {
      v?.removeEventListener("enterpictureinpicture", onEnter);
      v?.removeEventListener("leavepictureinpicture", onLeave);
      v?.removeEventListener("webkitpresentationmodechanged", onWK as any);
    };
  }, [libReady, isReady]);

  useEffect(() => {
    pipCtrlRef.current = createPipController({
      getVideo: () => containerRef.current?.querySelector("video") ?? null,
      getPlayer: () => playerInstance.current ?? null,
      onEnter: () => setIsInPip(true),
      onExit: () => setIsInPip(false),
    });
    return () => {
      pipCtrlRef.current = null;
    };
  }, []);

  // iOS resize/orientation fix
  useEffect(() => {
    if (!isIOS) return;
    const fix = () => {
      const v = containerRef.current?.querySelector(
        "video"
      ) as HTMLVideoElement | null;
      if (!v) return;
      const w = v.style.width;
      v.style.width = w === "100%" ? "99.9%" : "100%";
      requestAnimationFrame(() => {
        v.style.width = "100%";
      });
    };
    window.addEventListener("orientationchange", fix);
    window.addEventListener("resize", fix);
    return () => {
      window.removeEventListener("orientationchange", fix);
      window.removeEventListener("resize", fix);
    };
  }, [isIOS]);

  useEffect(() => {
    // UI changes (including the context menu) must never reconfigure the video.
    const host = playerHostRef.current;
    if (!host) return;
    const configuredVideos = new WeakSet<HTMLVideoElement>();

    const trySet = () => {
      const video = host.querySelector("video");
      if (!video || configuredVideos.has(video)) return;
      configuredVideos.add(video);
      try {
        if (video.crossOrigin !== "anonymous") video.crossOrigin = "anonymous";
      } catch { }
      video.setAttribute("playsinline", "");
      video.setAttribute("webkit-playsinline", "");
    };

    trySet();
    const observer = new MutationObserver(trySet);
    observer.observe(host, { subtree: true, childList: true });
    return () => observer.disconnect();
  }, []);

  // JW setup / reload on file change
  useEffect(() => {
    if (!isHls || !libReady || !playerHostRef.current) return;
    const w = window as any;
    if (!w.jwplayer) return;

    if (playerInstance.current && prevFileUrlRef.current === fileUrl) return;

    // avoid reinit during/after fs transitions
    if (document.fullscreenElement) return;
    if (playerInstance.current?._isFullscreen) return;
    const now = Date.now();
    if (
      playerInstance.current?._lastFullscreenExit &&
      now - playerInstance.current._lastFullscreenExit < 2000
    )
      return;

    // carry over pos + play state
    if (playerInstance.current) {
      try {
        const p = playerInstance.current;
        savedPositionRef.current = p.getPosition?.() || 0;
        wasPlayingRef.current = ["playing", "buffering"].includes(
          p.getState?.()
        );
        p.remove?.();
      } catch { }
    }

    try {
      // Prewarm HLS manifest on Android to speed up first segment fetch
      if (isAndroid && fileUrl) {
        try { fetch(fileUrl, { method: "HEAD", cache: "no-cache" }); } catch { }
      }

      const sources = [{ file: fileUrl, type: CONFIG.HLS_TYPE, default: true }];
      // JWPlayer replaces its target node. Keep that node inside a stable React-owned host.
      const playerElement = document.createElement("div");
      playerElement.id = "kana-player";
      playerHostRef.current.replaceChildren(playerElement);
      playerInstance.current = w.jwplayer(playerElement).setup({
        width: "100%",
        height: "100%",
        primary: CONFIG.PLAYER_PRIMARY,
        controls: false,
        // Resume waits for real metadata/seekable ranges, even with autoplay held.
        preload: "auto",
        // On mobile, start muted to satisfy autoplay policy and reduce stalls
        autostart: (isIOS || isAndroid) ? !!autoPlay : autoPlay,
        // Do NOT force mute on mobile; respect the passed-in prop
        mute: !!muted,
        key: CONFIG.JW_PLAYER_KEY,
        hlsjsdefault: !isIOS,
        hlsjsconfig: {
          xhrSetup: (xhr: XMLHttpRequest) => {
            xhr.withCredentials = false;
          },
          // Retain nearby segments for quick ±10s/repeated seeks. Respect the
          // player's byte budget instead of preloading the entire episode.
          startLevel: 0,
          capLevelToPlayerSize: true,
          maxBufferLength: 30,
          backBufferLength: 90,
          lowLatencyMode: false,
          // Conservative retries to fail fast and let our app handle fallback
          fragLoadingMaxRetry: 2,
          fragLoadingRetryDelay: 1000,
          manifestLoadingMaxRetry: 2,
          manifestLoadingRetryDelay: 1000,
        },
        safarihlsjs: false,
        enableNativeHls: isIOS,
        stretching: "uniform",
        playlist: [{ sources }],
        abouttext: CONFIG.JW_ABOUT_TEXT,
        playsinline: true,
        fullscreenOrientationLock: "landscape",
        pipIcon: true,
      });

      const p = playerInstance.current;
      p._isFullscreen = false;
      p._lastFullscreenExit = 0;

      p.on("ready", () => {
        setIsReady(true);
        setIsMuted(!!p.getMute?.());
        if (isAndroid) {
          // Keep volume state high but autoplay muted; user can unmute with one tap
          p.setVolume?.(100);
        } else {
          const vol = p.getVolume?.();
          setVolumeState(typeof vol === "number" ? vol : CONFIG.DEFAULT_VOLUME);
        }
        const d = p.getDuration?.() ?? 0;
        setDuration(isFinite(d) ? d : 0);

        if (savedPositionRef.current > 0) {
          try {
            p.seek?.(savedPositionRef.current);
            if (wasPlayingRef.current) p.play?.(true);
          } catch { }
        } else if (autoPlay) {
          if (isIOS || isAndroid) {
            // Attempt autoplay without forcing mute; if policy blocks, user will tap to play
            try {
              p.play?.(true);
            } catch { }
            setTimeout(() => {
              try {
                const st = p.getState?.();
                if (!["playing", "buffering"].includes(st)) p.play?.(true);
              } catch { }
            }, CONFIG.AUTOPLAY_RETRY_DELAY_MS);
          } else {
            try {
              p.setMute?.(!!muted === false ? false : !!muted);
              forcedAutoplayMuteRef.current = !muted;
              p.play?.(true);
            } catch { }
            setTimeout(() => {
              try {
                const st = p.getState?.();
                if (!["playing", "buffering"].includes(st)) p.play?.(true);
              } catch { }
            }, CONFIG.AUTOPLAY_RETRY_DELAY_MS);
          }
        }
        savedPositionRef.current = 0;
        wasPlayingRef.current = false;

        const videoEl = containerRef.current?.querySelector(
          "video"
        ) as HTMLVideoElement | null;
        setPipSupported(detectPipSupport(p, videoEl));
        p.on("pip", ({ pip }: { pip: boolean }) => setIsInPip(!!pip));
        videoEl?.addEventListener("enterpictureinpicture", () =>
          setIsInPip(true)
        );
        videoEl?.addEventListener("leavepictureinpicture", () =>
          setIsInPip(false)
        );
        videoEl?.addEventListener("webkitpresentationmodechanged", () =>
          setIsInPip(
            (videoEl as any).webkitPresentationMode === "picture-in-picture"
          )
        );

        setTimeout(() => {
          const v = containerRef.current?.querySelector(
            "video"
          ) as HTMLVideoElement | null;
          if (v) {
            v.setAttribute("playsinline", "");
            v.setAttribute("webkit-playsinline", "");
            if (isIOS) {
              Object.assign(v.style, {
                position: "absolute",
                top: "0",
                left: "0",
                width: "100%",
                height: "100%",
                objectFit: "contain",
                pointerEvents: "none",
                WebkitTransform: "translateZ(0)",
                transform: "translateZ(0)",
              } as Partial<CSSStyleDeclaration>);
              if (overlayRef.current) {
                overlayRef.current.style.transform = "translateZ(0)";
                overlayRef.current.style.willChange = "transform";
              }
            }
            protectVideoElement(v, isAndroid);
          }
        }, 500);

        onLoad?.();
      });

      p.on("play", () => {
        if (isScrubbingRef.current) return;
        isPlayingRef.current = true;
        setIsPlaying(true);
        setIsBuffering(false);
        // Ensure autohide can kick in after resuming playback on mobile
        setIsHovering(false);
        setControlsVisible(true);
        scheduleControlsAutohideRef.current?.();
        if (isAndroid) {
          const v = containerRef.current?.querySelector(
            "video"
          ) as HTMLVideoElement | null;
          if (v) {
            v.style.display = "";
            v.style.visibility = "visible";
            v.style.opacity = "1";
          }
        }
      });
      p.on("pause", () => {
        if (isScrubbingRef.current || seekControllerRef.current?.isPending() && isPlayingRef.current) return;
        isPlayingRef.current = false;
        setIsPlaying(false);
        // When paused, we are not buffering for playback
        setIsBuffering(false);
      });
      p.on("time", (e: any) => {
        if (!seekControllerRef.current?.isPending()) setPosition(e?.position || 0);
        if (typeof e?.duration === "number") setDuration(e.duration);
        // Any time update implies playback is progressing; clear buffering
        if (playerInstance.current?.getState?.() === "playing") {
          setIsBuffering(false);
        }
      });
      p.on("buffer", () => {
        if (!isScrubbingRef.current && !seekControllerRef.current?.isPending()) setIsBuffering(true);
      });
      // Idle/complete/firstFrame should never show buffering spinner
      p.on("idle", () => setIsBuffering(false));
      p.on("complete", () => {
        setIsPlaying(false);
        setIsBuffering(false);
        setControlsVisible(true);
      });
      p.on("volume", (e: any) =>
        setVolumeState(
          typeof e?.volume === "number" ? e.volume : CONFIG.DEFAULT_VOLUME
        )
      );
      p.on("mute", (e: any) => setIsMuted(!!e?.mute));
      p.on("fullscreen", (e: any) => {
        setIsFullscreen(!!e.fullscreen);
        if (e.fullscreen) p._isFullscreen = true;
        else {
          p._lastFullscreenExit = Date.now();
          setTimeout(() => {
            p._isFullscreen = false;
            if (isAndroid) {
              const v = containerRef.current?.querySelector(
                "video"
              ) as HTMLVideoElement | null;
              if (v) {
                v.style.display = "";
                v.style.visibility = "visible";
                v.style.opacity = "1";
                v.src = v.src;
              }
            }
          }, 1000);
        }
      });
      p.on("firstFrame", () => {
        setIsBuffering(false);
        const pos = savedPositionRef.current;
        if (pos > 0.2) {
          try {
            p.seek(pos);
          } catch { }
        }
        if (wasPlayingRef.current) p.play?.(true);
        savedPositionRef.current = 0;
        wasPlayingRef.current = false;
        const v = containerRef.current?.querySelector(
          "video"
        ) as HTMLVideoElement | null;
        setPipSupported(detectPipSupport(p, v));
      });
      p.on("providerChanged", () => {
        const v = containerRef.current?.querySelector(
          "video"
        ) as HTMLVideoElement | null;
        setPipSupported(detectPipSupport(p, v));
      });
      p.on("setupError", (e: any) =>
        onError?.(e?.message || CONFIG.ERRORS.SETUP)
      );
      p.on("error", (e: any) => {
        seekControllerRef.current?.reset();
        onError?.(e?.message || CONFIG.ERRORS.GENERAL);
      });

      prevFileUrlRef.current = fileUrl;
    } catch (e: any) {
      onError?.(e?.message || CONFIG.ERRORS.INIT);
    }

    return () => { };
  }, [
    isHls,
    fileUrl,
    libReady,
    autoPlay,
    muted,
    isAndroid,
    isIOS,
    onLoad,
    onError,
    isPlayingRef,
    isScrubbingRef,
  ]);

  useEffect(() => {
    const v = containerRef.current?.querySelector(
      "video"
    ) as HTMLVideoElement | null;
    if (!v) return;

    const onVol = () => {
      const vol01 = v.volume ?? 1;
      const vol100 = Math.round(vol01 * 100);
      setVolumeState(vol100);
      setIsMuted(v.muted || vol100 === 0);
    };

    v.addEventListener("volumechange", onVol);
    onVol();

    return () => v.removeEventListener("volumechange", onVol);
  }, [isReady]);

  // Keep the context menu mounted and dismiss it without touching playback.
  useEffect(() => {
    if (!showAboutMsg) return;
    const dismissOutside = (event: PointerEvent) => {
      const target = event.target as Element | null;
      if (!target?.closest("[data-player-context-menu]")) setShowAboutMsg(false);
    };
    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      setShowAboutMsg(false);
    };
    document.addEventListener("pointerdown", dismissOutside, true);
    document.addEventListener("keydown", dismissOnEscape, true);
    return () => {
      document.removeEventListener("pointerdown", dismissOutside, true);
      document.removeEventListener("keydown", dismissOnEscape, true);
    };
  }, [showAboutMsg]);

  // teardown
  useEffect(
    () => () => {
      try {
        playerInstance.current?.remove?.();
      } catch { }
      if (controlsHideTimerRef.current) {
        window.clearTimeout(controlsHideTimerRef.current);
        controlsHideTimerRef.current = null;
      }
      if (aboutHideTimerRef.current) {
        window.clearTimeout(aboutHideTimerRef.current);
        aboutHideTimerRef.current = null;
      }
      if (seekOverlayTimerRef.current) {
        window.clearTimeout(seekOverlayTimerRef.current);
        seekOverlayTimerRef.current = null;
      }
    },
    []
  );

  // reflect external autoPlay/muted
  useEffect(() => {
    const p = playerInstance.current;
    if (!p) return;
    try {
      p.setMute?.(!!muted);
      if (autoPlay && p.getState?.() !== "playing") p.play?.(true);
    } catch { }
  }, [autoPlay, muted]);

  // keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const container = containerRef.current;
      const hasFocus =
        !!container && container.contains(document.activeElement);
      if (!isFullscreen && !hasFocus) return;
      const p = playerInstance.current;
      if (!p) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      )
        return;
      // Respect native widgets and modal dialogs without disabling player
      // shortcuts merely because a bottom-bar button retained focus.
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.isComposing) return;
      if (document.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]')) return;
      if (target?.closest("[role='slider'], [role='menuitem'], [role='menu']")) return;
      const focusedButton = target?.closest("button");
      const unforceMuteIfNeeded = () => {
        if (forcedAutoplayMuteRef.current && !muted) {
          try {
            p.setMute?.(false);
          } catch { }
          forcedAutoplayMuteRef.current = false;
        }
      };
      switch (e.code) {
        case "Space":
          // Space/Enter still activate a focused button normally; Arrow keys
          // and M continue to control playback from that same focus position.
          if (focusedButton) return;
          e.preventDefault();
          setControlsVisible(true);
          scheduleControlsAutohideRef.current?.();
          unforceMuteIfNeeded();
          p.getState?.() === "playing" ? p.pause?.() : p.play?.(true);
          break;
        case "ArrowLeft":
          e.preventDefault();
          seekBy(-CONFIG.SKIP_SECONDS);
          break;
        case "ArrowRight":
          e.preventDefault();
          seekBy(CONFIG.SKIP_SECONDS);
          break;
        default:
          if (e.key.toLowerCase() === "m") {
            e.preventDefault();
            p.setMute?.(!p.getMute?.());
          }
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFullscreen, duration, position, muted]);

  const [volume, setVolumeState] = useState(CONFIG.DEFAULT_VOLUME);
  const scheduleControlsAutohide = useCallback(() => {
    if (controlsHideTimerRef.current) {
      window.clearTimeout(controlsHideTimerRef.current);
      controlsHideTimerRef.current = null;
    }

    const timeoutMs = isTouchDeviceRef.current
      ? CONFIG.CONTROLS_AUTOHIDE_MS_TOUCH
      : CONFIG.CONTROLS_AUTOHIDE_MS_DESKTOP;

    controlsHideTimerRef.current = window.setTimeout(function tick() {
      const scrubbing = isScrubbingRef.current;
      const hoveringCtl = isHoveringControlsRef.current;
      const isTouch = isTouchDeviceRef.current;

      const shouldHide =
        isPlayingRef.current &&
        !scrubbing &&
        !hoveringCtl &&
        !(document.activeElement?.matches(":focus-visible") && containerRef.current?.contains(document.activeElement) && document.activeElement !== containerRef.current);

      if (shouldHide) {
        setControlsVisible(false);
        if (!isTouch) setCursorHidden(true);
        controlsHideTimerRef.current = null;
      } else {
        controlsHideTimerRef.current = window.setTimeout(tick, timeoutMs);
      }
    }, timeoutMs);
  }, [
    isTouchDeviceRef,
    isScrubbingRef,
    isHoveringControlsRef,
    isPlayingRef,
  ]);

  // Expose the scheduler to earlier effects via ref to avoid ordering issues
  useEffect(() => {
    scheduleControlsAutohideRef.current = scheduleControlsAutohide;
  }, [scheduleControlsAutohide]);

  useEffect(() => {
    if (controlsVisible) {
      scheduleControlsAutohide();
    } else if (controlsHideTimerRef.current) {
      window.clearTimeout(controlsHideTimerRef.current);
      controlsHideTimerRef.current = null;
    }
  }, [controlsVisible, scheduleControlsAutohide]);

  // Fallback autohide on mobile/fullscreen to ensure UI disappears after play
  useEffect(() => {
    if (!isTouchDevice) return;
    if (!controlsVisible) return;
    if (!isPlaying) return;

    const delay = isFullscreen ? 1500 : CONFIG.CONTROLS_AUTOHIDE_MS_TOUCH;
    const id = window.setTimeout(() => {
      // Only hide if user isn't interacting and still playing
      if (
        isPlayingRef.current &&
        !isScrubbingRef.current &&
        !isHoveringRef.current &&
        !isHoveringControlsRef.current &&
        !(document.activeElement?.matches(":focus-visible") && containerRef.current?.contains(document.activeElement) && document.activeElement !== containerRef.current)
      ) {
        setControlsVisible(false);
        if (!isTouchDeviceRef.current) setCursorHidden(true);
      }
    }, delay);
    return () => window.clearTimeout(id);
  }, [isTouchDevice, isFullscreen, controlsVisible, isPlaying, isPlayingRef, isScrubbingRef, isHoveringRef, isHoveringControlsRef, isTouchDeviceRef]);

  // Mobile-only idle-based hard autohide: if no touch/pointer activity for a while, hide everything
  useEffect(() => {
    if (!isTouchDevice) return;
    const root = containerRef.current;
    if (!root) return;

    const mark = () => {
      lastInteractionRef.current = Date.now();
      // Show on interaction and let the normal timer handle further hiding
      setControlsVisible(true);
      scheduleControlsAutohideRef.current?.();
    };

    const opts: AddEventListenerOptions = { passive: true };
    root.addEventListener("pointerdown", mark, opts);
    root.addEventListener("pointerup", mark, opts);
    root.addEventListener("touchstart", mark, opts);
    root.addEventListener("touchend", mark, opts);

    const intervalId = window.setInterval(() => {
      if (!isPlayingRef.current) return;
      const idle = Date.now() - lastInteractionRef.current;
      const threshold = isFullscreenRef.current ? 1500 : CONFIG.CONTROLS_AUTOHIDE_MS_TOUCH;
      const focusedControl = document.activeElement?.matches(":focus-visible") && root.contains(document.activeElement) && document.activeElement !== root;
      if (idle >= threshold && !isScrubbingRef.current && !focusedControl) {
        setIsHovering(false);
        setIsHoveringControls(false);
        setControlsVisible(false);
        if (controlsHideTimerRef.current) {
          window.clearTimeout(controlsHideTimerRef.current);
          controlsHideTimerRef.current = null;
        }
      }
    }, 250);

    return () => {
      root.removeEventListener("pointerdown", mark as any, opts as any);
      root.removeEventListener("pointerup", mark as any, opts as any);
      root.removeEventListener("touchstart", mark as any, opts as any);
      root.removeEventListener("touchend", mark as any, opts as any);
      window.clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isTouchDevice]);

  // global fullscreen listeners (DOM FS API)
  useEffect(() => {
    const onFsChange = () => {
      const fs = !!document.fullscreenElement;
      setIsFullscreen(fs);
      if (fs) {
        scheduleControlsAutohide();
      } else {
        const prev = (document.documentElement as any).__prevOverflow ?? "";
        document.documentElement.style.overflow = prev;
        delete (document.documentElement as any).__prevOverflow;

        try {
          playerInstance.current?.setFullscreen?.(false);
        } catch { }
      }
    };
    document.addEventListener("fullscreenchange", onFsChange);
    document.addEventListener("webkitfullscreenchange", onFsChange as any);
    return () => {
      document.removeEventListener("fullscreenchange", onFsChange);
      document.removeEventListener("webkitfullscreenchange", onFsChange as any);
    };
  }, [scheduleControlsAutohide]);

  const seekBy = (sec: number) => {
    const p = playerInstance.current;
    const mediaDuration = durationRef.current || p?.getDuration?.() || 0;
    if (!p || !Number.isFinite(mediaDuration) || mediaDuration <= 0 || !Number.isFinite(sec) || sec === 0) return;
    const pos = seekControllerRef.current?.getTarget() ?? p.getPosition?.() ?? position;
    const newPos = Math.max(0, Math.min(mediaDuration, pos + sec));
    const skipped = Math.abs(newPos - pos);
    if (skipped < 0.05) return;
    const displayedSeconds = Math.round(skipped * 10) / 10;
    commitSeek(newPos);
    setControlsVisible(true);
    scheduleControlsAutohideRef.current?.();
    const direction = sec > 0 ? "forward" : "back";
    const id = ++seekFeedbackSequenceRef.current;
    const now = performance.now();
    const consecutive = now - seekFeedbackLastAtRef.current < 700;
    seekFeedbackLastAtRef.current = now;
    setSeekOverlay((previous) => ({
      id,
      direction,
      seconds: consecutive && previous?.direction === direction
        ? Math.round((previous.seconds + displayedSeconds) * 10) / 10
        : displayedSeconds,
    }));
    if (seekOverlayTimerRef.current)
      window.clearTimeout(seekOverlayTimerRef.current);
    seekOverlayTimerRef.current = window.setTimeout(() => {
      setSeekOverlay(null);
      seekOverlayTimerRef.current = null;
    }, 700);
  };

  const [seekOverlay, setSeekOverlay] = useState<SeekFeedbackEvent | null>(null);

  const handleCaptureFrame = useCallback(() => {
    const videoEl = containerRef.current?.querySelector("video");
    if (!videoEl) return;
    const canvas = document.createElement("canvas");
    canvas.width = (videoEl as HTMLVideoElement).videoWidth;
    canvas.height = (videoEl as HTMLVideoElement).videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(
      videoEl as HTMLVideoElement,
      0,
      0,
      canvas.width,
      canvas.height
    );
    const dataUrl = canvas.toDataURL("image/png");
    setCapturedImage(dataUrl);
    setShowImagePreview(true);
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `frame-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => setShowImagePreview(false), 2000);
  }, []);

  // native attrs after ready
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const video = root.querySelector("video") as HTMLVideoElement | null;
    if (!video) return;
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    video.removeAttribute("controls");
  }, [isReady]);

  return (
    <div
      className={`relative overflow-hidden rounded-xl bg-black ${className}`}
    >
        <div
          ref={containerRef}
          className={
            isIOS
              ? "relative w-full aspect-video scroll-mt-16 overflow-hidden bg-black [transform:translateZ(0)]"
              : isFullscreen
                ? "fixed left-0 top-0 z-50 box-border flex h-[100vh] w-[100vw] items-center justify-center overflow-hidden bg-black"
                : "relative w-full aspect-video scroll-mt-16 overflow-hidden bg-black"
          }
        onContextMenu={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (isTouchDevice) return;
          if (aboutHideTimerRef.current) window.clearTimeout(aboutHideTimerRef.current);
          const rect = event.currentTarget.getBoundingClientRect();
          setAboutPos({
            x: Math.max(8, Math.min(rect.width - 224, event.clientX - rect.left)),
            y: Math.max(8, Math.min(rect.height - 48, event.clientY - rect.top)),
          });
          setShowAboutMsg(true);
        }}
        tabIndex={0}
        aria-label="Trình phát video"
        onFocus={() => setControlsVisible(true)}
        onMouseEnter={() => {
          setIsHovering(true);
          setControlsVisible(true);
          setCursorHidden(false);
        }}
        onMouseMove={() => {
          setControlsVisible(true);
          scheduleControlsAutohide();
          if (!isTouchDevice && cursorHidden) setCursorHidden(false);
        }}
        onMouseLeave={() => {
          if (!containerRef.current?.contains(document.activeElement)) {
            setControlsVisible(false);
          }
          setIsHovering(false);
          setCursorHidden(false);
          if (controlsHideTimerRef.current) {
            window.clearTimeout(controlsHideTimerRef.current);
            controlsHideTimerRef.current = null;
          }
        }}
        onTouchStart={() => {
          if (!isScrubbing) {
            setIsHovering(true);
            setControlsVisible(true);
            scheduleControlsAutohide();
          }
        }}
        onTouchEnd={() => setIsHovering(false)}
        >
          {(!isReady || (seekTarget !== null || isScrubbing ? isSeekLoading : isBuffering)) && (
            <div role="status" aria-label="Đang tải video" className="pointer-events-none absolute inset-0 z-[25] flex items-center justify-center">
              <LoaderCircle className="h-10 w-10 animate-spin text-white/85 drop-shadow-md" />
            </div>
          )}
          {isIOS && !supportsAspectRatio && (
            <div style={{ paddingTop: "56.25%" }} />
          )}
        <div
          ref={playerHostRef}
          className={
            isFullscreen
              ? "w-[100vw] h-[100vh] z-0"
              : "relative w-full aspect-video z-0"
          }
        />

        {/* Interaction overlay */}
        <div
          ref={overlayRef}
          className={`absolute inset-0 z-10 ${!isTouchDevice && cursorHidden ? "cursor-none" : "cursor-pointer"
            }`}
          style={{
            WebkitTapHighlightColor: "transparent",
            touchAction: "manipulation",
          }}
          onMouseDown={(event) => {
            if (event.button === 0) containerRef.current?.focus?.({ preventScroll: true });
          }}
          onClick={() => {
            const p = playerInstance.current;
            if (!p) return;
            containerRef.current?.focus?.();
            if (isTouchDevice && suppressClickRef.current) {
              suppressClickRef.current = false;
              return;
            }
            if (isTouchDevice) {
              setControlsVisible(true);
              scheduleControlsAutohide();
              return;
            }
            if (!controlsVisible) {
              setControlsVisible(true);
              scheduleControlsAutohide();
              return;
            }
            if (forcedAutoplayMuteRef.current && !muted) {
              try {
                p.setMute?.(false);
              } catch { }
              forcedAutoplayMuteRef.current = false;
            }
            isPlaying ? p.pause?.() : p.play?.(true);
            scheduleControlsAutohide();
          }}
          onTouchEnd={() => {
            // End of touch interaction should allow autohide
            setIsHovering(false);
          }}
          onTouchCancel={() => {
            setIsHovering(false);
          }}
          onPointerUp={(e) => {
            if (e.pointerType === "touch") {
              setIsHovering(false);
            }
          }}
          onDoubleClick={(e) => {
            e.preventDefault();
            const p = playerInstance.current;
            if (!p || !containerRef.current) return;
            if (!isTouchDevice) return;
            suppressClickRef.current = true;
            setTimeout(() => {
              suppressClickRef.current = false;
            }, 350);
            const rect = containerRef.current.getBoundingClientRect();
            const tapX = e.clientX - rect.left;
            const width = rect.width;
            const leftZoneEnd = width * CONFIG.DOUBLE_TAP_ZONE_RATIO;
            const rightZoneStart = width * (1 - CONFIG.DOUBLE_TAP_ZONE_RATIO);
            if (tapX < leftZoneEnd) seekBy(-CONFIG.SKIP_SECONDS);
            else if (tapX > rightZoneStart) seekBy(CONFIG.SKIP_SECONDS);
          }}
          onTouchStart={() => {
            setIsHovering(true);
            setControlsVisible(true);
            scheduleControlsAutohide();
          }}
          onPointerDown={(e) => {
            if (e.pointerType === "touch") {
              setIsHovering(true);
              setControlsVisible(true);
              scheduleControlsAutohide();
            }
          }}
        />

        <SeekFeedback feedback={seekOverlay} />

        {/* About popup (desktop) */}
        {!isTouchDevice && (
          <div
            data-player-context-menu=""
            aria-hidden={!showAboutMsg}
            className={`absolute z-[60] rounded-xl border border-white/10 bg-zinc-950 px-3.5 py-3 text-xs text-white shadow-lg ${showAboutMsg ? "visible pointer-events-auto" : "invisible pointer-events-none"}`}
            style={{
              top: aboutPos?.y ?? 0,
              left: aboutPos?.x ?? 0,
            }}
            onClick={(e) => {
              e.stopPropagation();
              window.open(
                "https://www.youtube.com/watch?v=xLE9RI372LY",
                "_blank"
              );
              setShowAboutMsg(false);
            }}
            onContextMenu={(e) => e.preventDefault()}
            onMouseLeave={() => {
              if (aboutHideTimerRef.current) {
                window.clearTimeout(aboutHideTimerRef.current);
                aboutHideTimerRef.current = null;
              }
              aboutHideTimerRef.current = window.setTimeout(() => {
                setShowAboutMsg(false);
                aboutHideTimerRef.current = null;
              }, CONFIG.ABOUT_MESSAGE_TIMEOUT_MS);
            }}
          >
            <div className="font-semibold mb-0.5 cursor-pointer select-none whitespace-nowrap">
              {CONFIG.JW_ABOUT_TEXT}
            </div>
          </div>
        )}

        {nextEpisode && !nextEpisodeDismissed && isReady && !isScrubbing && seekTarget === null && shouldShowNextEpisode(duration, position) && (
          <aside
            aria-label="Tập tiếp theo"
            className="absolute right-3 top-3 z-40 flex max-w-[calc(100%-1.5rem)] items-center gap-1 rounded-xl border border-white/15 bg-zinc-950/95 p-1.5 text-white shadow-lg sm:right-5 sm:top-5 sm:p-2"
            onClick={(event) => event.stopPropagation()}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={nextEpisode.onSelect}
              className="flex min-h-11 items-center gap-3 rounded-lg px-2.5 py-1.5 text-left transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
              aria-label={`Xem ${nextEpisode.label}`}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-zinc-950"><SkipForward className="h-4 w-4" /></span>
              <span className="min-w-0"><span className="block text-[11px] text-white/55">TẬP TIẾP THEO</span><span className="block truncate text-sm font-medium">{nextEpisode.label}</span></span>
            </button>
            <button type="button" aria-label="Ẩn gợi ý tập tiếp theo" onClick={() => setNextEpisodeDismissed(true)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white/50 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"><X className="h-4 w-4" /></button>
          </aside>
        )}

        <PlayerControls
          key={fileUrl}
          ref={bottomHudRef}
          visible={controls && (controlsVisible || !isPlaying)}
          isTouchDevice={isTouchDevice}
          isPlaying={isPlaying}
          isReady={isReady}
          isBuffering={isBuffering}
          isMuted={isMuted}
          isFullscreen={isFullscreen}
          isInPip={isInPip}
          pipSupported={pipSupported}
          canCapture={!isAndroid || !isFullscreen}
          hasChapters={chapters.length > 0}
          position={seekTarget ?? position}
          duration={duration}
          buffered={buffer}
          volume={volume}
          onTogglePlay={() => {
            const p = playerInstance.current;
            if (!p) return;
            if (forcedAutoplayMuteRef.current && !muted) {
              p.setMute?.(false);
              forcedAutoplayMuteRef.current = false;
            }
            isPlaying ? p.pause?.() : p.play?.(true);
          }}
          onSkip={seekBy}
          onSeekPreview={(seconds) => seekControllerRef.current?.preview(seconds)}
          onSeekCommit={commitSeek}
          onScrubStart={beginScrubbing}
          onToggleMute={() => playerInstance.current?.setMute?.(!isMuted)}
          onVolumeChange={(value) => {
            const p = playerInstance.current;
            if (!p) return;
            p.setVolume?.(value);
            p.setMute?.(value === 0);
            setVolumeState(value);
          }}
          onNextChapter={() => {
            const p = playerInstance.current;
            if (!p) return;
            const current = seekControllerRef.current?.getTarget() ?? p.getPosition?.() ?? position;
            const next = [...chapters]
              .filter((time) => Number.isFinite(time) && time > current + 0.25)
              .sort((a, b) => a - b)[0];
            if (next !== undefined) commitSeek(Math.min(duration || next, next));
          }}
          onCapture={handleCaptureFrame}
          onTogglePip={() => pipCtrlRef.current?.toggle()}
          onToggleFullscreen={() => controllerRef.current?.toggle()}
          onInteraction={() => {
            lastInteractionRef.current = Date.now();
            setControlsVisible(true);
            setCursorHidden(false);
            scheduleControlsAutohide();
          }}
          onHoverChange={(hovering) => {
            isHoveringControlsRef.current = hovering;
            setIsHoveringControls(hovering);
          }}
        />

        {showImagePreview && capturedImage && (
          <div className="pointer-events-none absolute right-4 top-4 z-40 w-40 overflow-hidden rounded-lg border border-white/20 bg-black/80 shadow-lg sm:w-56">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={capturedImage} alt="Ảnh vừa chụp" className="aspect-video w-full object-contain" />
            <p className="px-3 py-2 text-xs text-white/80">Đã lưu ảnh chụp</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default NJWPlayerComponent;
