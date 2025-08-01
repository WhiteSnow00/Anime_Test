import type { Episode, Anime } from '@/data/anime';

export const createEpisodeOperations = (episodes: Episode[]) => {
  return {
    findById: (id: number): Episode | null => {
      return episodes.find(ep => ep.id === id) || null;
    },

    getRange: (start: number, end: number): Episode[] => {
      return episodes.slice(start, end + 1);
    },

    filter: (predicate: (episode: Episode) => boolean): Episode[] => {
      return episodes.filter(predicate);
    },

    map: <T>(transformer: (episode: Episode) => T): T[] => {
      return episodes.map(transformer);
    },

    getRandom: (): Episode | null => {
      if (episodes.length === 0) return null;
      const randomIndex = Math.floor(Math.random() * episodes.length);
      return episodes[randomIndex];
    },

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

    exists: (id: number): boolean => {
      return episodes.some(ep => ep.id === id);
    },

    getStats: () => ({
      total: episodes.length,
      first: episodes[0] || null,
      last: episodes[episodes.length - 1] || null,
      ids: episodes.map(ep => ep.id),
    }),
  };
};

export const arrayUtils = {
  chunk: <T>(array: T[], size: number): T[][] => {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  },

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

  shuffle: <T>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  },

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

  safeGet: <T>(array: T[], index: number, defaultValue?: T): T | undefined => {
    return index >= 0 && index < array.length ? array[index] : defaultValue;
  },
};

export const fp = {
  compose: <T>(...fns: Function[]) => (value: T) => {
    return fns.reduceRight((acc, fn) => fn(acc), value);
  },

  pipe: <T>(...fns: Function[]) => (value: T) => {
    return fns.reduce((acc, fn) => fn(acc), value);
  },

  curry: <T extends any[], R>(fn: (...args: T) => R) => {
    return function curried(...args: any[]): any {
      if (args.length >= fn.length) {
        return fn(...args as T);
      }
      return (...nextArgs: any[]) => curried(...args, ...nextArgs);
    };
  },

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

export const performanceUtils = {
  measure: <T extends any[], R>(
    fn: (...args: T) => R,
    label?: string
  ) => {
    return (...args: T): R => {
      const result = fn(...args);
      
      return result;
    };
  },

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

export const validation = {
  isValidEpisode: (episode: any): episode is Episode => {
    return (
      typeof episode === 'object' &&
      episode !== null &&
      typeof episode.id === 'number' &&
      typeof episode.title === 'string' &&
      typeof episode.videoId === 'string'
    );
  },

  isValidAnime: (anime: any): anime is Anime => {
    return (
      typeof anime === 'object' &&
      anime !== null &&
      typeof anime.title === 'string' &&
      Array.isArray(anime.episodes) &&
      anime.episodes.every(validation.isValidEpisode)
    );
  },

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

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalKeys<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export const utils = {
  createEpisodeOperations,
  array: arrayUtils,
  fp,
  performance: performanceUtils,
  validation,
};
