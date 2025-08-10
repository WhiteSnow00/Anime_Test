export class ConsoleProtection {
  private clearInterval: NodeJS.Timeout | null = null;
  private originalConsole = {
    log: console.log,
    error: console.error,
    warn: console.warn,
    info: console.info,
    debug: console.debug,
    dir: console.dir,
    table: console.table,
  };
  private isActive = false;
  private messageQueue: any[] = [];
  private allowedPatterns = [
    /^JWPlayer ready$/,
    /^Initializing JWPlayer/,
    /^Video playback completed$/,
    /^First frame loaded$/,
    /^Quality levels available$/,
    /^Playback progress:/,
    /^Player buffering/,
    /^Bắt đầu phát video$/,
  ];

  start(options: {
    clearIntervalMs?: number;
    showWarning?: boolean;
    allowPatterns?: RegExp[];
  } = {}) {
    if (this.isActive) return;
    
    const {
      clearIntervalMs = 1000,
      showWarning = true,
      allowPatterns = []
    } = options;
    
    this.isActive = true;
    this.allowedPatterns = [...this.allowedPatterns, ...allowPatterns];
    
    this.overrideConsoleMethods();
  
    this.clearInterval = setInterval(() => {
      console.clear();
      
      if (showWarning) {
        this.originalConsole.log(
          '%c🔒 Console Protected',
          'color: red; font-size: 20px; font-weight: bold;'
        );
        this.originalConsole.log(
          '%c⚠️ Developer tools detected - Stream protection active',
          'color: orange; font-size: 14px;'
        );
        this.originalConsole.log(
          '%cAttempting to extract video URLs is prohibited',
          'color: red; font-size: 12px;'
        );
      }
      while (this.messageQueue.length > 0) {
        const msg = this.messageQueue.shift();
        this.originalConsole.log(...msg);
      }
    }, clearIntervalMs);
    console.clear();
    if (showWarning) {
      this.originalConsole.log(
        '%c🛡️ Stream Protection Activated',
        'color: green; font-size: 24px; font-weight: bold;'
      );
    }
  }
  
  stop() {
    if (!this.isActive) return;
    
    this.isActive = false;
    if (this.clearInterval) {
      clearInterval(this.clearInterval);
      this.clearInterval = null;
    }
    this.restoreConsoleMethods();
    
    console.log('%c✅ Console protection disabled', 'color: green;');
  }
  
  private overrideConsoleMethods() {
    console.log = (...args: any[]) => {
      const message = args.join(' ');
      const isAllowed = this.allowedPatterns.some(pattern => 
        pattern.test(message)
      );
      
      if (isAllowed) {
        this.messageQueue.push(args);
      }
          if (message.includes('tiktokcdn') || 
          message.includes('m3u8') || 
          message.includes('blob:') ||
          message.includes('segment')) {
        return; 
      }
            if (!message.includes('http')) {
        this.messageQueue.push(args);
      }
    };
    
    // Override console.error
    console.error = (...args: any[]) => {
      const message = args.join(' ');
      
      // Only show critical errors
      if (message.includes('Failed to load') || 
          message.includes('Player error')) {
        this.messageQueue.push(['❌', ...args]);
      }
    };
    
    // Override console.warn
    console.warn = (...args: any[]) => {
      const message = args.join(' ');
      
      // Filter warnings
      if (!message.includes('http') && !message.includes('blob')) {
        this.messageQueue.push(['⚠️', ...args]);
      }
    };
    
    console.info = (...args: any[]) => {
      // Mostly ignore info messages
      return;
    };
    
    // Override console.debug
    console.debug = (...args: any[]) => {
      // Always ignore debug messages
      return;
    };
    
    // Override console.dir
    console.dir = (obj: any) => {
      // Don't show object inspection
      return;
    };
    
    // Override console.table
    console.table = (data: any) => {
      // Don't show table data
      return;
    };
  }
  
  private restoreConsoleMethods() {
    console.log = this.originalConsole.log;
    console.error = this.originalConsole.error;
    console.warn = this.originalConsole.warn;
    console.info = this.originalConsole.info;
    console.debug = this.originalConsole.debug;
    console.dir = this.originalConsole.dir;
    console.table = this.originalConsole.table;
  }
    detectConsoleAccess() {
    let devtools = { open: false };
    const threshold = 160;
    
    setInterval(() => {
      if (window.outerHeight - window.innerHeight > threshold || 
          window.outerWidth - window.innerWidth > threshold) {
        if (!devtools.open) {
          devtools.open = true;
          this.onDevToolsOpen();
        }
      } else {
        if (devtools.open) {
          devtools.open = false;
          this.onDevToolsClosed();
        }
      }
    }, 500);
  }
  
  private onDevToolsOpen() {
    if (this.clearInterval) {
      clearInterval(this.clearInterval);
    }
      this.clearInterval = setInterval(() => {
      console.clear();
      this.originalConsole.log(
        '%c🚫 DEVTOOLS DETECTED - PROTECTION ACTIVE',
        'color: red; font-size: 30px; font-weight: bold; text-shadow: 2px 2px 4px rgba(0,0,0,0.5);'
      );
    }, 100); 
  }
  
  private onDevToolsClosed() {
    if (this.clearInterval) {
      clearInterval(this.clearInterval);
    }
    
    this.clearInterval = setInterval(() => {
      console.clear();
      this.originalConsole.log(
        '%c🔒 Console Protected',
        'color: green; font-size: 16px;'
      );
    }, 1000);
  }
}
export const consoleProtection = new ConsoleProtection();
