import type { Episode, Anime } from '@/data/anime';

// Higher-order function for episode operations
export const createEpisodeOperations = (episodes: Episode[]) => {
  return {
    // Find episode by ID with error handling
    findById: (id: number): Episode | null => {
      return episodes.find(ep => ep.id === id) || null;
    },

    // Get episodes in a range
    getRange: (start: number, end: number): Episode[] => {
      return episodes.slice(start, end + 1);
    },

    // Get episodes by predicate function
    filter: (predicate: (episode: Episode) => boolean): Episode[] => {
      return episodes.filter(predicate);
    },

    // Transform episodes
    map: <T>(transformer: (episode: Episode) => T): T[] => {
      return episodes.map(transformer);
    },

    // Get random episode
    getRandom: (): Episode | null => {
      if (episodes.length === 0) return null;
      const randomIndex = Math.floor(Math.random() * episodes.length);
      return episodes[randomIndex];
    },

    // Get next/previous with circular navigation
    getCircularNext: (currentId: number): Episode | null => {
      const currentIndex = episodes.findIndex(ep => ep.id === currentId);
      if (currentIndex === -1) return null;
      const nextIndex = (currentIndex + 1) % episodes.length;
      return episodes[nextIndex];
    },

    getCircularPrevious: (currentId: number): Episode | null => {
      const currentIndex = episodes.findIndex(ep => ep.id === currentId);
      if (currentIndex === -1) return null;
      const prevIndex = currentIndex === 0 ? episodes.length - 1 : currentIndex - 1;
      return episodes[prevIndex];
    },

    // Check if episode exists
    exists: (id: number): boolean => {
      return episodes.some(ep => ep.id === id);
    },

    // Get episode statistics
    getStats: () => ({
      total: episodes.length,
      first: episodes[0] || null,
      last: episodes[episodes.length - 1] || null,
      ids: episodes.map(ep => ep.id),
    }),
  };
};

// Advanced array manipulation functions
export const arrayUtils = {
  // Chunk array into smaller arrays
  chunk: <T>(array: T[], size: number): T[][] => {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  },

  // Group array elements by a key function
  groupBy: <T, K extends string | number>(
    array: T[],
    keyFn: (item: T) => K
  ): Record<K, T[]> => {
    return array.reduce((groups, item) => {
      const key = keyFn(item);
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
      return groups;
    }, {} as Record<K, T[]>);
  },

  // Shuffle array (Fisher-Yates algorithm)
  shuffle: <T>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  },

  // Remove duplicates with custom key function
  uniqueBy: <T, K>(array: T[], keyFn: (item: T) => K): T[] => {
    const seen = new Set();
    return array.filter(item => {
      const key = keyFn(item);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  },

  // Safe array access
  safeGet: <T>(array: T[], index: number, defaultValue?: T): T | undefined => {
    return index >= 0 && index < array.length ? array[index] : defaultValue;
  },
};

// Functional programming utilities
export const fp = {
  // Compose functions (right to left)
  compose: <T>(...fns: Function[]) => (value: T) => {
    return fns.reduceRight((acc, fn) => fn(acc), value);
  },

  // Pipe functions (left to right)
  pipe: <T>(...fns: Function[]) => (value: T) => {
    return fns.reduce((acc, fn) => fn(acc), value);
  },

  // Curry function
  curry: <T extends any[], R>(fn: (...args: T) => R) => {
    return function curried(...args: any[]): any {
      if (args.length >= fn.length) {
        return fn(...args as T);
      }
      return (...nextArgs: any[]) => curried(...args, ...nextArgs);
    };
  },

  // Debounce function
  debounce: <T extends any[]>(
    fn: (...args: T) => void,
    delay: number
  ) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: T) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn(...args), delay);
    };
  },

  // Throttle function
  throttle: <T extends any[]>(
    fn: (...args: T) => void,
    limit: number
  ) => {
    let inThrottle: boolean;
    return (...args: T) => {
      if (!inThrottle) {
        fn(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  // Memoization with custom key function
  memoize: <T extends any[], R>(
    fn: (...args: T) => R,
    getKey?: (...args: T) => string
  ) => {
    const cache = new Map<string, R>();
    const defaultGetKey = (...args: T) => JSON.stringify(args);
    const keyFn = getKey || defaultGetKey;

    return (...args: T): R => {
      const key = keyFn(...args);
      if (cache.has(key)) {
        return cache.get(key)!;
      }
      const result = fn(...args);
      cache.set(key, result);
      return result;
    };
  },
};

// Performance utilities
export const performanceUtils = {
  // Measure function execution time
  measure: <T extends any[], R>(
    fn: (...args: T) => R,
    label?: string
  ) => {
    return (...args: T): R => {
      const result = fn(...args);
      
      return result;
    };
  },

  // Create a performance profiler
  createProfiler: (name: string) => {
    const times: number[] = [];
    
    return {
      start: () => globalThis.performance?.now() || Date.now(),
      end: (start: number) => {
        const duration = (globalThis.performance?.now() || Date.now()) - start;
        times.push(duration);
        return duration;
      },
      getStats: () => ({
        count: times.length,
        total: times.reduce((sum, time) => sum + time, 0),
        average: times.length > 0 ? times.reduce((sum, time) => sum + time, 0) / times.length : 0,
        min: Math.min(...times),
        max: Math.max(...times),
      }),
      reset: () => times.length = 0,
    };
  },
};

// Validation utilities
export const validation = {
  // Episode validation
  isValidEpisode: (episode: any): episode is Episode => {
    return (
      typeof episode === 'object' &&
      episode !== null &&
      typeof episode.id === 'number' &&
      typeof episode.title === 'string' &&
      typeof episode.videoId === 'string'
    );
  },

  // Anime validation
  isValidAnime: (anime: any): anime is Anime => {
    return (
      typeof anime === 'object' &&
      anime !== null &&
      typeof anime.title === 'string' &&
      Array.isArray(anime.episodes) &&
      anime.episodes.every(validation.isValidEpisode)
    );
  },

  // Create validator functions
  createValidator: <T>(rules: Array<(value: T) => boolean | string>) => {
    return (value: T): { isValid: boolean; errors: string[] } => {
      const errors: string[] = [];
      
      for (const rule of rules) {
        const result = rule(value);
        if (result !== true) {
          errors.push(typeof result === 'string' ? result : 'Validation failed');
        }
      }
      
      return {
        isValid: errors.length === 0,
        errors,
      };
    };
  },
};

// Type utilities
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalKeys<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Export all utilities as a single namespace
export const utils = {
  createEpisodeOperations,
  array: arrayUtils,
  fp,
  performance: performanceUtils,
  validation,
};
