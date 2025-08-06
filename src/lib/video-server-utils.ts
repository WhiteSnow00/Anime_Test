export type ServerType = 'hls' | 'helvid' | 'hydax';
export type ServerStatus = 'online' | 'offline' | 'error' | 'checking';

export interface VideoServerError {
  server: ServerType;
  error: string;
  timestamp: number;
  episodeId: number;
  retryCount: number;
}

export interface ServerConfig {
  name: string;
  priority: number;
  baseUrl: string;
  timeout: number;
  maxRetries: number;
  fallbackServers: ServerType[];
}

export const SERVER_CONFIGS: Record<ServerType, ServerConfig> = {
  hls: {
    name: 'HLS Stream',
    priority: 1, // Primary server
    baseUrl: '/api/hls',
    timeout: 10000,
    maxRetries: 3,
    fallbackServers: ['helvid', 'hydax'],
  },
  helvid: {
    name: 'Helvid',
    priority: 2, // Backup server
    baseUrl: 'https://helvid.net/play/index/',
    timeout: 15000, // Increased timeout for iframe loading
    maxRetries: 1, // Reduce retries for external servers
    fallbackServers: ['hls', 'hydax'],
  },
  hydax: {
    name: 'Hydax',
    priority: 3, // Last fallback
    baseUrl: 'https://short.icu/',
    timeout: 15000, // Increased timeout for iframe loading
    maxRetries: 1, // Reduce retries for external servers
    fallbackServers: ['hls', 'helvid'],
  },
};

// Server error tracking (in-memory cache)
const serverErrors = new Map<string, VideoServerError>();
const serverStatus = new Map<ServerType, ServerStatus>();

export function generateVideoUrl(
  server: ServerType,
  videoId: string,
  options?: {
    autoPlay?: boolean;
    muted?: boolean;
    controls?: boolean;
    quality?: string;
  }
): string {
  const config = SERVER_CONFIGS[server];
  
  let generatedUrl;

  switch (server) {
    case 'hls':
      generatedUrl = `${config.baseUrl}?file=${videoId}`;
      break;
    case 'helvid':
      generatedUrl = `${config.baseUrl}${videoId}`;
      break;
    case 'hydax':
      generatedUrl = `${config.baseUrl}${videoId}`;
      break;
    default:
      console.error(`Unknown server type: ${server}`);
      return '';
  }

  console.log(`Generated video URL for ${server}: ${generatedUrl}`);
  return generatedUrl;
}

