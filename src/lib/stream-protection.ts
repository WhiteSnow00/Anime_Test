
interface StreamSession {
  id: string;
  token: string;
  timestamp: number;
  requests: number;
  fingerprint: string;
  valid: boolean;
}

class StreamProtection {
  private sessions = new Map<string, StreamSession>();
  private blockedFingerprints = new Set<string>();
  private requestPatterns = new Map<string, number[]>();
  private decoyTriggers = new Map<string, number>();
  
  generateSessionToken(ip: string, userAgent: string): string {
    const fingerprint = this.generateFingerprint(ip, userAgent);
    const sessionId = this.generateRandomString(32);
    const token = this.generateRandomString(64);
    
    this.sessions.set(sessionId, {
      id: sessionId,
      token,
      timestamp: Date.now(),
      requests: 0,
      fingerprint,
      valid: true
    });
    
    setTimeout(() => {
      this.sessions.delete(sessionId);
    }, 3600000);
    
    return token;
  }
  
  validateRequest(token: string, ip: string, userAgent: string): boolean {
    const fingerprint = this.generateFingerprint(ip, userAgent);
    
    if (this.blockedFingerprints.has(fingerprint)) {
      this.triggerDecoyFlood(ip);
      return false;
    }
    
    const session = Array.from(this.sessions.values()).find(s => s.token === token);
    if (!session) {
      this.trackSuspiciousActivity(fingerprint);
      return false;
    }
    
    if (!session.valid || Date.now() - session.timestamp > 3600000) {
      this.sessions.delete(session.id);
      return false;
    }
    
    session.requests++;
    
    if (session.requests > 1000) {
      session.valid = false;
      this.blockedFingerprints.add(fingerprint);
      this.triggerDecoyFlood(ip);
      return false;
    }
    
    this.trackRequestPattern(fingerprint);
    
    return true;
  }
  
  private generateFingerprint(ip: string, userAgent: string): string {
    const data = `${ip}:${userAgent}:${typeof window !== 'undefined' ? window.location.origin : 'app'}`;
    return this.simpleHash(data);
  }
  
  private generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
  
  private simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }
  
  private trackSuspiciousActivity(fingerprint: string): void {
    const count = (this.decoyTriggers.get(fingerprint) || 0) + 1;
    this.decoyTriggers.set(fingerprint, count);
    
    if (count > 5) {
      this.blockedFingerprints.add(fingerprint);
    }
  }
  
  private trackRequestPattern(fingerprint: string): void {
    const patterns = this.requestPatterns.get(fingerprint) || [];
    patterns.push(Date.now());
    
    if (patterns.length > 100) {
      patterns.shift();
    }
    
    this.requestPatterns.set(fingerprint, patterns);
    
    const recentPatterns = patterns.filter(t => Date.now() - t < 10000);
    if (recentPatterns.length > 30) {
      this.blockedFingerprints.add(fingerprint);
      this.triggerDecoyFlood(fingerprint);
    }
  }
  
  private triggerDecoyFlood(identifier: string): void {
    if (typeof window !== 'undefined') {
      for (let i = 0; i < 50; i++) {
        setTimeout(() => {
          fetch(`/api/decoy-${this.generateRandomString(8)}?flood=${i}&target=${identifier}`)
            .catch(() => {});
        }, i * 100);
      }
    }
  }
  
  obfuscateStreamUrl(url: string, sessionToken: string): string {
    const timestamp = Date.now();
    const data = `${url}:${sessionToken}:${timestamp}`;
    const encrypted = this.simpleHash(data);
    
    const obfuscated = btoa(
      url.split('').reverse().join('') + timestamp.toString(36)
    );
    
    return `/api/stream/${encrypted}?data=${obfuscated}&t=${timestamp}`;
  }
  
  generateDecoyManifest(): string {
    const segments = [];
    const count = Math.floor(Math.random() * 50) + 30;
    
    segments.push('#EXTM3U');
    segments.push('#EXT-X-VERSION:3');
    segments.push('#EXT-X-TARGETDURATION:10');
    segments.push('#EXT-X-MEDIA-SEQUENCE:0');
    
    for (let i = 0; i < count; i++) {
      segments.push(`#EXTINF:${(Math.random() * 10).toFixed(3)},`);
      segments.push(`/api/decoy-segment/${this.generateRandomString(32)}.ts`);
    }
    
    segments.push('#EXT-X-ENDLIST');
    return segments.join('\n');
  }
  
  injectNetworkNoise(): void {
    if (typeof window === 'undefined') return;
    
    const noiseRequests = [
      () => fetch(`/api/decoy/manifest.m3u8?t=${Date.now()}`).catch(() => {}),
      () => fetch(`/api/decoy-stream/live.m3u8?session=${this.generateRandomString(16)}`).catch(() => {}),
      () => fetch(`/api/decoy-${this.generateRandomString(8)}/stream.json`).catch(() => {}),
      () => fetch(`/api/decoy/segment-${Math.floor(Math.random() * 100)}.ts`).catch(() => {}),
    ];
    
    setInterval(() => {
      const randomRequest = noiseRequests[Math.floor(Math.random() * noiseRequests.length)];
      randomRequest();
    }, Math.random() * 5000 + 2000);
  }
  
  scrambleNetworkTrace(): void {
    if (typeof window === 'undefined') return;
    
    const originalFetch = window.fetch;
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      
      if (url.includes('/api/hls') || url.includes('m3u8') || url.includes('.ts')) {
        for (let i = 0; i < 3; i++) {
          setTimeout(() => {
            originalFetch(`/api/decoy-${this.generateRandomString(6)}`, {
              method: 'GET',
              headers: {
                'X-Decoy': 'true',
                'X-Trace-Scramble': this.generateRandomString(16)
              }
            }).catch(() => {});
          }, Math.random() * 1000);
        }
      }
      
      return originalFetch(input, init);
    };
  }
  
  cleanupSessions(): void {
    const now = Date.now();
    for (const [id, session] of this.sessions.entries()) {
      if (now - session.timestamp > 3600000) {
        this.sessions.delete(id);
      }
    }
    
    if (this.blockedFingerprints.size > 10000) {
      const toRemove = Array.from(this.blockedFingerprints).slice(0, 5000);
      toRemove.forEach(fp => this.blockedFingerprints.delete(fp));
    }
  }
}

export const streamProtection = new StreamProtection();

export function initializeProtection(): void {
  if (typeof window !== 'undefined') {
    streamProtection.scrambleNetworkTrace();
    streamProtection.injectNetworkNoise();
    
    setInterval(() => {
      streamProtection.cleanupSessions();
    }, 600000);
  }
}
