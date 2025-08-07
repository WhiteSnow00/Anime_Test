interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

class CacheService {
  private static cache = new Map<string, CacheItem<any>>();

  static set<T>(key: string, data: T, ttlMinutes: number = 5): void {
    const ttl = ttlMinutes * 60 * 1000; // Convert to milliseconds
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  static get<T>(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    const now = Date.now();
    const isExpired = (now - item.timestamp) > item.ttl;

    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return item.data as T;
  }

  static clear(pattern?: string): void {
    if (pattern) {
      const regex = new RegExp(pattern);
      for (const [key] of this.cache) {
        if (regex.test(key)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  static invalidateComments(episodeId?: number): void {
    if (episodeId) {
      this.clear(`comments:${episodeId}`);
      this.clear(`comments:all`);
    } else {
      this.clear('comments:');
    }
  }

  static getCacheKey(prefix: string, ...params: (string | number | undefined)[]): string {
    return `${prefix}:${params.filter(p => p !== undefined).join(':')}`;
  }
}

export default CacheService;
