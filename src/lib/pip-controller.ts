// pip-controller.ts
type PIPResult = "entered" | "exited" | "noop" | "failed";

interface PIPContext {
  getVideo: () => HTMLVideoElement | null;
  getPlayer: () => any | null;
  onEnter?: () => void;
  onExit?: () => void;
}

type PipKind = "std" | "wk" | "jw" | "none";

const isIOS =
  typeof navigator !== "undefined" &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.userAgent.includes("Mac") && "ontouchend" in document));

const attempt = async <T>(
  fn: () => Promise<T> | T,
  onErr?: () => void
): Promise<T | undefined> => {
  try {
    return await fn();
  } catch {
    onErr?.();
    return undefined;
  }
};

// ---------- Capabilities ----------
function hasStandardPip(video: HTMLVideoElement | null): boolean {
  if (!video) return false;
  const docAny = document as any;
  return (
    "pictureInPictureEnabled" in document &&
    docAny.pictureInPictureEnabled === true &&
    !(video as any).disablePictureInPicture &&
    typeof (video as any).requestPictureInPicture === "function"
  );
}

function hasWebkitPip(video: HTMLVideoElement | null): boolean {
  if (!video) return false;
  const vAny = video as any;
  return (
    typeof vAny.webkitSupportsPresentationMode === "function" &&
    vAny.webkitSupportsPresentationMode("picture-in-picture") === true
  );
}

function hasJWPlayerPip(p: any | null): boolean {
  return !!(
    p &&
    typeof p.isPipSupported === "function" &&
    typeof p.pip === "function" &&
    p.isPipSupported()
  );
}

// ---------- Active state ----------
async function isStandardActive(): Promise<boolean> {
  const docAny = document as any;
  return !!docAny.pictureInPictureElement;
}
function isWebkitActive(video: HTMLVideoElement | null): boolean {
  const vAny = video as any;
  return !!video && vAny.webkitPresentationMode === "picture-in-picture";
}
function isJWActive(p: any | null): boolean {
  // JW không expose state ổn định; ta suy luận tạm nếu cần, hoặc trả false
  // Nếu bạn có sự kiện p.on("pip", { pip }) -> nên setIsInPip từ ngoài.
  return false;
}

// ---------- Strategies ----------
const standardStrategy = {
  supported: (video: HTMLVideoElement | null) => hasStandardPip(video),
  isActive: async () => isStandardActive(),
  enter: async (video: HTMLVideoElement): Promise<PIPResult> => {
    const docAny = document as any;
    if (await isStandardActive()) return "noop";
    await (video as any).requestPictureInPicture();
    if (docAny.pictureInPictureElement === video) return "entered";
    return "failed";
  },
  exit: async (): Promise<PIPResult> => {
    const docAny = document as any;
    if (!docAny.pictureInPictureElement) return "noop";
    await docAny.exitPictureInPicture?.();
    return "exited";
  },
};

const webkitStrategy = {
  supported: (video: HTMLVideoElement | null) => hasWebkitPip(video),
  isActive: (video: HTMLVideoElement | null) => isWebkitActive(video),
  enter: async (video: HTMLVideoElement): Promise<PIPResult> => {
    const vAny = video as any;
    const cur = vAny.webkitPresentationMode;
    if (cur === "picture-in-picture") return "noop";
    vAny.webkitSetPresentationMode("picture-in-picture");
    return "entered";
  },
  exit: async (video: HTMLVideoElement): Promise<PIPResult> => {
    const vAny = video as any;
    if (vAny.webkitPresentationMode !== "picture-in-picture") return "noop";
    vAny.webkitSetPresentationMode("inline");
    return "exited";
  },
};

const jwStrategy = {
  supported: (_video: HTMLVideoElement | null, p: any | null) =>
    hasJWPlayerPip(p),
  // isActive: dựa event ngoài component tốt hơn
  isActive: (_v: HTMLVideoElement | null, _p: any | null) => false,
  enter: async (
    _video: HTMLVideoElement | null,
    p: any | null
  ): Promise<PIPResult> => {
    if (!p) return "failed";
    p.pip(); // JW tự toggle -> khó biết state ngay lập tức
    return "entered";
  },
  exit: async (
    _video: HTMLVideoElement | null,
    p: any | null
  ): Promise<PIPResult> => {
    if (!p) return "failed";
    p.pip(); // toggle lại để exit
    return "exited";
  },
};

// ---------- Public API ----------
export function createPipController(ctx: PIPContext) {
  const pick = () => {
    const v = ctx.getVideo();
    const p = ctx.getPlayer();
    if (standardStrategy.supported(v)) return { kind: "std" as const };
    if (webkitStrategy.supported(v)) return { kind: "wk" as const };
    if (jwStrategy.supported(v, p)) return { kind: "jw" as const };
    return { kind: "none" as const };
  };

  const supported = (): boolean => pick().kind !== null;

  const isActive = async (): Promise<boolean> => {
    const v = ctx.getVideo();
    const p = ctx.getPlayer();
    const k = pick().kind;
    if (k === "std") return standardStrategy.isActive();
    if (k === "wk") return webkitStrategy.isActive(v);
    if (k === "jw") return isJWActive(p);
    return false;
  };

  const enter = async (): Promise<PIPResult> => {
    const v = ctx.getVideo();
    const p = ctx.getPlayer();
    const k = pick().kind;
    if (!k) return "failed";

    const res =
      (await attempt(async () => {
        if (k === "std" && v) return standardStrategy.enter(v);
        if (k === "wk" && v) return webkitStrategy.enter(v);
        if (k === "jw") return jwStrategy.enter(v, p);
        return "failed";
      }, ctx.onExit)) ?? "failed";

    if (res === "entered") ctx.onEnter?.();
    return res;
  };

  const exit = async (): Promise<PIPResult> => {
    const v = ctx.getVideo();
    const p = ctx.getPlayer();
    const k = pick().kind;
    if (!k) return "failed";

    const res =
      (await attempt(async () => {
        if (k === "std") return standardStrategy.exit();
        if (k === "wk" && v) return webkitStrategy.exit(v);
        if (k === "jw") return jwStrategy.exit(v, p);
        return "failed";
      }, ctx.onExit)) ?? "failed";

    if (res === "exited") ctx.onExit?.();
    return res;
  };

  const toggle = async (): Promise<PIPResult> => {
    return (await isActive()) ? exit() : enter();
  };

  return { supported, isActive, enter, exit, toggle };
}
