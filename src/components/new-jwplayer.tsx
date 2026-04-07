"use client";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Slider } from "@/components/ui/slider";
import {
  Volume2,
  Flag,
  VolumeOff,
  Volume1,
  Maximize2,
  Minimize2,
  PictureInPicture2,
  Camera,
  LoaderPinwheel,
  FastForward,
  Rewind,
} from "lucide-react";
import { Tooltip, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { TooltipContent } from "@radix-ui/react-tooltip";
import {
  BackwardIcon,
  ForwardIcon,
  PauseIcon,
  PlayIcon,
} from "./ui/player-icon";
import { consoleProtection } from "../lib/console-protection";
import { createFullscreenController } from "@/lib/fullscreen-controller";
import { createPipController } from "@/lib/pip-controller";

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
  CONTROLS_AUTOHIDE_MS_DESKTOP: 1000,
  DOUBLE_TAP_ZONE_RATIO: 0.5,
  SKIP_SECONDS: 10,
  LABELS: {
    PLAY: "Play",
    PAUSE: "Pause",
    MUTE: "Mute",
    FULLSCREEN: "Fullscreen",
    PIP: "Picture-in-Picture",
    BACK_X: (x: number) => `Back ${x} seconds`,
    FORWARD_X: (x: number) => `Forward ${x} seconds`,
    NEXT_CHAPTER: "Next chapter",
  },
  TOOLTIPS: {
    BACKWARD: "Lùi 10 giây",
    FORWARD: "Tiến 10 giây",
    NEXT_CHAPTER: "Tới mốc tiếp theo",
    SCREENSHOT: "Chụp màn hình",
    PIP: "Chế độ hình trong hình (PiP)",
  },
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
  server: "hls" | "helvid" | "hydax";
  autoPlay?: boolean;
  muted?: boolean;
  controls?: boolean; // kept for parity, UI is custom
  onLoad?: () => void;
  onError?: (error: string) => void;
  onHudHeightChange?: (height: number) => void;
  className?: string;
  chapters?: number[]; // seconds from start
}

type DesktopControlKey =
  | "play"
  | "backward"
  | "forward"
  | "chapter"
  | "volume"
  | "time"
  | "screenshot"
  | "pip"
  | "fullscreen";

type DesktopControlCluster = "left" | "right";

type DesktopControlTone = "dark" | "light";

const DESKTOP_CONTROL_CLUSTER_MAP: Record<DesktopControlKey, DesktopControlCluster> = {
  play: "left",
  backward: "left",
  forward: "left",
  chapter: "left",
  volume: "left",
  time: "left",
  screenshot: "right",
  pip: "right",
  fullscreen: "right",
};

const DEFAULT_DESKTOP_CONTROL_TONES: Record<DesktopControlCluster, DesktopControlTone> = {
  left: "dark",
  right: "dark",
};

/* =====================================================================================
 * UTILS
 * ===================================================================================*/
const isAndroidUA = () =>
  typeof navigator !== "undefined" && /android/i.test(navigator.userAgent);
const isIOSUA = () =>
  typeof navigator !== "undefined" &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.userAgent.includes("Mac") && "ontouchend" in document));