export async function checkVideoUrl(url: string, timeout: number = 5000): Promise<boolean> {
  try {
    if (url.includes('helvid.net') || url.includes('short.icu')) {
      return true;
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    console.error(`Error checking video URL ${url}:`, error);
    return false;
  }
}

export function getServerStatus(server: ServerType): ServerStatus {
  return serverStatus.get(server) || 'checking';
}

export function updateServerStatus(server: ServerType, status: ServerStatus) {
  serverStatus.set(server, status);
}

export function recordServerError(error: VideoServerError) {
  const key = `${error.server}-${error.episodeId}`;
  serverErrors.set(key, error);
  
  const serverErrorCount = Array.from(serverErrors.values()).filter(
    (e) => e.server === error.server && Date.now() - e.timestamp < 300000 // 5 minutes
  ).length;
  
  if (serverErrorCount >= 3) {
    updateServerStatus(error.server, 'error');
  }
}

export function getServerError(server: ServerType, episodeId: number): VideoServerError | null {
  const key = `${server}-${episodeId}`;
  const error = serverErrors.get(key);
  
  if (error && Date.now() - error.timestamp < 300000) { // 5 minutes
    return error;
  }
  
  return null;
}

export function clearOldErrors() {
  const now = Date.now();
  for (const [key, error] of serverErrors.entries()) {
    if (now - error.timestamp > 300000) { // 5 minutes
      serverErrors.delete(key);
    }
  }
}

export function getNextFallbackServer(
  currentServer: ServerType,
  triedServers: ServerType[] = []
): ServerType | null {
  const config = SERVER_CONFIGS[currentServer];
  const availableServers = config.fallbackServers.filter(
    (server) => !triedServers.includes(server)
  );
  
  if (availableServers.length === 0) {
    return null;
  }
  
  return availableServers.sort(
    (a, b) => SERVER_CONFIGS[a].priority - SERVER_CONFIGS[b].priority
  )[0];
}

export async function findBestServer(
  episode: {
    servers: {
      hls?: string;
      helvid: string;
      hydax: string;
    };
  },
  preferredServer?: ServerType
): Promise<ServerType | null> {
  const servers: ServerType[] = ['hls', 'helvid', 'hydax'];
  
  if (preferredServer && episode.servers[preferredServer]) {
    const url = generateVideoUrl(preferredServer, episode.servers[preferredServer]!);
    const isWorking = await checkVideoUrl(url, 3000);
    if (isWorking) {
      updateServerStatus(preferredServer, 'online');
      return preferredServer;
    }
  }
  
  const sortedServers = servers
    .filter((s) => s !== preferredServer && episode.servers[s])
    .sort((a, b) => SERVER_CONFIGS[a].priority - SERVER_CONFIGS[b].priority);
  
  for (const server of sortedServers) {
    const videoId = episode.servers[server];
    if (!videoId) continue;
    
    const url = generateVideoUrl(server, videoId);
    const isWorking = await checkVideoUrl(url, 3000);
    
    if (isWorking) {
      updateServerStatus(server, 'online');
      return server;
    } else {
      updateServerStatus(server, 'offline');
    }
  }
  
  return null;
}

export function getErrorMessage(error: VideoServerError, locale: 'vi' | 'en' = 'vi'): string {
  const messages = {
    vi: {
      404: 'Video không tìm thấy. Đang thử máy chủ khác...',
      timeout: 'Kết nối quá lâu. Đang thử lại...',
      cors: 'Lỗi bảo mật. Đang chuyển máy chủ...',
      network: 'Lỗi mạng. Vui lòng kiểm tra kết nối...',
      server_down: 'Máy chủ tạm thời không khả dụng...',
      unknown: 'Đã xảy ra lỗi. Đang thử phương án khác...',
    },
    en: {
      404: 'Video not found. Trying another server...',
      timeout: 'Connection timeout. Retrying...',
      cors: 'Security error. Switching server...',
      network: 'Network error. Please check your connection...',
      server_down: 'Server temporarily unavailable...',
      unknown: 'An error occurred. Trying alternative...',
    },
  };
  
  let errorType = 'unknown';
  
  if (error.error.includes('404')) errorType = '404';
  else if (error.error.includes('timeout')) errorType = 'timeout';
  else if (error.error.includes('CORS')) errorType = 'cors';
  else if (error.error.includes('network')) errorType = 'network';
  else if (error.error.includes('server')) errorType = 'server_down';
  
  return messages[locale][errorType as keyof typeof messages.vi];
}

export function createIframeErrorDetector(
  iframe: HTMLIFrameElement,
  server: ServerType,
  videoId: string,
  onError: (error: string) => void
): () => void {
  let hasLoaded = false;
  let timeoutId: NodeJS.Timeout;
  let isDestroyed = false;
  
  const loadTimeout = () => {
    const timeout = server === 'hls' ? 10000 : 20000; // 20 seconds for external servers
    timeoutId = setTimeout(() => {
      if (!hasLoaded && !isDestroyed) {
        console.warn(`Video load timeout after ${timeout}ms: ${server} - ${videoId}`);
        const extendedTimeoutId = setTimeout(() => {
          if (!hasLoaded && !isDestroyed) {
            onError(`Failed to load video: ${server} - ${videoId} (timeout)`);
          }
        }, 10000); // Additional 10 seconds
        
        (timeoutId as any).extended = extendedTimeoutId;
      }
    }, timeout);
  };
  
  const handleLoad = () => {
    if (isDestroyed) return;
    
    hasLoaded = true;
    clearTimeout(timeoutId);
    if ((timeoutId as any).extended) {
      clearTimeout((timeoutId as any).extended);
    }
    
    console.log(`Iframe loaded successfully: ${server} - ${videoId}`);
    
    if (server !== 'hls') {
      setTimeout(() => {
        if (isDestroyed) return;
        try {
          if (iframe.contentWindow) {
            console.log(`Iframe content verified: ${server} - ${videoId}`);
          }
        } catch (e) {
          if (e instanceof DOMException && e.name === 'SecurityError') {
            console.log(`Iframe loaded successfully (CORS expected): ${server} - ${videoId}`);
          } else {
            console.warn(`Unexpected iframe error: ${e}`);
          }
        }
      }, 2000); // Wait 2 seconds before verification
    }
  };
  
  const handleError = (event: Event) => {
    if (isDestroyed) return;
    
    clearTimeout(timeoutId);
    if ((timeoutId as any).extended) {
      clearTimeout((timeoutId as any).extended);
    }
    
    console.error(`Iframe error event: ${server} - ${videoId}`, event);
    onError(`Failed to load video: ${server} - ${videoId} (iframe error)`);
  };
  
  iframe.addEventListener('load', handleLoad);
  iframe.addEventListener('error', handleError);
  
  loadTimeout();
  
  return () => {
    isDestroyed = true;
    clearTimeout(timeoutId);
    if ((timeoutId as any).extended) {
      clearTimeout((timeoutId as any).extended);
    }
    iframe.removeEventListener('load', handleLoad);
    iframe.removeEventListener('error', handleError);
  };
}

export function validateEpisodeServers(episode: {
  id: number;
  servers: {
    hls?: string;
    helvid: string;
    hydax: string;
  };
}): Record<ServerType, boolean> {
  const validation: Record<ServerType, boolean> = {
    hls: false,
    helvid: false,
    hydax: false,
  };
  
  if (episode.servers.hls && episode.servers.hls.endsWith('.m3u8')) {
    validation.hls = true;
  }
  
  if (episode.servers.helvid && /^[a-f0-9]{12}$/.test(episode.servers.helvid)) {
    validation.helvid = true;
  } else {
    console.warn(`Invalid Helvid ID for episode ${episode.id}: ${episode.servers.helvid}`);
  }
  
  if (episode.servers.hydax && /^[a-zA-Z0-9_-]{8,10}$/.test(episode.servers.hydax)) {
    validation.hydax = true;
  } else {
    console.warn(`Invalid Hydax ID for episode ${episode.id}: ${episode.servers.hydax}`);
  }
  
  return validation;
}

export function getServerReliabilityScore(server: ServerType): number {
  const now = Date.now();
  const recentErrors = Array.from(serverErrors.values()).filter(
    (error) => error.server === server && (now - error.timestamp) < 300000 // 5 minutes
  );
  
  const score = Math.max(0, 100 - (recentErrors.length * 20));
  return score;
}

export function getBestAvailableServer(
  episode: {
    id: number;
    servers: {
      hls?: string;
      helvid: string;
      hydax: string;
    };
  },
  excludeServers: ServerType[] = []
): ServerType | null {
  const availableServers = (['hls', 'helvid', 'hydax'] as ServerType[])
    .filter(server => {
      return !excludeServers.includes(server) && 
             episode.servers[server] && 
             validateEpisodeServers(episode)[server];
    })
    .map(server => ({
      server,
      reliability: getServerReliabilityScore(server),
      priority: SERVER_CONFIGS[server].priority
    }))
    .sort((a, b) => {
      if (a.reliability !== b.reliability) {
        return b.reliability - a.reliability;
      }
      return a.priority - b.priority;
    });
  
  return availableServers.length > 0 ? availableServers[0].server : null;
}

if (typeof window !== 'undefined') {
  setInterval(clearOldErrors, 60000); // Every minute
}
