"use client";
import { consoleProtection } from "../lib/console-protection";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
import { Slider } from "@/components/ui/slider";
import {
  BackwardIcon,
  ForwardIcon,
  PauseIcon,
  PlayIcon,
} from "./ui/player-icon";
import { Tooltip, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { TooltipContent } from "@radix-ui/react-tooltip";

const JW_PLAYER_VERSION = "8.38.3" as const;
const JW_PLAYER_SCRIPT_SRC =
  `https://ssl.p.jwpcdn.com/player/v/${JW_PLAYER_VERSION}/jwplayer.js` as const;
const JW_PLAYER_KEY = "cLGMn8T20tGvW+0eXPhq4NNmLB57TrscPjd1IyJF84o=" as const;
const JW_ABOUT_TEXT = "Được Tạo Bởi KanaFansub" as const;
const PLAYER_PRIMARY = "html5" as const;
const HLS_TYPE = "hls" as const;

const DEFAULT_VOLUME = 80;
const AUTOPLAY_RETRY_DELAY_MS = 250;
const CONTROLS_REVEAL_Y_FACTOR = 0;
const SKIP_SECONDS = 10;
const BACKWARD_TOOLTIP = "Lùi 10 giây";
const FORWARD_TOOLTIP = "Tiến 10 giây";
const NEXT_CHAPTER_TOOLTIP = "Tới mốc tiếp theo";
const SCREENSHOT_TOOLTIP = "Chụp màn hình";
const CONTROLS_AUTOHIDE_MS = 2500;
const CONTROLS_AUTOHIDE_DESKTOP_MS = 1000;
const DOUBLE_TAP_ZONE_RATIO = 0.5;

const LABEL_PLAY = "Play";
const LABEL_PAUSE = "Pause";
const LABEL_BACK_X_SECONDS = (x: number) => `Back ${x} seconds`;
const LABEL_FORWARD_X_SECONDS = (x: number) => `Forward ${x} seconds`;
const LABEL_MUTE = "Mute";
const LABEL_FULLSCREEN = "Fullscreen";
const LABEL_PIP = "Picture-in-Picture";
const QUALITY_FALLBACK_PREFIX = "Q";
const LABEL_NEXT_CHAPTER = "Next chapter";
const ABOUT_MESSAGE_TIMEOUT_MS = 500; 

const ERR_SCRIPT_LOAD = "Failed to load JWPlayer script";
const ERR_SETUP = "Player setup error";
const ERR_GENERAL = "Player error";
const ERR_INIT = "Failed to initialize player";

interface JWPlayerProps {
  videoId: string;
  server: "hls" | "helvid" | "hydax";
  autoPlay?: boolean;
  muted?: boolean;
  controls?: boolean;
  onLoad?: () => void;
  onError?: (error: string) => void;
  className?: string;
  chapters?: number[]; // seconds from start
}
const NJWPlayerComponent = ({
  videoId,
  server,
  autoPlay = false,
  muted = false,
  controls = true,
  onLoad,
  onError,
  className = "",
  chapters = [],
}: JWPlayerProps) => {
  const playerRef = useRef<HTMLDivElement | null>(null);
  const playerInstance = useRef<any>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const originalOverflowRef = useRef<string | null>(null);
  const prevFileUrlRef = useRef<string | null>(null);
  const savedPositionRef = useRef<number>(0);
  const wasPlayingRef = useRef<boolean>(false);
  const callbacksRef = useRef<{
    onLoad?: () => void;
    onError?: (e: string) => void;
  }>({});
  const scriptLoadedRef = useRef<boolean>(false);
  const scriptLoadingRef = useRef<boolean>(false);
  const isAndroid =
    typeof navigator !== "undefined" && /android/i.test(navigator.userAgent);
  const isIOS =
    typeof navigator !== "undefined" &&
    (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.userAgent.includes("Mac") && "ontouchend" in document));

  const protectVideoElement = useCallback((video: HTMLVideoElement) => {
    if (!video || !(video instanceof HTMLVideoElement) || !video.nodeType)
      return;
    if (isAndroid) return;
    if ((video as any)._protectedStreamSetup) return;
    (video as any)._protectedStreamSetup = true;
    let cleanupObserver: MutationObserver | null = null;
    try {
      // Console protection: activate when player is ready
      if (typeof window !== "undefined") {
        consoleProtection.start({
          showWarning: true,
          allowPatterns: [
            /^JWPlayer ready$/,
            /^Initializing JWPlayer/,
            /^Video playback completed$/,
            /^First frame loaded$/,
            /^Quality levels available$/,
            /^Playback progress:/,
            /^Player buffering/,
            /^Bắt đầu phát video$/,
          ],
        });
        consoleProtection.detectConsoleAccess();
      }
      // Delay property overrides until video is playing
      const applyProtection = () => {
        // Override getAttribute for 'src'
        const originalGetAttribute = video.getAttribute;
        video.getAttribute = function (name: string) {
          if (name === "src") return "blob:protected-stream";
          return originalGetAttribute.call(this, name);
        };
        // Override setAttribute for 'src'
        const originalSetAttribute = video.setAttribute;
        video.setAttribute = function (name: string, value: string) {
          if (name === "src" && value.includes("blob:")) {
            return originalSetAttribute.call(this, name, value);
          }
          return originalSetAttribute.call(this, name, value);
        };
        // Only override properties once
        const srcDescriptor = Object.getOwnPropertyDescriptor(video, "src");
        if (!srcDescriptor || srcDescriptor.configurable !== false) {
          Object.defineProperty(video, "src", {
            get: () => "blob:protected-stream",
            set: () => {},
            configurable: true,
          });
        }
        const currentSrcDescriptor = Object.getOwnPropertyDescriptor(
          video,
          "currentSrc"
        );
        if (
          !currentSrcDescriptor ||
          currentSrcDescriptor.configurable !== false
        ) {
          Object.defineProperty(video, "currentSrc", {
            get: () => "blob:protected-stream",
            configurable: true,
          });
        }
        const outerHTMLDescriptor = Object.getOwnPropertyDescriptor(
          video,
          "outerHTML"
        );
        if (
          !outerHTMLDescriptor ||
          outerHTMLDescriptor.configurable !== false
        ) {
          Object.defineProperty(video, "outerHTML", {
            get: function () {
              const originalOuterHTML = Object.getOwnPropertyDescriptor(
                HTMLVideoElement.prototype,
                "outerHTML"
              )?.get;
              if (originalOuterHTML) {
                try {
                  const html = originalOuterHTML.call(this);
                  return typeof html === "string"
                    ? html.replace(/blob:[^"\s]+/g, "blob:protected-stream")
                    : html;
                } catch (e) {
                  return "<video>Protected Video Element</video>";
                }
              }
              return "<video>Protected Video Element</video>";
            },
            configurable: true,
          });
        }
      };
      // Listen for play event to apply protection
      video.addEventListener("play", applyProtection, { once: true });
      // Setup cleanup observer for video removal
      cleanupObserver = new MutationObserver((mutations) => {
        try {
          mutations.forEach((mutation) => {
            mutation.removedNodes.forEach((node) => {
              if (node && node.nodeType === Node.ELEMENT_NODE) {
                if (node === video || (node as Element).contains(video)) {
                  if (cleanupObserver) cleanupObserver.disconnect();
                }
              }
            });
          });
        } catch (observerError) {
          if (cleanupObserver) cleanupObserver.disconnect();
        }
      });
      cleanupObserver.observe(document.body, {
        childList: true,
        subtree: true,
      });
    } catch (e) {
      // Video protection error
    }
  }, []);

  const isHls = server === "hls";
  const fileUrl = useMemo(() => {
    if (!isHls) return "";
    const rel = `/api/hls?file=${encodeURIComponent(videoId)}`;
    if (typeof window !== "undefined")
      return new URL(rel, window.location.origin).toString();
    return rel;
  }, [isHls, videoId]);

  // UI state
  const [isReady, setIsReady] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(!!muted);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [buffer, setBuffer] = useState(0);
  const [volume, setVolume] = useState(80);
  const [levels, setLevels] = useState<{ label: string; index: number }[]>([]);
  const [currentLevel, setCurrentLevel] = useState<number | null>(null);
  const [hoverTime, setHoverTime] = useState<{ x: number; t: number } | null>(
    null
  );
  const [libReady, setLibReady] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(false);
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
  const [seekOverlay, setSeekOverlay] = useState<{
    type: "back" | "forward";
    seconds: number;
  } | null>(null);
  const seekOverlayTimerRef = useRef<number | null>(null);
  const initAutoPlayRef = useRef<boolean>(autoPlay);
  const initMutedRef = useRef<boolean>(muted);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const controlsHideTimerRef = useRef<number | null>(null);
  const aboutHideTimerRef = useRef<number | null>(null);
  const suppressClickRef = useRef<boolean>(false);
  const forcedAutoplayMuteRef = useRef<boolean>(false);

  useEffect(() => {
    callbacksRef.current = { onLoad, onError };
  }, [onLoad, onError]);

  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [showImagePreview, setShowImagePreview] = useState(false);

  const handleCaptureFrame = useCallback(() => {
    const videoEl = containerRef.current?.querySelector("video");
    if (!videoEl) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoEl.videoWidth;
    canvas.height = videoEl.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);
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

  // Load JW script once
  useEffect(() => {
    try {
      const hasTouch =
        typeof window !== "undefined" &&
        ("ontouchstart" in window || navigator.maxTouchPoints > 0);
      setIsTouchDevice(!!hasTouch);
    } catch {}

    if (!isHls) return;
    if (scriptLoadedRef.current || scriptLoadingRef.current) return;
    const w = window as any;
    if (w.jwplayer) {
      scriptLoadedRef.current = true;
      setLibReady(true);
      return;
    }
    scriptLoadingRef.current = true;
    const script = document.createElement("script");
    script.src = JW_PLAYER_SCRIPT_SRC;
    script.async = true;
    script.onload = () => {
      scriptLoadedRef.current = true;
      scriptLoadingRef.current = false;
      setLibReady(true);
    };
    script.onerror = () => {
      scriptLoadingRef.current = false;
      callbacksRef.current.onError?.(ERR_SCRIPT_LOAD);
    };
    document.head.appendChild(script);
  }, [isHls]);

  useEffect(() => {
    if (!isHls) return;
    if (!libReady) return;
    const w = window as any;
    if (!w.jwplayer || !playerRef.current) return;

    const isFullscreen = document.fullscreenElement !== null;
    if (isFullscreen && playerInstance.current) {
      return;
    }
    if (playerInstance.current && playerInstance.current._isFullscreen) {
      return;
    }
    const now = Date.now();
    if (
      playerInstance.current &&
      playerInstance.current._lastFullscreenExit &&
      now - playerInstance.current._lastFullscreenExit < 2000
    ) {
      return;
    }

    if (playerInstance.current && prevFileUrlRef.current === fileUrl) {
      return;
    }

    if (playerInstance.current) {
      try {
        const p = playerInstance.current;
        savedPositionRef.current = p.getPosition?.() || 0;
        const state = p.getState?.();
        wasPlayingRef.current = state === "playing" || state === "buffering";
        p.remove?.();
      } catch {}
    }

    try {
      const sources = [{ file: fileUrl, type: HLS_TYPE, default: true }];
      playerInstance.current = w.jwplayer(playerRef.current).setup({
        width: "100%",
        height: "100%",
        primary: PLAYER_PRIMARY,
        controls: false, // hide default; we render custom UI
        autostart: autoPlay,
        mute: initMutedRef.current,
        key: JW_PLAYER_KEY,
        hlsjsdefault: true,
        enableNativeHls: false,
        safarihlsjs: false,
        stretching: "uniform",
        playlist: [{ sources }],
        abouttext: JW_ABOUT_TEXT,
        playsinline: true,
        fullscreenOrientationLock: "landscape",
        pipIcon: true,
      });

      const p = playerInstance.current;

      // Store fullscreen state for reload prevention
      p._isFullscreen = false;
      p._lastFullscreenExit = 0;

      p.on("ready", () => {
        setIsReady(true);
        setIsMuted(!!p.getMute?.());
        setPipSupported(p.isPipSupported?.() === true);
        // If Android, set volume to max
        if (isAndroid) {
          p.setVolume?.(100);
          setVolume(100);
        } else {
          const vol = p.getVolume?.();
          setVolume(typeof vol === "number" ? vol : DEFAULT_VOLUME);
        }
        const d = p.getDuration?.() ?? 0;
        setDuration(isFinite(d) ? d : 0);

        const qls = p.getQualityLevels?.() || [];
        setLevels(
          qls.map((q: any, idx: number) => ({
            label: q.label || `${QUALITY_FALLBACK_PREFIX}${idx + 1}`,
            index: idx,
          }))
        );
        const curQ = p.getCurrentQuality?.();
        setCurrentLevel(typeof curQ === "number" ? curQ : null);

        if (savedPositionRef.current > 0) {
          try {
            p.seek?.(savedPositionRef.current);
            if (wasPlayingRef.current) p.play?.(true);
          } catch {}
        } else if (initAutoPlayRef.current) {
          try {
            p.setMute?.(false);
            forcedAutoplayMuteRef.current = !initMutedRef.current;
            p.play?.(true);
          } catch {}
          setTimeout(() => {
            try {
              const st = p.getState?.();
              if (st !== "playing" && st !== "buffering") {
                p.play?.(true);
              }
            } catch {}
          }, AUTOPLAY_RETRY_DELAY_MS);
        }
        savedPositionRef.current = 0;
        wasPlayingRef.current = false;

        setTimeout(() => {
          const videoEl = containerRef.current?.querySelector("video");
          if (videoEl) {
            videoEl.setAttribute("playsinline", "");
            videoEl.setAttribute("webkit-playsinline", "");
            protectVideoElement(videoEl);
          }
        }, 500);
        callbacksRef.current.onLoad?.();
      });
      p.on("play", () => {
        setIsPlaying(true);
        if (isAndroid) {
          const videoEl = containerRef.current?.querySelector("video");
          if (videoEl) {
            videoEl.style.display = "";
            videoEl.style.visibility = "visible";
            videoEl.style.opacity = "1";
          }
        }
      });
      p.on("pause", () => setIsPlaying(false));
      p.on("time", (e: any) => {
        setPosition(e?.position || 0);
        setDuration((prev) =>
          typeof e?.duration === "number" ? e.duration : prev
        );
      });
      p.on("resize", (e: any) => {
        console.log("Player resized:", e.width, "x", e.height);
        setIsFullscreen(document.fullscreenElement !== null);
      });
      p.on("buffer", (e: any) => {
        setIsBuffering(true);
        if (e && typeof e.bufferPercent === "number") {
          const dur = p.getDuration?.() || 0;
          setBuffer((e.bufferPercent / 100) * dur);
        }
      });
      p.on("play", () => {
        setIsPlaying(true);
        setIsBuffering(false);
        if (isAndroid) {
          const videoEl = containerRef.current?.querySelector("video");
          if (videoEl) {
            videoEl.style.display = "";
            videoEl.style.visibility = "visible";
            videoEl.style.opacity = "1";
          }
        }
      });
      p.on("volume", (e: any) =>
        setVolume(typeof e?.volume === "number" ? e.volume : DEFAULT_VOLUME)
      );
      p.on("mute", (e: any) => setIsMuted(!!e?.mute));
      p.on("fullscreen", (e: any) => {
        setIsFullscreen(!!e.fullscreen);
        if (e.fullscreen) {
          p._isFullscreen = true;
        } else {
          p._lastFullscreenExit = Date.now();
          setTimeout(() => {
            if (playerInstance.current) {
              playerInstance.current._isFullscreen = false;
              if (isAndroid) {
                const videoEl = containerRef.current?.querySelector("video");
                if (videoEl) {
                  videoEl.style.display = "";
                  videoEl.style.visibility = "visible";
                  videoEl.style.opacity = "1";
                  // Force reflow
                  videoEl.src = videoEl.src;
                }
              }
            }
          }, 1000);
        }
      });
      p.on("levels", () => {
        const q = p.getQualityLevels?.() || [];
        setLevels(
          q.map((lv: any, idx: number) => ({
            label: lv.label || `${QUALITY_FALLBACK_PREFIX}${idx + 1}`,
            index: idx,
          }))
        );
      });
      p.on("levelsChanged", () => {
        const cq = p.getCurrentQuality?.();
        setCurrentLevel(typeof cq === "number" ? cq : null);
      });
      p.on("pip", ({ pip }: { pip: boolean }) => setIsInPip(pip));

      p.on("setupError", (e: any) =>
        callbacksRef.current.onError?.(e?.message || ERR_SETUP)
      );
      p.on("error", (e: any) =>
        callbacksRef.current.onError?.(e?.message || ERR_GENERAL)
      );

      prevFileUrlRef.current = fileUrl;
    } catch (e: any) {
      callbacksRef.current.onError?.(e?.message || ERR_INIT);
    }

    return () => {};
  }, [isHls, fileUrl, libReady, isFullscreen]);

  useEffect(() => {
    if (!playerInstance.current) return;
    try {
      playerInstance.current.setMute?.(!!muted);
      if (autoPlay) {
        const state = playerInstance.current.getState?.();
        if (state !== "playing") playerInstance.current.play?.(true);
      }
    } catch {}
  }, [autoPlay, muted]);

  useEffect(() => {
    return () => {
      try {
        if (playerInstance.current) {
          playerInstance.current.remove?.();
        }
      } catch {}
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
    };
  }, []);

  const scheduleControlsAutohide = useCallback(() => {
    if (controlsHideTimerRef.current) {
      window.clearTimeout(controlsHideTimerRef.current);
      controlsHideTimerRef.current = null;
    }
    const timeoutMs = isTouchDevice
      ? CONTROLS_AUTOHIDE_MS
      : CONTROLS_AUTOHIDE_DESKTOP_MS;
    controlsHideTimerRef.current = window.setTimeout(() => {
      if (isTouchDevice) {
        if (!isScrubbing && !isHovering) {
          setControlsVisible(false);
        }
      } else {
        // Desktop
        if (!isScrubbing && !isHoveringControls) {
          setControlsVisible(false);
          setCursorHidden(true);
        }
      }
      controlsHideTimerRef.current = null;
    }, timeoutMs);
  }, [isTouchDevice, isScrubbing, isHovering, isHoveringControls]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!isScrubbing || !progressBarRef.current) return;
      const rect = progressBarRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
      const pct = rect.width ? x / rect.width : 0;
      setScrubPct(pct * 100);
      const t = pct * (duration || 0);
      setHoverTime({ x, t });
      // Real-time seek while dragging
      const p = playerInstance.current;
      if (p && duration) p.seek?.(t);
    };
    const onUp = () => {
      if (!isScrubbing || !progressBarRef.current) return;
      setIsScrubbing(false);
    };
    if (isScrubbing) {
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
      return () => {
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };
    }
  }, [isScrubbing, duration, scrubPct]);

  const toggleFullscreenDom = useCallback(() => {
    const el = containerRef.current as any;
    if (!el) return;
    const videoEl = el.querySelector && el.querySelector("video");

    // iOS: use native video fullscreen (legacy and modern)
    if (
      isIOS &&
      videoEl &&
      typeof videoEl.webkitEnterFullscreen === "function"
    ) {
      videoEl.webkitEnterFullscreen();
      const onIOSFSChange = () => {
        setIsFullscreen(false);
        videoEl.removeEventListener("webkitendfullscreen", onIOSFSChange);
      };
      videoEl.addEventListener("webkitendfullscreen", onIOSFSChange);
      return;
    }

    // Standard Fullscreen for non-iOS
    if (document.fullscreenElement && !isFullscreen) {
      try {
        document.exitFullscreen();
      } catch (e) {
        // ignore
      }
      return;
    }

    if (!document.fullscreenElement) {
      if (!isTouchDevice) {
        originalOverflowRef.current =
          document.documentElement.style.overflow || "";
        document.documentElement.style.overflow = "hidden";
      }
      try {
        const req = el.requestFullscreen?.();
        if (req && typeof (req as any).catch === "function") {
          (req as Promise<void>).catch(() => {
            const p = playerInstance.current;
            p?.setFullscreen?.(true);
            setIsFullscreen(true);
          });
        } else if (!req) {
          const p = playerInstance.current;
          p?.setFullscreen?.(true);
          setIsFullscreen(true);
        }
      } catch {
        const p = playerInstance.current;
        p?.setFullscreen?.(true);
        setIsFullscreen(true);
      }
      if (isTouchDevice && window.screen?.orientation) {
        try {
          (window.screen.orientation as any).lock?.("landscape");
        } catch {}
      }
    } else {
      document.documentElement.style.overflow =
        originalOverflowRef.current !== null ? originalOverflowRef.current : "";
      if (isTouchDevice && window.screen?.orientation) {
        try {
          (window.screen.orientation as any).unlock?.();
        } catch {}
      }
      try {
        const ex = document.exitFullscreen?.();
        if (ex && typeof (ex as any).catch === "function") {
          (ex as Promise<void>).catch(() => {
            const p = playerInstance.current;
            p?.setFullscreen?.(false);
            setIsFullscreen(false);
          });
        } else if (!ex) {
          const p = playerInstance.current;
          p?.setFullscreen?.(false);
          setIsFullscreen(false);
        }
      } catch {
        const p = playerInstance.current;
        p?.setFullscreen?.(false);
        setIsFullscreen(false);
      }
    }
  }, [isTouchDevice, isFullscreen, isIOS]);

  // Keyboard shortcuts scoped to hover/focus on the player
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isHovering) return;
      const p = playerInstance.current;
      if (!p) return;
      const unforceMuteIfNeeded = () => {
        if (forcedAutoplayMuteRef.current && !muted) {
          try {
            p.setMute?.(false);
          } catch {}
          forcedAutoplayMuteRef.current = false;
        }
      };
      // Avoid when typing in inputs
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      )
        return;

      if (e.code === "Space") {
        e.preventDefault();
        unforceMuteIfNeeded();
        const state = p.getState?.();
        if (state === "playing") p.pause?.();
        else p.play?.(true);
      } else if (e.code === "ArrowLeft") {
        e.preventDefault();
        const pos = p.getPosition?.() || position;
        p.seek?.(Math.max(0, Math.min(duration, pos - SKIP_SECONDS)));
        setSeekOverlay({ type: "back", seconds: SKIP_SECONDS });
        if (seekOverlayTimerRef.current)
          window.clearTimeout(seekOverlayTimerRef.current);
        seekOverlayTimerRef.current = window.setTimeout(() => {
          setSeekOverlay(null);
          seekOverlayTimerRef.current = null;
        }, 800);
      } else if (e.code === "ArrowRight") {
        e.preventDefault();
        const pos = p.getPosition?.() || position;
        p.seek?.(Math.max(0, Math.min(duration, pos + SKIP_SECONDS)));
        setSeekOverlay({ type: "forward", seconds: SKIP_SECONDS });
        if (seekOverlayTimerRef.current)
          window.clearTimeout(seekOverlayTimerRef.current);
        seekOverlayTimerRef.current = window.setTimeout(() => {
          setSeekOverlay(null);
          seekOverlayTimerRef.current = null;
        }, 800);
      } else if (e.key.toLowerCase() === "m") {
        e.preventDefault();
        p.setMute?.(!p.getMute?.());
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isHovering, duration, position, muted]);

  if (!isHls) {
    const iframeUrl =
      server === "helvid"
        ? `https://helvid.net/play/index/${videoId}`
        : server === "hydax"
        ? `https://player.hidatv.live/player/?id=${videoId}`
        : "";
  }

  const playedPct = duration ? (position / duration) * 100 : 0;
  const bufferedPct = duration ? (buffer / duration) * 100 : 0;
  const effectivePlayedPct =
    isScrubbing && scrubPct !== null ? scrubPct : playedPct;

  return (
    <div
      className={`relative rounded-xl overflow-hidden shadow-2xl ${className}`}
    >
      {/* Custom loading icon overlay */}
      {(!isReady || isBuffering) && (
        <div className="absolute inset-0 z-[999] flex items-center justify-center bg-transparent pointer-events-none">
          <LoaderPinwheel className="animate-spin h-8 w-8 md:h-16 md:w-16 text-pink-400 drop-shadow-lg" />
        </div>
      )}
      <div
        ref={containerRef}
        className={
          isIOS
            ? "relative w-full aspect-video bg-black"
            : isFullscreen
            ? "fixed left-0 top-0 w-[100vw] h-[100vh] bg-black z-50 box-border flex items-center justify-center"
            : "relative w-full aspect-video bg-black"
        }
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
          setIsHovering(true);
        }}
        onTouchMove={(e) => {
          if (!containerRef.current) return;
          const touch = e.touches && e.touches[0];
          if (!touch) return;
          const rect = containerRef.current.getBoundingClientRect();
          const y = touch.clientY - rect.top;
          const bottomZone = y >= rect.height * CONTROLS_REVEAL_Y_FACTOR;
        }}
        onTouchEnd={(e) => {
          setIsHovering(false);
        }}
      >
        <div
          id="kana-player"
          ref={playerRef}
          className={
            isFullscreen
              ? "w-[100vw] h-[100vh] z-0"
              : "relative w-full aspect-video z-0"
          }
        />

        <div
          className={`absolute inset-0 z-10 ${
            !isTouchDevice && cursorHidden ? "cursor-none" : "cursor-pointer"
          }`}
          onClick={() => {
            const p = playerInstance.current;
            if (!p) return;
            // Sửa lỗi: suppress single tap UI show if double tap just happened
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
              } catch {}
              forcedAutoplayMuteRef.current = false;
            }
            if (isPlaying) p.pause?.();
            else p.play?.(true);
            scheduleControlsAutohide();
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
            // Detect double click/tap zone
            if (!isTouchDevice) return;
            // Đánh dấu suppressClickRef để suppress single tap
            suppressClickRef.current = true;
            setTimeout(() => {
              suppressClickRef.current = false;
            }, 350);
            const rect = containerRef.current.getBoundingClientRect();
            const tapX = e.clientX - rect.left;
            const width = rect.width;
            const leftZoneEnd = width * DOUBLE_TAP_ZONE_RATIO;
            const rightZoneStart = width * (1 - DOUBLE_TAP_ZONE_RATIO);
            if (tapX < leftZoneEnd) {
              // Double tap/click on left side: seek backward
              const newPos = Math.max(
                0,
                Math.min(
                  duration,
                  (p.getPosition?.() || position) - SKIP_SECONDS
                )
              );
              p.seek?.(newPos);
              setSeekOverlay({ type: "back", seconds: SKIP_SECONDS });
            } else if (tapX > rightZoneStart) {
              // Double tap/click on right side: seek forward
              const newPos = Math.max(
                0,
                Math.min(
                  duration,
                  (p.getPosition?.() || position) + SKIP_SECONDS
                )
              );
              p.seek?.(newPos);
              setSeekOverlay({ type: "forward", seconds: SKIP_SECONDS });
            }
            if (seekOverlayTimerRef.current)
              window.clearTimeout(seekOverlayTimerRef.current);
            seekOverlayTimerRef.current = window.setTimeout(() => {
              setSeekOverlay(null);
              seekOverlayTimerRef.current = null;
            }, 800);
          }}
          onTouchEnd={() => {
            setIsHovering(false);
          }}
        />

        {/* Overlay thông báo tua khi double tap hoặc dùng phím */}
        {seekOverlay && (
          <>
            {seekOverlay.type === "back" && (
              <div className="absolute left-0 top-0 bottom-0 z-[999] flex items-center pl-4 md:pl-8 pointer-events-none">
                <div className="flex items-center gap-2 bg-gray-700/80 backdrop-blur-sm text-white text-base md:text-lg font-semibold rounded-lg px-3 py-2 shadow-xl animate-fade">
                  <Rewind className="h-6 w-6 md:h-8 md:w-8 text-pink-400" />
                  <span>Lùi {seekOverlay.seconds} giây</span>
                </div>
              </div>
            )}
            {seekOverlay.type === "forward" && (
              <div className="absolute right-0 top-0 bottom-0 z-[999] flex items-center justify-end pr-4 md:pr-8 pointer-events-none">
                <div className="flex items-center gap-2 bg-gray-700/80 backdrop-blur-sm text-white text-base md:text-lg font-semibold rounded-lg px-3 py-2 shadow-xl animate-fade">
                  <span>Tiến {seekOverlay.seconds} giây</span>
                  <FastForward className="h-6 w-6 md:h-8 md:w-8 text-pink-400" />
                </div>
              </div>
            )}
          </>
        )}
        {/* Custom right-click about message (desktop) */}
        {!isTouchDevice && showAboutMsg && aboutPos && (
          <div
            className="absolute z-40 rounded-md bg-gray-900/95 text-white text-xs shadow-xl border border-gray-700/60 px-3 py-2 whitespace-nowrap"
            style={{
              top: aboutPos.y,
              left: aboutPos.x,
              transform: "translate(-50%, -50%)",
            }}
            onClick={(e) => {
              e.stopPropagation();
              window.open("https://www.youtube.com/watch?v=xLE9RI372LY", "_blank");
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
              }, ABOUT_MESSAGE_TIMEOUT_MS);
            }}
          >
            <div className="font-semibold mb-0.5 cursor-pointer select-none whitespace-nowrap">
              {JW_ABOUT_TEXT}
            </div>
          </div>
        )}

        {/* Mobile-centered controls (play/pause, back/forward) */}
        {isTouchDevice && (
          <div
            className={`absolute inset-0 z-30 flex items-center justify-center transition-opacity duration-200 ${
              controlsVisible ? "opacity-100" : "opacity-0"
            } pointer-events-none`}
          >
            <div className="pointer-events-auto flex items-center gap-4 sm:gap-6">
              {/* Backward 10s */}
              <button
                aria-label={LABEL_BACK_X_SECONDS(SKIP_SECONDS)}
                className="flex items-center justify-center p-1 rounded-full bg-white/10 transition-colors duration-200 drop-shadow-lg"
                onClick={(e) => {
                  e.stopPropagation();
                  const p = playerInstance.current;
                  if (!p) return;
                  const newPos = Math.max(
                    0,
                    Math.min(
                      duration,
                      (p.getPosition?.() || position) - SKIP_SECONDS
                    )
                  );
                  p.seek?.(newPos);
                  scheduleControlsAutohide();
                }}
              >
                <BackwardIcon className="h-7 w-7 text-white" />
              </button>

              {/* Play/Pause */}
              <button
                aria-label={isPlaying ? LABEL_PAUSE : LABEL_PLAY}
                className="flex items-center justify-center p-1 rounded-full bg-white/10 transition-colors duration-200 drop-shadow-lg"
                onClick={(e) => {
                  e.stopPropagation();
                  const p = playerInstance.current;
                  if (!p) return;
                  if (forcedAutoplayMuteRef.current && !muted) {
                    try {
                      p.setMute?.(false);
                    } catch {}
                    forcedAutoplayMuteRef.current = false;
                  }
                  if (isPlaying) p.pause?.();
                  else p.play?.(true);
                  scheduleControlsAutohide();
                }}
              >
                {isPlaying ? (
                  <PauseIcon className="h-8 w-8 text-white" />
                ) : (
                  <PlayIcon className="h-8 w-8 pl-1 text-white" />
                )}
              </button>

              {/* Forward 10s */}
              <button
                aria-label={LABEL_FORWARD_X_SECONDS(SKIP_SECONDS)}
                className="flex items-center justify-center p-1 rounded-full bg-white/10 transition-colors duration-200 drop-shadow-lg"
                onClick={(e) => {
                  e.stopPropagation();
                  const p = playerInstance.current;
                  if (!p) return;
                  const newPos = Math.max(
                    0,
                    Math.min(
                      duration,
                      (p.getPosition?.() || position) + SKIP_SECONDS
                    )
                  );
                  p.seek?.(newPos);
                  scheduleControlsAutohide();
                }}
              >
                <ForwardIcon className="h-7 w-7 text-white" />
              </button>
            </div>
          </div>
        )}

        <div
          className={`${
            isFullscreen ? "fixed" : "absolute"
          } inset-x-0 bottom-0 z-20 flex flex-col gap-2 text-white transition-opacity duration-300 ${
            controlsVisible ? "opacity-100" : "opacity-0"
          } bg-gradient-to-t from-black/40 to-transparent px-3 pb-[calc(0.2rem+env(safe-area-inset-bottom))]`}
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
          <div
            className="relative cursor-pointer group"
            ref={progressBarRef}
            style={{ height: isTouchDevice ? 10 : 5 }}
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
            onClick={() => {
              if (!progressBarRef.current) return;
              const rect = progressBarRef.current.getBoundingClientRect();
              const pct =
                hoverTime && rect.width ? hoverTime.x / rect.width : 0;
              if (!playerInstance.current || !duration) return;
              const sec = Math.max(0, Math.min(duration, pct * duration));
              playerInstance.current.seek?.(sec);
              // Auto-hide time indicator after click
              setTimeout(() => setHoverTime(null), 800);
            }}
            onTouchStart={(e) => {
              if (!progressBarRef.current) return;
              const touch = e.touches && e.touches[0];
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
              const touch = e.touches && e.touches[0];
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
              // Real-time seek while dragging
              const p = playerInstance.current;
              if (p && duration) p.seek?.(t);
              e.preventDefault();
              e.stopPropagation();
            }}
            onTouchEnd={(e) => {
              if (!progressBarRef.current) return;
              const rect = progressBarRef.current.getBoundingClientRect();
              const pct = typeof scrubPct === "number" ? scrubPct / 100 : 0;
              const sec = Math.max(0, Math.min(duration, pct * duration));
              const p = playerInstance.current;
              if (p && duration) p.seek?.(sec);
              setIsScrubbing(false);
              scheduleControlsAutohide();
              // Auto-hide time indicator after tap
              setTimeout(() => setHoverTime(null), 1200);
              e.preventDefault();
              e.stopPropagation();
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
              // No auto-hide timer for about message
            }}
          >
            <div
              className="absolute inset-0 bg-gray-600/30 rounded-full transition-all duration-200 group-hover:scale-y-150 origin-center"
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
            />
            <div
              className="absolute inset-y-0 left-0 bg-gray-400/40 rounded-full transition-all duration-200"
              style={{ width: `${Math.min(100, bufferedPct)}%` }}
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
            />
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-red-500 to-pink-500 rounded-full transition-all duration-200 group-hover:scale-y-150 origin-center"
              style={{ width: `${Math.min(100, effectivePlayedPct)}%` }}
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
            />
            {hoverTime && (
              <div
                className={`absolute -top-8 -translate-x-1/2 bg-gray-900/90 text-white text-xs font-medium rounded-lg px-3 py-1.5 shadow-lg pointer-events-none
                ${hoverTime ? "opacity-100 scale-100" : "opacity-0 scale-95"}
                transition-all duration-100 ease-in-out`}
                style={{ left: hoverTime?.x }}
              >
                {hoverTime && formatTime(hoverTime.t)}
              </div>
            )}
          </div>

          {/* Bottom control bar */}
          <div
            className="flex items-center justify-between pb-[env(safe-area-inset-bottom)] gap-2 md:gap-4"
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
            <div className="flex items-center gap-1 md:gap-3">
              {!isTouchDevice && (
                <button
                  aria-label={isPlaying ? LABEL_PAUSE : LABEL_PLAY}
                  onClick={() => {
                    const p = playerInstance.current;
                    if (!p) return;
                    if (isPlaying) p.pause?.();
                    else p.play?.(true);
                  }}
                  className="p-2 rounded-full hover:bg-white/15 transition-colors duration-200"
                >
                  {isPlaying ? (
                    <PauseIcon className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7" />
                  ) : (
                    <PlayIcon className="h-5 w-5 pl-1 sm:h-6 sm:w-6 md:h-7 md:w-7" />
                  )}
                </button>
              )}
              {!isTouchDevice && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        aria-label={LABEL_BACK_X_SECONDS(SKIP_SECONDS)}
                        className="p-2 rounded-full hover:bg-white/15 transition-colors duration-200"
                        onClick={() => {
                          const p = playerInstance.current;
                          if (!p) return;
                          const newPos = Math.max(
                            0,
                            Math.min(
                              duration,
                              (p.getPosition?.() || position) - SKIP_SECONDS
                            )
                          );
                          p.seek?.(newPos);
                          scheduleControlsAutohide();
                        }}
                      >
                        <BackwardIcon className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" sideOffset={15}>
                      <div className="bg-gray-900 text-white text-xs font-medium rounded-lg px-3 py-1.5 shadow-lg">
                        {BACKWARD_TOOLTIP}
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
                        aria-label={LABEL_FORWARD_X_SECONDS(SKIP_SECONDS)}
                        className="p-2 rounded-full hover:bg-white/15  transition-colors duration-200"
                        onClick={() => {
                          const p = playerInstance.current;
                          if (!p) return;
                          const newPos = Math.max(
                            0,
                            Math.min(
                              duration,
                              (p.getPosition?.() || position) + SKIP_SECONDS
                            )
                          );
                          p.seek?.(newPos);
                          scheduleControlsAutohide();
                        }}
                      >
                        <ForwardIcon className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" sideOffset={15}>
                      <div className="bg-gray-900 text-white text-xs font-medium rounded-lg px-3 py-1.5 shadow-lg">
                        {FORWARD_TOOLTIP}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {/* Next chapter button (if chapters available) */}
              {Array.isArray(chapters) && chapters.length > 0 && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        aria-label={LABEL_NEXT_CHAPTER}
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
                        className="p-2 rounded-full hover:bg-white/15  transition-colors duration-200"
                      >
                        <Flag className="h-5 w-5 sm:h-6 sm:w-6 md:h-7 md:w-7" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" sideOffset={15}>
                      <div className="bg-gray-900 text-white text-xs font-medium rounded-lg px-3 py-1.5 shadow-lg">
                        {NEXT_CHAPTER_TOOLTIP}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {/* Volume control (desktop: show slider on hover) */}
              <div className="group relative flex items-center">
                <button
                  aria-label={LABEL_MUTE}
                  onClick={() => {
                    const p = playerInstance.current;
                    if (!p) return;
                    p.setMute?.(!isMuted);
                    scheduleControlsAutohide();
                  }}
                  className="p-2 rounded-full hover:bg-white/15 transition-colors duration-200"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeOff className="h-5 w-5 sm:h-5 sm:w-5 md:h-6 md:w-6 text-white" />
                  ) : !isMuted && volume > 50 ? (
                    <Volume2 className="h-5 w-5 sm:h-5 sm:w-5 md:h-6 md:w-6 text-white" />
                  ) : (
                    <Volume1 className="h-5 w-5 sm:h-5 sm:w-5 md:h-6 md:w-6 text-white" />
                  )}
                </button>
                {/* Only show slider on desktop (not touch devices) */}
                {!isTouchDevice && (
                  <div className="pl-2 left-12 w-0 group-hover:w-28 opacity-0 group-hover:opacity-100 transition-all duration-300 items-center hidden sm:flex">
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
                        setVolume(v);
                        scheduleControlsAutohide();
                      }}
                    />
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1 md:gap-2 text-xs sm:text-sm font-medium text-white/90">
                <span>{formatTime(position)}</span>
                <span className="text-white/50">/</span>
                <span className="text-white/70">{formatTime(duration)}</span>
              </div>
            </div>

            <div className="flex items-center gap-1 md:gap-3">
              {/* Picture in Picture */}
              {pipSupported && (
                <button
                  aria-label={LABEL_PIP}
                  onClick={() => {
                    const p = playerInstance.current;
                    if (!p) return;
                    p.pip?.();
                    scheduleControlsAutohide();
                  }}
                  className="p-2 rounded-full hover:bg-white/15 transition-colors duration-200"
                >
                  <PictureInPicture2 className="h-5 w-5 sm:h-5 sm:w-5 md:h-6 md:w-6" />
                </button>
              )}

              {(!isAndroid || (isAndroid && !isFullscreen)) && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        aria-label="Capture video frame"
                        onClick={handleCaptureFrame}
                        className="p-2 rounded-full hover:bg-white/15 transition-colors duration-200"
                      >
                        <Camera className="h-5 w-5 pb-1 sm:h-5 sm:w-5 md:h-6 md:w-6" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" sideOffset={15}>
                      <div className="bg-gray-900 text-white text-xs font-medium rounded-lg px-3 py-1.5 shadow-lg">
                        {SCREENSHOT_TOOLTIP}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {/* Fullscreen */}
              <button
                aria-label={LABEL_FULLSCREEN}
                onClick={() => toggleFullscreenDom()}
                className="p-2 rounded-full hover:bg-white/15  transition-colors duration-200"
              >
                {/* On iOS, always show the maximize icon, since native player handles exit */}
                {isIOS ? (
                  <Maximize2 className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
                ) : isFullscreen ? (
                  <Minimize2 className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
                ) : (
                  <Maximize2 className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6" />
                )}
              </button>
              {/* Temporary image preview overlay */}
              {showImagePreview && capturedImage && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/60">
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

function formatTime(seconds: number) {
  if (!isFinite(seconds) || seconds < 0) seconds = 0;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export default NJWPlayerComponent;
