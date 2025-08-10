export class AntiDebugger {
  private detectionCount = 0;
  private isBlocked = false;
  private originalMethods: Map<string, any> = new Map();
  private decoyIntervals: number[] = [];
  
  initialize(): void {
    if (typeof window === 'undefined') return;
    
    this.setupDevToolsDetection();
    this.overrideNetworkAPIs();
    this.protectDOM();
    this.injectDecoys();
    this.scrambleConsole();
  }
  
  private setupDevToolsDetection(): void {
    let devtools = { open: false, orientation: null as any };
    const threshold = 160;
    const emitEvent = (state: boolean) => {
      if (state) {
        this.detectionCount++;
        this.onDevToolsOpen();
      }
    };
    
    setInterval(() => {
      if (window.outerHeight - window.innerHeight > threshold || 
          window.outerWidth - window.innerWidth > threshold) {
        if (!devtools.open) {
          emitEvent(true);
          devtools.open = true;
        }
      } else {
        devtools.open = false;
      }
    }, 500);
    
    let element = document.createElement('div');
    Object.defineProperty(element, 'id', {
      get: () => {
        emitEvent(true);
        return 'devtools-detect';
      }
    });
    
    setInterval(() => {
      console.log(element);
      console.clear();
    }, 5000);
    
    const checkTiming = () => {
      const start = performance.now();
      debugger;
      const end = performance.now();
      if (end - start > 100) {
        this.onDevToolsOpen();
      }
    };
    
    setInterval(checkTiming, 5000);
  }
  
  private onDevToolsOpen(): void {
    if (this.isBlocked) return;
    
    if (this.detectionCount > 3) {
      this.isBlocked = true;
      this.blockAccess();
    }
    
    this.floodNetwork();
    this.corruptVideoElements();
    this.redirectConsole();
  }
  
  private blockAccess(): void {
    document.body.innerHTML = `
      <div style="display: flex; justify-content: center; align-items: center; height: 100vh; background: #000; color: #fff; font-family: monospace;">
        <div style="text-align: center;">
          <h1 style="color: #ff0000;">Access Denied</h1>
          <p>Developer tools detected. Stream protection activated.</p>
          <p style="color: #666;">Session terminated for security reasons.</p>
        </div>
      </div>
    `;
    
    setTimeout(() => {
      window.location.href = '/';
    }, 5000);
  }
  
  private floodNetwork(): void {
    const endpoints = [
      '/api/decoy/stream.m3u8',
      '/api/decoy-protection/manifest',
      '/api/decoy-segment/chunk.ts',
      '/api/decoy-key/encryption',
      '/api/decoy-auth/validate'
    ];
    
    for (let i = 0; i < 10; i++) {
      const interval = setInterval(() => {
        const endpoint = endpoints[Math.floor(Math.random() * endpoints.length)];
        fetch(`${endpoint}?t=${Date.now()}&s=${Math.random()}`).catch(() => {});
      }, Math.random() * 1000 + 500);
      
      this.decoyIntervals.push(interval as any);
      
      setTimeout(() => {
        clearInterval(interval);
      }, 10000);
    }
  }
  
  private overrideNetworkAPIs(): void {
    const originalFetch = window.fetch;
    const originalXHR = window.XMLHttpRequest;
    
    window.fetch = new Proxy(originalFetch, {
      apply: (target, thisArg, args) => {
        const [url] = args;
        const urlString = typeof url === 'string' ? url : url.toString();
        
        if (urlString.includes('m3u8') || urlString.includes('.ts')) {
          if (this.detectionCount > 0) {
            return Promise.resolve(new Response('Protected Content', { status: 403 }));
          }
          
          for (let i = 0; i < 5; i++) {
            setTimeout(() => {
              originalFetch(`/api/decoy-${Math.random().toString(36).substring(2)}`).catch(() => {});
            }, i * 50);
          }
        }
        
        return target.apply(thisArg, args);
      }
    });
    
    window.XMLHttpRequest = new Proxy(originalXHR, {
      construct(target, args) {
        const instance = new target(...args);
        const originalOpen = instance.open;
        
        instance.open = function(...openArgs: any[]) {
          const [method, url] = openArgs;
          
          if (url && (url.includes('m3u8') || url.includes('.ts'))) {
            if (this.detectionCount > 0) {
              openArgs[1] = '/api/decoy/blocked';
            }
          }
          
          return originalOpen.apply(instance, openArgs);
        };
        
        return instance;
      }
    });
  }
  
  private protectDOM(): void {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            
            if (element.tagName === 'VIDEO') {
              this.protectVideoElement(element as HTMLVideoElement);
            }
            
            const videos = element.querySelectorAll('video');
            videos.forEach(video => this.protectVideoElement(video));
          }
        });
      });
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
    
    document.querySelectorAll('video').forEach(video => {
      this.protectVideoElement(video);
    });
  }
  
  private protectVideoElement(video: HTMLVideoElement): void {
    const originalSrc = Object.getOwnPropertyDescriptor(HTMLVideoElement.prototype, 'src');
    const originalCurrentSrc = Object.getOwnPropertyDescriptor(HTMLVideoElement.prototype, 'currentSrc');
    
    if (originalSrc) {
      Object.defineProperty(video, 'src', {
        get: () => 'protected://stream',
        set: (value) => {
          if (this.detectionCount === 0) {
            originalSrc.set?.call(video, value);
          }
        },
        configurable: false
      });
    }
    
    if (originalCurrentSrc) {
      Object.defineProperty(video, 'currentSrc', {
        get: () => 'protected://stream',
        configurable: false
      });
    }
    
    video.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    });
  }
  
  private corruptVideoElements(): void {
    document.querySelectorAll('video').forEach(video => {
      try {
        video.pause();
        video.src = '';
        video.load();
        
        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 1920;
        canvas.height = video.videoHeight || 1080;
        canvas.style.cssText = video.style.cssText;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#000';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = '#f00';
          ctx.font = '48px monospace';
          ctx.textAlign = 'center';
          ctx.fillText('PROTECTED CONTENT', canvas.width / 2, canvas.height / 2);
        }
        
        video.parentNode?.replaceChild(canvas, video);
      } catch (e) {}
    });
  }
  
  private scrambleConsole(): void {
    const methods = ['log', 'error', 'warn', 'info', 'debug', 'trace', 'dir', 'table'];
    
    methods.forEach(method => {
      const original = (console as any)[method];
      this.originalMethods.set(method, original);
      
      (console as any)[method] = (...args: any[]) => {
        if (this.detectionCount > 0) {
          const scrambled = args.map(arg => {
            if (typeof arg === 'string') {
              if (arg.includes('m3u8') || arg.includes('blob:') || arg.includes('segment')) {
                return '[PROTECTED]';
              }
              return arg.replace(/https?:\/\/[^\s]+/g, '[PROTECTED_URL]');
            }
            if (typeof arg === 'object' && arg !== null) {
              return this.scrambleObject(arg);
            }
            return arg;
          });
          
          return original.apply(console, scrambled);
        }
        
        return original.apply(console, args);
      };
    });
  }
  
  private scrambleObject(obj: any, depth = 0): any {
    if (depth > 5) return '[DEEP_OBJECT]';
    
    if (obj instanceof HTMLVideoElement) {
      return { type: 'VIDEO', status: 'PROTECTED' };
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.scrambleObject(item, depth + 1));
    }
    
    if (typeof obj === 'object' && obj !== null) {
      const scrambled: any = {};
      for (const key in obj) {
        try {
          const value = obj[key];
          if (typeof value === 'string' && (value.includes('blob:') || value.includes('m3u8'))) {
            scrambled[key] = '[PROTECTED]';
          } else {
            scrambled[key] = this.scrambleObject(value, depth + 1);
          }
        } catch {
          scrambled[key] = '[ACCESS_DENIED]';
        }
      }
      return scrambled;
    }
    
    return obj;
  }
  
  private redirectConsole(): void {
    const fakeConsole = document.createElement('div');
    fakeConsole.id = 'fake-console';
    fakeConsole.style.cssText = `
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: 200px;
      background: #1e1e1e;
      color: #0f0;
      font-family: monospace;
      font-size: 12px;
      padding: 10px;
      overflow-y: auto;
      z-index: 99999;
      display: none;
    `;
    
    document.body.appendChild(fakeConsole);
    
    const addFakeLog = (message: string) => {
      const log = document.createElement('div');
      log.textContent = `> ${message}`;
      fakeConsole.appendChild(log);
      fakeConsole.scrollTop = fakeConsole.scrollHeight;
    };
    
    setInterval(() => {
      if (this.detectionCount > 0) {
        fakeConsole.style.display = 'block';
        addFakeLog(`Loading stream segment: /api/decoy-${Math.random().toString(36).substring(2)}.ts`);
        addFakeLog(`Decrypting content with key: ${Math.random().toString(36).substring(2)}`);
        addFakeLog(`Buffer: ${Math.floor(Math.random() * 100)}%`);
      }
    }, 2000);
  }
  
  private injectDecoys(): void {
    setInterval(() => {
      const decoyVideo = document.createElement('video');
      decoyVideo.style.display = 'none';
      decoyVideo.src = `blob:${location.origin}/${Math.random().toString(36).substring(2)}`;
      decoyVideo.id = `decoy-${Date.now()}`;
      document.body.appendChild(decoyVideo);
      
      setTimeout(() => decoyVideo.remove(), 5000);
      
      const decoyScript = document.createElement('script');
      decoyScript.textContent = `
        (function() {
          const _s = '${Math.random().toString(36).substring(2)}';
          window['_stream_' + _s] = { protected: true };
        })();
      `;
      document.head.appendChild(decoyScript);
      setTimeout(() => decoyScript.remove(), 1000);
    }, 3000);
  }
  
  destroy(): void {
    this.decoyIntervals.forEach(interval => clearInterval(interval));
    this.originalMethods.forEach((method, name) => {
      (console as any)[name] = method;
    });
  }
}

export const antiDebugger = new AntiDebugger();
