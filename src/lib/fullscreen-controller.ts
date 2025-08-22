type FSResult = "entered" | "exited" | "noop" | "failed";

interface FSContext {
  container: HTMLElement;       
  getVideo: () => HTMLVideoElement | null;
  getPlayer: () => any | null;           
  onEnter?: () => void;                  
  onExit?: () => void;                     
}

const isIOS = typeof navigator !== "undefined" &&
  (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
   (navigator.userAgent.includes("Mac") && "ontouchend" in document));

const supportsDOMFS = (el: any) => !!el?.requestFullscreen && typeof document !== "undefined";
const isDOMInFS = () => !!document.fullscreenElement;

const attempt = async <T>(fn: () => Promise<T> | T, onErr?: () => void): Promise<T | undefined> => {
  try { return await fn(); } catch { onErr?.(); return undefined; }
};

// ---------- Strategies ----------
const domStrategy = {
  enter: async (ctx: FSContext): Promise<FSResult> => {
    if (isDOMInFS()) return "noop";
    const p = ctx.container.requestFullscreen?.();
    await (p instanceof Promise ? p : Promise.resolve());
    ctx.onEnter?.();
    return "entered";
  },
  exit: async (ctx: FSContext): Promise<FSResult> => {
    if (!isDOMInFS()) return "noop";
    await attempt(() => document.exitFullscreen?.() as any);
    ctx.onExit?.();
    return "exited";
  }
};

const iosVideoStrategy = {
  enter: async (ctx: FSContext): Promise<FSResult> => {
    const v = ctx.getVideo();
    if (!v || typeof (v as any).webkitEnterFullscreen !== "function") return "failed";
    (v as any).webkitEnterFullscreen();
    ctx.onEnter?.();
    return "entered";
  },
  exit: async (ctx: FSContext): Promise<FSResult> => {
    const v = ctx.getVideo();
    if (!v || typeof (v as any).webkitExitFullscreen !== "function") return "failed";
    (v as any).webkitExitFullscreen();
    ctx.onExit?.();
    return "exited";
  }
};

const jwStrategy = {
  enter: async (ctx: FSContext): Promise<FSResult> => {
    const p = ctx.getPlayer();
    if (!p?.setFullscreen) return "failed";
    p.setFullscreen(true);
    ctx.onEnter?.();
    return "entered";
  },
  exit: async (ctx: FSContext): Promise<FSResult> => {
    const p = ctx.getPlayer();
    if (!p?.setFullscreen) return "failed";
    p.setFullscreen(false);
    ctx.onExit?.();
    return "exited";
  }
};

// ---------- Chooser ----------
function pickStrategy(ctx: FSContext) {
  if (supportsDOMFS(ctx.container)) return domStrategy;
  if (isIOS) return iosVideoStrategy;
  return jwStrategy;
}

// ---------- Public API ----------
export function createFullscreenController(ctx: FSContext) {
  const strat = pickStrategy(ctx);

  const enter = async (): Promise<FSResult> => {

    await attempt(() => (window as any).screen?.orientation?.lock?.("landscape"));
    const res = await attempt(() => strat.enter(ctx), ctx.onExit) ?? "failed";
    return res;
  };

  const exit = async (): Promise<FSResult> => {
    const res = await attempt(() => strat.exit(ctx), ctx.onExit) ?? "failed";
    await attempt(() => (window as any).screen?.orientation?.unlock?.());
    return res;
  };

  const toggle = async (): Promise<FSResult> => {
    if (supportsDOMFS(ctx.container)) {
      return isDOMInFS() ? exit() : enter();
    }

    const v = ctx.getVideo();
    const inIOSPiPOrFS =
      !!v && ((
        (v as any).webkitPresentationMode === "fullscreen") // iOS modern
        || (v as any).webkitDisplayingFullscreen === true); // iOS legacy

    if (isIOS && inIOSPiPOrFS) return exit();
    const p = ctx.getPlayer();
    if (p?.getFullscreen && p.getFullscreen() === true) return exit();
    return enter();
  };

  return { enter, exit, toggle };
}