function formatTime(seconds: number) {
  if (!isFinite(seconds) || seconds < 0) seconds = 0;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

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

  const playerRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);
  const overlayRef = useRef<HTMLDivElement | null>(null);
  const bottomHudRef = useRef<HTMLDivElement | null>(null);
  const playerInstance = useRef<any>(null);
  const prevFileUrlRef = useRef<string | null>(null);
  const savedPositionRef = useRef(0);
  const wasPlayingRef = useRef(false);
  const controlsHideTimerRef = useRef<number | null>(null);
  const aboutHideTimerRef = useRef<number | null>(null);
  const seekOverlayTimerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
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
  const [buffer, setBuffer] = useState(0);
  const [levels, setLevels] = useState<{ label: string; index: number }[]>([]);
  const [currentLevel, setCurrentLevel] = useState<number | null>(null);
  const [hoverTime, setHoverTime] = useState<{ x: number; t: number } | null>(
    null
  );
  const [controlsVisible, setControlsVisible] = useState(false);
  // Dedicated visibility for the 3 big center mobile buttons to avoid being stuck
  const [centerControlsVisible, setCenterControlsVisible] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubPct, setScrubPct] = useState<number | null>(null);
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
  const [showRemainingTime, setShowRemainingTime] = useState(false);
  const [desktopHudHeight, setDesktopHudHeight] = useState(96);
  const [desktopControlTones, setDesktopControlTones] = useState<Record<DesktopControlCluster, DesktopControlTone>>(
    DEFAULT_DESKTOP_CONTROL_TONES
  );

  const isScrubbingRef = useSyncedRef(isScrubbing);
  const isHoveringRef = useSyncedRef(isHovering);
  const isHoveringControlsRef = useSyncedRef(isHoveringControls);
  const isFullscreenRef = useSyncedRef(isFullscreen);
  const isTouchDeviceRef = useSyncedRef(isTouchDevice);
  const centerControlsVisibleRef = useSyncedRef(centerControlsVisible);
  const isPlayingRef = useSyncedRef(isPlaying);
  // Mobile idle tracking: last time the user touched or interacted with the player
  const lastInteractionRef = useRef<number>(Date.now());
  const desktopControlRefs = useRef<Partial<Record<DesktopControlKey, HTMLElement | null>>>({});

  const setDesktopControlRef = useCallback(
    (key: DesktopControlKey, node: HTMLElement | null) => {
      if (node) {
        desktopControlRefs.current[key] = node;
        return;
      }

      delete desktopControlRefs.current[key];
    },
    []
  );

  const jwReady = useJWScript(onError);
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
      setDesktopHudHeight(0);
      onHudHeightChange?.(0);
      return;
    }

    const hudNode = bottomHudRef.current;
    if (!hudNode) return;

    const updateHudHeight = () => {
      const nextHeight = Math.ceil(hudNode.getBoundingClientRect().height);
      if (!Number.isFinite(nextHeight) || nextHeight <= 0) return;
      setDesktopHudHeight(nextHeight);
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
  }, [isTouchDevice, onHudHeightChange]);

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
    const root = containerRef.current;
    if (!root) return;

    const apply = (v: HTMLVideoElement) => {
      try {
        v.crossOrigin = "anonymous";
      } catch { }
      v.setAttribute("playsinline", "");
      v.setAttribute("webkit-playsinline", "");
    };

    const trySet = () => {
      const v = root.querySelector("video") as HTMLVideoElement | null;
      if (v) apply(v);
    };

    trySet();
    const mo = new MutationObserver(trySet);
    mo.observe(root, { subtree: true, childList: true });
    return () => mo.disconnect();
  }, []);

  // JW setup / reload on file change
  useEffect(() => {
    if (!isHls || !libReady || !playerRef.current) return;
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
      playerInstance.current = w.jwplayer(playerRef.current).setup({
        width: "100%",
        height: "100%",
        primary: CONFIG.PLAYER_PRIMARY,
        controls: false,
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
          // Faster startup and fewer stalls on mobile
          startLevel: 0, // begin with the lowest level to start playback quickly
          capLevelToPlayerSize: true,
          maxBufferLength: 10,
          backBufferLength: 30,
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
        const qls = p.getQualityLevels?.() || [];
        setLevels(
          qls.map((q: any, idx: number) => ({
            label: q.label || `Q${idx + 1}`,
            index: idx,
          }))
        );
        const curQ = p.getCurrentQuality?.();
        setCurrentLevel(typeof curQ === "number" ? curQ : null);

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
        setIsPlaying(false);
        // When paused, we are not buffering for playback
        setIsBuffering(false);
      });
      p.on("time", (e: any) => {
        setPosition(e?.position || 0);
        if (typeof e?.duration === "number") setDuration(e.duration);
        // Any time update implies playback is progressing; clear buffering
        if (playerInstance.current?.getState?.() === "playing") {
          setIsBuffering(false);
        }
      });
      p.on("buffer", (e: any) => {
        setIsBuffering(true);
        if (typeof e?.bufferPercent === "number") {
          const dur = p.getDuration?.() || 0;
          setBuffer((e.bufferPercent / 100) * dur);
          // If buffer nearly full, avoid keeping spinner forever
          if (e.bufferPercent >= 95) {
            setIsBuffering(false);
          }
        }
      });
      // Idle/complete/firstFrame should never show buffering spinner
      p.on("idle", () => setIsBuffering(false));
      p.on("complete", () => setIsBuffering(false));
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
      p.on("levels", () => {
        const q = p.getQualityLevels?.() || [];
        setLevels(
          q.map((lv: any, idx: number) => ({
            label: lv.label || `Q${idx + 1}`,
            index: idx,
          }))
        );
      });
      p.on("levelsChanged", () => {
        const cq = p.getCurrentQuality?.();
        setCurrentLevel(typeof cq === "number" ? cq : null);
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
      p.on("error", (e: any) => onError?.(e?.message || CONFIG.ERRORS.GENERAL));

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

  useEffect(() => {
    if (!isReady || isTouchDevice) return;

    const canvas = document.createElement("canvas");
    canvas.width = 160;
    canvas.height = 90;
    const context = canvas.getContext("2d", { willReadFrequently: true });

    if (!context) return;

    const resolveToneFromLuminance = (
      luminance: number
    ): DesktopControlTone => (luminance < 148 ? "dark" : "light");

    const sampleLuminanceAtElement = (
      element: HTMLElement,
      videoRect: DOMRect
    ): number | null => {
      const iconAnchor = element.querySelector("svg") as SVGElement | null;
      const rect = (iconAnchor?.getBoundingClientRect() ??
        element.getBoundingClientRect()) as DOMRect;

      if (rect.width < 1 || rect.height < 1 || videoRect.width < 1 || videoRect.height < 1) {
        return null;
      }

      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      if (
        centerX < videoRect.left ||
        centerX > videoRect.right ||
        centerY < videoRect.top ||
        centerY > videoRect.bottom
      ) {
        return null;
      }

      const relativeX = (centerX - videoRect.left) / videoRect.width;
      const relativeY = (centerY - videoRect.top) / videoRect.height;
      const canvasX = Math.round(relativeX * (canvas.width - 1));
      const canvasY = Math.round(relativeY * (canvas.height - 1));
      const sampleWidth = Math.max(4, Math.min(canvas.width, Math.round((rect.width / videoRect.width) * canvas.width * 0.35)));
      const sampleHeight = Math.max(4, Math.min(canvas.height, Math.round((rect.height / videoRect.height) * canvas.height * 0.35)));
      const startX = Math.max(0, Math.min(canvas.width - sampleWidth, canvasX - Math.floor(sampleWidth / 2)));
      const startY = Math.max(0, Math.min(canvas.height - sampleHeight, canvasY - Math.floor(sampleHeight / 2)));
      const { data } = context.getImageData(startX, startY, sampleWidth, sampleHeight);

      let luminanceTotal = 0;
      let pixelCount = 0;

      for (let index = 0; index < data.length; index += 4) {
        const alpha = data[index + 3] / 255;
        if (alpha < 0.2) continue;

        luminanceTotal +=
          (0.2126 * data[index] +
            0.7152 * data[index + 1] +
            0.0722 * data[index + 2]) *
          alpha;
        pixelCount += 1;
      }

      if (pixelCount === 0) return null;

      return luminanceTotal / pixelCount;
    };

    const sampleControlThemes = () => {
      const video = containerRef.current?.querySelector(
        "video"
      ) as HTMLVideoElement | null;

      if (!video || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
        return;
      }

      try {
        const videoRect = video.getBoundingClientRect();
        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        setDesktopControlTones((previous) => {
          let changed = false;
          const next = { ...previous };
          const clusterSamples: Record<DesktopControlCluster, number[]> = {
            left: [],
            right: [],
          };

          (Object.keys(DESKTOP_CONTROL_CLUSTER_MAP) as DesktopControlKey[]).forEach((key) => {
            const element = desktopControlRefs.current[key];
            if (!element || !element.isConnected) return;

            const luminance = sampleLuminanceAtElement(element, videoRect);
            if (luminance == null) return;

            clusterSamples[DESKTOP_CONTROL_CLUSTER_MAP[key]].push(luminance);
          });

          (Object.keys(clusterSamples) as DesktopControlCluster[]).forEach((cluster) => {
            const samples = clusterSamples[cluster];
            if (samples.length === 0) return;

            const averageLuminance =
              samples.reduce((sum, value) => sum + value, 0) / samples.length;
            const nextTone = resolveToneFromLuminance(averageLuminance);

            if (next[cluster] !== nextTone) {
              next[cluster] = nextTone;
              changed = true;
            }
          });

          return changed ? next : previous;
        });
      } catch {
        // Ignore sampling failures (e.g. transient cross-origin/decoder states)
      }
    };

    const intervalMs = controlsVisible ? 320 : 720;
    const initialTimeoutId = window.setTimeout(sampleControlThemes, 120);
    const intervalId = window.setInterval(sampleControlThemes, intervalMs);

    return () => {
      window.clearTimeout(initialTimeoutId);
      window.clearInterval(intervalId);
    };
  }, [controlsVisible, isReady, isTouchDevice]);

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
          e.preventDefault();
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
      const isFS = isFullscreenRef.current;
      const scrubbing = isScrubbingRef.current;
      const hovering = isHoveringRef.current;
      const hoveringCtl = isHoveringControlsRef.current;
      const isTouch = isTouchDeviceRef.current;

      const shouldHide = isFS
        ? !scrubbing && !hoveringCtl
        : !scrubbing && (isTouch ? !hovering : !hovering && !hoveringCtl);

      if (shouldHide) {
        setControlsVisible(false);
        // Keep center controls in sync on touch devices
        if (isTouch) setCenterControlsVisible(false);
        if (!isTouch) setCursorHidden(true);
        controlsHideTimerRef.current = null;
      } else {
        controlsHideTimerRef.current = window.setTimeout(tick, timeoutMs);
      }
    }, timeoutMs);
  }, [
    isTouchDeviceRef,
    isFullscreenRef,
    isScrubbingRef,
    isHoveringRef,
    isHoveringControlsRef,
  ]);

  // Expose the scheduler to earlier effects via ref to avoid ordering issues
  useEffect(() => {
    scheduleControlsAutohideRef.current = scheduleControlsAutohide;
  }, [scheduleControlsAutohide]);

  // Removed separate center-controls autohide; we synchronize with the main controls timer

  // When generic controls visibility changes on touch, sync center controls logic (but keep independent timer)
  useEffect(() => {
    if (!isTouchDevice) return;
    // Center controls visibility follows the main control bar
    setCenterControlsVisible(!!controlsVisible);
  }, [controlsVisible, isTouchDevice]);

  // React to play/pause to show/hide center controls deterministically
  // Center controls now mirror controlsVisible; no extra play/pause handling needed

  // Orientation or fullscreen changes should reshow briefly then hide
  useEffect(() => {
    if (!isTouchDevice) return;
    if (isFullscreen) {
      // Briefly show controls when entering fullscreen; main timer will hide them
      setCenterControlsVisible(true);
    }
  }, [isFullscreen, isTouchDevice]);

  // User interactions that should reset timer
  const bumpCenterControls = useCallback(() => {
    if (!isTouchDeviceRef.current) return;
    setCenterControlsVisible(true);
    // rely on main controls timer
  }, [isTouchDeviceRef]);

  // No separate center-controls timer anymore

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
        !isHoveringControlsRef.current
      ) {
        setControlsVisible(false);
        setCenterControlsVisible(false);
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
      setCenterControlsVisible(true);
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
      if (idle >= threshold && !isScrubbingRef.current) {
        setIsHovering(false);
        setIsHoveringControls(false);
        setControlsVisible(false);
        setCenterControlsVisible(false);
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

  // progress bar scrubbing (mouse)
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isScrubbing || !progressBarRef.current) return;
      const rect = progressBarRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const pct = rect.width ? x / rect.width : 0;
      const t = pct * (duration || 0);
      setScrubPct(pct * 100);
      setHoverTime({ x, t });
      if (!playerInstance.current || !duration) return;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        playerInstance.current.seek?.(t);
        rafRef.current = null;
      });
    };
    const onUp = () => {
      if (!isScrubbing) return;
      setIsScrubbing(false);
      scheduleControlsAutohide();
    };
    if (isScrubbing) {
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
      return () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isScrubbing, duration]);

  const seekBy = (sec: number) => {
    const p = playerInstance.current;
    if (!p) return;
    const pos = p.getPosition?.() || position;
    const newPos = Math.max(0, Math.min(duration, pos + sec));
    p.seek?.(newPos);
    setSeekOverlay(
      sec > 0
        ? { type: "forward", seconds: Math.abs(sec) }
        : { type: "back", seconds: Math.abs(sec) }
    );
    if (seekOverlayTimerRef.current)
      window.clearTimeout(seekOverlayTimerRef.current);
    seekOverlayTimerRef.current = window.setTimeout(() => {
      setSeekOverlay(null as any);
      seekOverlayTimerRef.current = null;
    }, 800);
  };

  const [seekOverlay, setSeekOverlay] = useState<{
    type: "back" | "forward";
    seconds: number;
  } | null>(null);

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

  // fallback for non-hls servers (kept for parity – iframe embed outside scope)
  if (!isHls) {
    // You can embed helvid/hydax here if needed; keeping return wrapper for layout consistency
  }

  const playedPct = duration ? (position / duration) * 100 : 0;
  const bufferedPct = duration ? (buffer / duration) * 100 : 0;
  const effectivePlayedPct =
    isScrubbing && scrubPct !== null ? scrubPct : playedPct;
  const remainingTime = Math.max(0, duration - position);
  const getDesktopTone = (key: DesktopControlKey): DesktopControlTone =>
    desktopControlTones[DESKTOP_CONTROL_CLUSTER_MAP[key]] ?? "dark";
  const getDesktopControlButtonClass = (key: DesktopControlKey) =>
    getDesktopTone(key) === "dark"
      ? "rounded-2xl bg-black/78 p-2.5 text-white shadow-[0_12px_28px_rgba(15,23,42,0.52)] transition-all duration-200 hover:bg-black/84 hover:text-white hover:shadow-[0_12px_30px_rgba(236,72,153,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300/60"
      : "rounded-2xl bg-white/96 p-2.5 text-black shadow-[0_12px_28px_rgba(15,23,42,0.18)] transition-all duration-200 hover:bg-white hover:text-black hover:shadow-[0_12px_30px_rgba(236,72,153,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300/50";
  const getDesktopTooltipClass = (key: DesktopControlKey) =>
    getDesktopTone(key) === "dark"
      ? "rounded-xl bg-black/84 px-3 py-1.5 text-xs font-medium text-white shadow-[0_12px_30px_rgba(2,6,23,0.42)] backdrop-blur-xl"
      : "rounded-xl bg-white/96 px-3 py-1.5 text-xs font-medium text-black shadow-[0_12px_30px_rgba(15,23,42,0.16)] backdrop-blur-xl";
  const getDesktopVolumeGroupClass = (key: DesktopControlKey) =>
    getDesktopTone(key) === "dark"
      ? "group relative flex items-center overflow-hidden rounded-2xl bg-black/76 pr-0 shadow-[0_10px_24px_rgba(15,23,42,0.4)] transition-[padding] duration-300 hover:pr-2"
      : "group relative flex items-center overflow-hidden rounded-2xl bg-white/96 pr-0 shadow-[0_10px_24px_rgba(15,23,42,0.18)] transition-[padding] duration-300 hover:pr-2";
  const getDesktopTimePillClass = (key: DesktopControlKey) =>
    getDesktopTone(key) === "dark"
      ? "flex select-none items-center gap-2 rounded-2xl bg-black/76 px-3 py-2 text-xs font-medium text-white shadow-[0_10px_24px_rgba(15,23,42,0.4)] transition-all duration-200 hover:bg-black/84 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300/60 sm:text-sm md:gap-2"
      : "flex select-none items-center gap-2 rounded-2xl bg-white/96 px-3 py-2 text-xs font-medium text-black shadow-[0_10px_24px_rgba(15,23,42,0.18)] transition-all duration-200 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-300/50 sm:text-sm md:gap-2";
  const getDesktopMutedTextClass = (key: DesktopControlKey) =>
    getDesktopTone(key) === "dark" ? "text-white/55" : "text-black/55";
  const getDesktopSecondaryTextClass = (key: DesktopControlKey) =>
    getDesktopTone(key) === "dark" ? "text-white/72" : "text-black/72";
  const getDesktopIconToneClass = (key: DesktopControlKey) =>
    getDesktopTone(key) === "dark" ? "text-white" : "text-black";

  return (
    <div
      className={`relative overflow-hidden rounded-[1.35rem] border border-white/10 bg-slate-950 shadow-[0_32px_90px_rgba(2,6,23,0.7)] ${className}`}
    >
      {/* Loading / buffering overlay */}
      {(!isReady || isBuffering) && (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 z-[5] flex items-center justify-center bg-slate-950/34 backdrop-blur-[2px] transition-[bottom] duration-200"
          style={{ bottom: !isTouchDevice ? `${desktopHudHeight}px` : 0 }}
        >
          <div
            className="relative flex h-16 w-16 items-center justify-center rounded-full border border-white/10 bg-black/40 shadow-[0_18px_50px_rgba(2,6,23,0.55)] md:h-24 md:w-24"
            style={{ transform: !isTouchDevice ? `translateY(${desktopHudHeight / 2}px)` : undefined }}
          >
            <div className="absolute inset-1 rounded-full bg-[radial-gradient(circle,rgba(244,114,182,0.25),transparent_70%)]" />
            <LoaderPinwheel className="relative h-8 w-8 animate-spin text-pink-300 drop-shadow-[0_0_20px_rgba(244,114,182,0.55)] md:h-12 md:w-12" />
          </div>
        </div>
      )}

        <div
          ref={containerRef}
          className={
            isIOS
              ? "relative w-full aspect-video overflow-hidden bg-black [transform:translateZ(0)]"
              : isFullscreen
                ? "fixed left-0 top-0 z-50 box-border flex h-[100vh] w-[100vw] items-center justify-center overflow-hidden bg-black"
                : "relative w-full aspect-video overflow-hidden bg-black [transform:translateZ(0)]"
          }
        tabIndex={0}
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
          setControlsVisible(false);
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
            bumpCenterControls();
          }
        }}
        onTouchEnd={() => setIsHovering(false)}
        >
          {!isFullscreen && !isTouchDevice && (
            <>
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(244,114,182,0.16),transparent_30%),radial-gradient(circle_at_bottom,rgba(59,130,246,0.12),transparent_28%)]" />
              <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white/10 via-white/[0.04] to-transparent" />
            </>
          )}
          {isIOS && !supportsAspectRatio && (
            <div style={{ paddingTop: "56.25%" }} />
          )}
        <div
          id="kana-player"
          ref={playerRef}
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
          onMouseDown={() => {
            containerRef.current?.focus?.();
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
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            setAboutPos({ x, y });
            setShowAboutMsg(true);
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
            bumpCenterControls();
          }}
          onPointerDown={(e) => {
            if (e.pointerType === "touch") {
              setIsHovering(true);
              setControlsVisible(true);
              scheduleControlsAutohide();
              bumpCenterControls();
            }
          }}
        />

        {/* Seek overlay */}
        {seekOverlay && (
          <>
            {seekOverlay.type === "back" && (
              <div className="absolute left-0 top-0 bottom-0 z-[15] flex items-center pl-4 md:pl-8 pointer-events-none">
                <div className="animate-fade select-none rounded-2xl border border-white/10 bg-slate-900/78 px-4 py-2.5 text-base font-semibold text-white shadow-[0_18px_40px_rgba(2,6,23,0.52)] backdrop-blur-xl md:text-lg">
                  <div className="flex items-center gap-2">
                  <Rewind className="h-6 w-6 animate-bounce-left text-pink-300 md:h-8 md:w-8" />
                  <span>Lùi {seekOverlay.seconds} giây</span>
                  </div>
                </div>
              </div>
            )}
            {seekOverlay.type === "forward" && (
              <div className="absolute right-0 top-0 bottom-0 z-[15] flex items-center justify-end pr-4 md:pr-8 pointer-events-none">
                <div className="animate-fade select-none rounded-2xl border border-white/10 bg-slate-900/78 px-4 py-2.5 text-base font-semibold text-white shadow-[0_18px_40px_rgba(2,6,23,0.52)] backdrop-blur-xl md:text-lg">
                  <div className="flex items-center gap-2">
                  <span>Tiến {seekOverlay.seconds} giây</span>
                  <FastForward className="h-6 w-6 animate-bounce-right text-pink-300 md:h-8 md:w-8" />
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* About popup (desktop) */}
        {!isTouchDevice && showAboutMsg && aboutPos && (
          <div
            className="absolute z-40 whitespace-nowrap rounded-2xl border border-white/10 bg-slate-950/92 px-3.5 py-2.5 text-xs text-white shadow-[0_18px_40px_rgba(2,6,23,0.48)] backdrop-blur-xl"
            style={{
              top: aboutPos.y,
              left: aboutPos.x,
              transform: "translate(-50%, -50%)",
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

        {/* Mobile centered controls */}
        {isTouchDevice && (
          <div
            className={`absolute inset-0 z-30 flex items-center justify-center transition-opacity duration-200 ${centerControlsVisible ? "opacity-100" : "opacity-0"
              } pointer-events-none`}
          >
            <div
              className="pointer-events-auto flex items-center gap-4 sm:gap-6"
              onTouchEnd={() => {
                // Let main timer hide after interactions
                setIsHovering(false);
                scheduleControlsAutohide();
              }}
              onTouchCancel={() => setIsHovering(false)}
            >
              <button
                aria-label={CONFIG.LABELS.BACK_X(CONFIG.SKIP_SECONDS)}
                className="flex items-center justify-center p-1 rounded-full bg-white/10 transition-colors duration-200 drop-shadow-lg"
                onClick={(e) => {
                  e.stopPropagation();
                  seekBy(-CONFIG.SKIP_SECONDS);
                  scheduleControlsAutohide();
                  bumpCenterControls();
                }}
                onTouchEnd={() => setIsHovering(false)}
              >
                <BackwardIcon className="h-7 w-7 text-white" />
              </button>
              <button
                aria-label={
                  isPlaying ? CONFIG.LABELS.PAUSE : CONFIG.LABELS.PLAY
                }
                className="flex items-center justify-center p-1 rounded-full bg-white/10 transition-colors duration-200 drop-shadow-lg"
                onClick={(e) => {
                  e.stopPropagation();
                  const p = playerInstance.current;
                  if (!p) return;
                  if (forcedAutoplayMuteRef.current && !muted) {
                    try {
                      p.setMute?.(false);
                    } catch { }
                    forcedAutoplayMuteRef.current = false;
                  }
                  isPlaying ? p.pause?.() : p.play?.(true);
                  scheduleControlsAutohide();
                  bumpCenterControls();
                }}
                onTouchEnd={() => setIsHovering(false)}
              >
                <div className="transition-opacity duration-300 ease-in-out">
                  {isPlaying ? (
                    <PauseIcon className="h-8 w-8 text-white" />
                  ) : (
                    <PlayIcon className="h-8 w-8 pl-1 text-white" />
                  )}
                </div>
              </button>
              <button
                aria-label={CONFIG.LABELS.FORWARD_X(CONFIG.SKIP_SECONDS)}
                className="flex items-center justify-center p-1 rounded-full bg-white/10 transition-colors duration-200 drop-shadow-lg"
                onClick={(e) => {
                  e.stopPropagation();
                  seekBy(CONFIG.SKIP_SECONDS);
                  scheduleControlsAutohide();
                  bumpCenterControls();
                }}
                onTouchEnd={() => setIsHovering(false)}
              >
                <ForwardIcon className="h-7 w-7 text-white" />
              </button>
            </div>
          </div>
        )}

        {/* Bottom control bar */}
        <div
          ref={bottomHudRef}
          className={`${isIOS ? "absolute" : isFullscreen ? "fixed" : "absolute"
            } inset-x-0 bottom-0 z-30 flex flex-col gap-2.5 text-white transition-opacity duration-300 ${controlsVisible
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
            } bg-gradient-to-t from-slate-950/92 via-slate-950/46 to-transparent px-4 pb-[calc(0.55rem+env(safe-area-inset-bottom))] pt-10`}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onMouseEnter={() => setIsHoveringControls(true)}
          onMouseLeave={() => setIsHoveringControls(false)}
          onContextMenu={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            setAboutPos({ x, y });
            setShowAboutMsg(true);
          }}
        >
          {/* progress bar */}
          <div
            className={`relative cursor-pointer group ${controlsVisible ? "" : "pointer-events-none"
              }`}
            ref={progressBarRef}
            style={{ height: isTouchDevice ? 10 : 8 }}
            onMouseMove={(e) => {
              if (!progressBarRef.current) return;
              const rect = progressBarRef.current.getBoundingClientRect();
              const x = Math.max(
                0,
                Math.min(rect.width, e.clientX - rect.left)
              );
              const pct = rect.width ? x / rect.width : 0;
              const t = pct * (duration || 0);
              setHoverTime({ x, t });
              if (isScrubbing) setScrubPct(pct * 100);
            }}
            onMouseLeave={() => setHoverTime(null)}
            onMouseDown={(e) => {
              if (!progressBarRef.current) return;
              const rect = progressBarRef.current.getBoundingClientRect();
              const x = Math.max(
                0,
                Math.min(rect.width, e.clientX - rect.left)
              );
              const pct = rect.width ? x / rect.width : 0;
              const t = pct * (duration || 0);
              setHoverTime({ x, t });
              setIsScrubbing(true);
              setScrubPct(pct * 100);
              e.preventDefault();
              e.stopPropagation();
            }}
            onMouseUp={() => {
              if (!isScrubbing) return;
              setIsScrubbing(false);
              setIsHovering(false);
              scheduleControlsAutohide();
            }}
            onClick={(e) => {
              const p = playerInstance.current;
              if (!p || !duration || !progressBarRef.current) return;
              const rect = progressBarRef.current.getBoundingClientRect();
              const x = Math.max(
                0,
                Math.min(rect.width, e.clientX - rect.left)
              );
              const pct = rect.width ? x / rect.width : 0;
              const sec = Math.max(0, Math.min(duration, pct * duration));
              p.seek?.(sec);
              setTimeout(() => setHoverTime(null), 800);
              scheduleControlsAutohide();
            }}
            onTouchStart={(e) => {
              if (!progressBarRef.current) return;
              const touch = e.touches?.[0];
              if (!touch) return;
              const rect = progressBarRef.current.getBoundingClientRect();
              const x = Math.max(
                0,
                Math.min(rect.width, touch.clientX - rect.left)
              );
              const pct = rect.width ? x / rect.width : 0;
              const t = pct * (duration || 0);
              setHoverTime({ x, t });
              setIsScrubbing(true);
              setScrubPct(pct * 100);
              e.preventDefault();
              e.stopPropagation();
            }}
            onTouchMove={(e) => {
              if (!isScrubbing || !progressBarRef.current) return;
              const touch = e.touches?.[0];
              if (!touch) return;
              const rect = progressBarRef.current.getBoundingClientRect();
              const x = Math.max(
                0,
                Math.min(rect.width, touch.clientX - rect.left)
              );
              const pct = rect.width ? x / rect.width : 0;
              setScrubPct(pct * 100);
              const t = pct * (duration || 0);
              setHoverTime({ x, t });
              const p = playerInstance.current;
              if (p && duration) p.seek?.(t);
              e.preventDefault();
              e.stopPropagation();
            }}
            onTouchEnd={() => {
              if (!progressBarRef.current) return;
              const pct = typeof scrubPct === "number" ? scrubPct / 100 : 0;
              const sec = Math.max(0, Math.min(duration, pct * duration));
              const p = playerInstance.current;
              if (p && duration) p.seek?.(sec);
              setIsScrubbing(false);
              setIsHovering(false);
              if (controlsHideTimerRef.current) {
                window.clearTimeout(controlsHideTimerRef.current);
                controlsHideTimerRef.current = null;
              }
              controlsHideTimerRef.current = window.setTimeout(() => {
                setControlsVisible(false);
                controlsHideTimerRef.current = null;
              }, CONFIG.CONTROLS_AUTOHIDE_MS_TOUCH);
              setTimeout(() => setHoverTime(null), 1200);
            }}
          >
            <div className="absolute inset-0 rounded-full border border-white/10 bg-white/10 transition-all duration-200 group-hover:scale-y-125 origin-center" />
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-white/18 transition-all duration-200"
              style={{ width: `${Math.min(100, bufferedPct)}%` }}
            />
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-fuchsia-400 via-pink-400 to-orange-300 shadow-[0_0_18px_rgba(244,114,182,0.45)] transition-all duration-200 group-hover:scale-y-125 origin-center"
              style={{ width: `${Math.min(100, effectivePlayedPct)}%` }}
            />
            {!isTouchDevice && (
              <div
                className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full border border-white/80 bg-white shadow-[0_0_20px_rgba(255,255,255,0.5)] transition-transform duration-150 group-hover:scale-110"
                style={{ left: `calc(${Math.min(100, effectivePlayedPct)}% - 7px)` }}
              />
            )}
            {hoverTime && (
              <div
                className={`pointer-events-none absolute -top-10 -translate-x-1/2 rounded-xl px-3 py-1.5 text-xs font-medium shadow-[0_12px_30px_rgba(2,6,23,0.28)] ${getDesktopTone("time") === "dark"
                  ? "bg-slate-950/92 text-white"
                  : "bg-white/88 text-slate-950"
                  } ${hoverTime ? "opacity-100 scale-100" : "opacity-0 scale-95"
                  } transition-all duration-100 ease-in-out`}
                style={{ left: hoverTime?.x }}
              >
                {formatTime(hoverTime.t)}
              </div>
            )}
          </div>

          {/* bottom row */}
          <div
            className={`flex items-center justify-between gap-2 md:gap-4 ${isIOS && "pb-4"
              }`}
          >
            <div className="flex items-center gap-1 md:gap-3">
              {!isTouchDevice && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        ref={(node) => setDesktopControlRef("play", node)}
                        aria-label={
                          isPlaying ? CONFIG.LABELS.PAUSE : CONFIG.LABELS.PLAY
                        }
                        onClick={() => {
                          const p = playerInstance.current;
                          if (!p) return;
                          isPlaying ? p.pause?.() : p.play?.(true);
                        }}
                        className={getDesktopControlButtonClass("play")}
                      >
                        {isPlaying ? (
                          <PauseIcon className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7" />
                        ) : (
                          <PlayIcon className="h-5 w-5 pl-1 sm:h-6 sm:w-6 md:h-7 md:w-7" />
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" sideOffset={15}>
                      <div className={getDesktopTooltipClass("play")}>
                        {isPlaying ? CONFIG.LABELS.PAUSE : CONFIG.LABELS.PLAY}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {!isTouchDevice && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        ref={(node) => setDesktopControlRef("backward", node)}
                        aria-label={CONFIG.LABELS.BACK_X(CONFIG.SKIP_SECONDS)}
                        className={getDesktopControlButtonClass("backward")}
                        onClick={() => {
                          seekBy(-CONFIG.SKIP_SECONDS);
                          scheduleControlsAutohide();
                        }}
                      >
                        <BackwardIcon className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" sideOffset={15}>
                      <div className={getDesktopTooltipClass("backward")}>
                        {CONFIG.TOOLTIPS.BACKWARD}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
              {!isTouchDevice && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        ref={(node) => setDesktopControlRef("forward", node)}
                        aria-label={CONFIG.LABELS.FORWARD_X(
                          CONFIG.SKIP_SECONDS
                        )}
                        className={getDesktopControlButtonClass("forward")}
                        onClick={() => {
                          seekBy(CONFIG.SKIP_SECONDS);
                          scheduleControlsAutohide();
                        }}
                      >
                        <ForwardIcon className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" sideOffset={15}>
                      <div className={getDesktopTooltipClass("forward")}>
                        {CONFIG.TOOLTIPS.FORWARD}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {Array.isArray(chapters) && chapters.length > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        ref={(node) => setDesktopControlRef("chapter", node)}
                        aria-label={CONFIG.LABELS.NEXT_CHAPTER}
                        onClick={() => {
                          const p = playerInstance.current;
                          if (!p) return;
                          const current = p.getPosition?.() || position;
                          const sorted = [...chapters]
                            .filter(
                              (t) =>
                                typeof t === "number" && isFinite(t) && t >= 0
                            )
                            .sort((a, b) => a - b);
                          const EPS = 0.25;
                          const next = sorted.find((t) => t > current + EPS);
                          if (typeof next === "number") {
                            const target = Math.max(
                              0,
                              Math.min(duration || next, next)
                            );
                            p.seek?.(target);
                            scheduleControlsAutohide();
                          }
                        }}
                        className={getDesktopControlButtonClass("chapter")}
                      >
                        <Flag className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" sideOffset={15}>
                      <div className={getDesktopTooltipClass("chapter")}>
                        {CONFIG.TOOLTIPS.NEXT_CHAPTER}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {/* Volume */}
              <div
                ref={(node) => setDesktopControlRef("volume", node)}
                className={getDesktopVolumeGroupClass("volume")}
              >
                <button
                  aria-label={CONFIG.LABELS.MUTE}
                  onClick={() => {
                    const p = playerInstance.current;
                    if (!p) return;
                    p.setMute?.(!isMuted);
                    scheduleControlsAutohide();
                  }}
                  className={getDesktopControlButtonClass("volume")}
                >
                  {isMuted || volume === 0 ? (
                    <VolumeOff className={`h-5 w-5 sm:h-5 sm:w-5 md:h-6 md:w-6 ${getDesktopIconToneClass("volume")}`} />
                  ) : !isMuted && volume > 50 ? (
                    <Volume2 className={`h-5 w-5 sm:h-5 sm:w-5 md:h-6 md:w-6 ${getDesktopIconToneClass("volume")}`} />
                  ) : (
                    <Volume1 className={`h-5 w-5 sm:h-5 sm:w-5 md:h-6 md:w-6 ${getDesktopIconToneClass("volume")}`} />
                  )}
                </button>
                {!isTouchDevice && (
                    <div className="left-12 hidden w-0 items-center pl-0 opacity-0 transition-all duration-300 group-hover:w-28 group-hover:pl-2 group-hover:opacity-100 sm:flex">
                      <Slider
                        className="w-24 md:w-28"
                      max={100}
                      step={1}
                      value={[isMuted ? 0 : volume]}
                      onValueChange={(vals) => {
                        const vRaw = Array.isArray(vals) ? vals[0] : 0;
                        const v = Math.max(
                          0,
                          Math.min(100, Math.round(vRaw || 0))
                        );
                        const p = playerInstance.current;
                        if (!p) return;
                        p.setVolume?.(v);
                        if (v === 0 && !isMuted) p.setMute?.(true);
                        if (v > 0 && isMuted) p.setMute?.(false);
                        setVolumeState(v);
                        scheduleControlsAutohide();
                      }}
                    />
                  </div>
                )}
              </div>

              <button
                ref={(node) => setDesktopControlRef("time", node)}
                type="button"
                onClick={() => setShowRemainingTime((prev) => !prev)}
                className={getDesktopTimePillClass("time")}
                aria-label={showRemainingTime ? "Hiển thị thời gian hiện tại" : "Hiển thị thời gian còn lại"}
                title={showRemainingTime ? "Bấm để hiện thời gian hiện tại" : "Bấm để hiện thời gian còn lại"}
              >
                <span className="tabular-nums">{showRemainingTime ? `-${formatTime(remainingTime)}` : formatTime(position)}</span>
                <span className={getDesktopMutedTextClass("time")}>/</span>
                <span className={`tabular-nums ${getDesktopSecondaryTextClass("time")}`}>{formatTime(duration)}</span>
              </button>
            </div>

            <div className="flex items-center gap-1 md:gap-3">
              {(!isAndroid || (isAndroid && !isFullscreen)) && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        ref={(node) => setDesktopControlRef("screenshot", node)}
                        aria-label="Capture video frame"
                        onClick={handleCaptureFrame}
                        className={getDesktopControlButtonClass("screenshot")}
                      >
                        <Camera className="h-5 w-5 pb-1 sm:h-5 sm:w-5 md:h-6 md:w-6" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" sideOffset={15}>
                      <div className={getDesktopTooltipClass("screenshot")}>
                        {CONFIG.TOOLTIPS.SCREENSHOT}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {pipSupported && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        ref={(node) => setDesktopControlRef("pip", node)}
                        id="pip-button"
                        aria-label={CONFIG.LABELS.PIP}
                        onClick={() => {
                          pipCtrlRef.current?.toggle();
                        }}
                        className={getDesktopControlButtonClass("pip")}
                      >
                        <PictureInPicture2 className="h-5 w-5 sm:h-5 sm:w-5 md:h-6 md:w-6" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" sideOffset={15}>
                      <div className={getDesktopTooltipClass("pip")}>
                        {CONFIG.TOOLTIPS.PIP}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {/* Fullscreen */}
              <button
                ref={(node) => setDesktopControlRef("fullscreen", node)}
                aria-label={CONFIG.LABELS.FULLSCREEN}
                onClick={() => controllerRef.current?.toggle()}
                className={getDesktopControlButtonClass("fullscreen")}
              >
                <div className="transition-opacity duration-300 ease-in-out">
                  {isIOS ? (
                    <Maximize2 className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
                  ) : isFullscreen ? (
                    <Minimize2 className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
                  ) : (
                    <Maximize2 className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
                  )}
                </div>
              </button>

              {showImagePreview && capturedImage && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60">
                  {/* eslint-disable-next-line */}
                  <img
                    src={capturedImage}
                    alt="Captured frame"
                    className="max-w-[80vw] max-h-[80vh] rounded-lg shadow-2xl border-2 border-white"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NJWPlayerComponent;
