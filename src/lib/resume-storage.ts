/**
 * Resume Storage Utilities
 * 
 * Client-side storage for episode resume and playback progress.
 * Handles localStorage with graceful fallback to sessionStorage.
 * 
 * Storage Schema:
 * - anime_test:resume:v1 → { userId, lastEpisode: { episodeNumber, updatedAt } }
 * - anime_test:progress:v1:{userId} → { [episodeId]: { time, declined, updatedAt } }
 */

import { RESUME_CONFIG } from './feature-flags';

// Storage keys
const STORAGE_KEYS = {
  RESUME: `anime_test:resume:${RESUME_CONFIG.STORAGE_VERSION}`,
  PROGRESS_PREFIX: `anime_test:progress:${RESUME_CONFIG.STORAGE_VERSION}`,
  SESSION_REDIRECTED: 'anime_test:session:redirected',
} as const;

// Types
export interface LastEpisodeData {
  animeKey?: string;
  episodeNumber: number;
  episodeId: number;
  updatedAt: string;
}

export interface ResumeData {
  userId: string;
  lastEpisode: LastEpisodeData | null;
}

export interface EpisodeProgress {
  time: number;
  declined: boolean;
  updatedAt: string;
}

export type ProgressMap = Record<string, EpisodeProgress>;

// Storage adapter (localStorage with sessionStorage fallback)
class StorageAdapter {
  private storage: Storage | null = null;
  private fallbackStorage: Map<string, string> = new Map();
  private usesFallback = false;

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        // Test localStorage availability
        const testKey = '__storage_test__';
        localStorage.setItem(testKey, 'test');
        localStorage.removeItem(testKey);
        this.storage = localStorage;
      } catch (e) {
        // localStorage blocked, try sessionStorage
        try {
          const testKey = '__storage_test__';
          sessionStorage.setItem(testKey, 'test');
          sessionStorage.removeItem(testKey);
          this.storage = sessionStorage;
          this.usesFallback = true;
          console.warn('[resume-storage] localStorage blocked, using sessionStorage');
        } catch (e2) {
          // Both blocked, use in-memory fallback
          this.usesFallback = true;
          console.warn('[resume-storage] All storage blocked, using in-memory fallback');
        }
      }
    }
  }

  getItem(key: string): string | null {
    if (this.storage) {
      try {
        return this.storage.getItem(key);
      } catch (e) {
        console.error('[resume-storage] getItem error:', e);
      }
    }
    return this.fallbackStorage.get(key) || null;
  }

  setItem(key: string, value: string): void {
    if (this.storage) {
      try {
        this.storage.setItem(key, value);
        return;
      } catch (e) {
        // Quota exceeded or other error
        console.error('[resume-storage] setItem error:', e);
      }
    }
    this.fallbackStorage.set(key, value);
  }

  removeItem(key: string): void {
    if (this.storage) {
      try {
        this.storage.removeItem(key);
        return;
      } catch (e) {
        console.error('[resume-storage] removeItem error:', e);
      }
    }
    this.fallbackStorage.delete(key);
  }

  isUsingFallback(): boolean {
    return this.usesFallback;
  }
}

// Singleton storage adapter
const storage = new StorageAdapter();

/**
 * Get user ID from auth context or return "guest"
 * 
 * @param user - User object from AuthContext (optional)
 * @returns User ID or "guest"
 */
export function getUserId(user?: { id: string } | null): string {
  return user?.id || 'guest';
}

/**
 * Get last watched episode data
 * 
 * @param userId - User ID (from getUserId)
 * @returns Last episode data or null
 */
export function getLastEpisode(userId: string): LastEpisodeData | null {
  try {
    const data = storage.getItem(STORAGE_KEYS.RESUME);
    if (!data) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[resume-storage] No last episode data found');
      }
      return null;
    }

    const parsed: ResumeData = JSON.parse(data);

    // Verify userId matches (prevent cross-user data leakage)
    if (parsed.userId !== userId) {
      console.warn('[resume-storage] userId mismatch, clearing stale data');
      storage.removeItem(STORAGE_KEYS.RESUME);
      return null;
    }

    if (process.env.NODE_ENV === 'development') {
      console.warn('[resume-storage] Retrieved last episode:', parsed.lastEpisode);
    }

    return parsed.lastEpisode;
  } catch (e) {
    console.error('[resume-storage] getLastEpisode error:', e);
    return null;
  }
}

/**
 * Set last watched episode
 * 
 * @param userId - User ID
 * @param episodeNumber - Episode number (1-indexed)
 * @param episodeId - Episode ID
 * @param animeKey - Anime identifier (optional, for multi-anime support)
 */
export function setLastEpisode(
  userId: string,
  episodeNumber: number,
  episodeId: number,
  animeKey?: string
): void {
  try {
    const data: ResumeData = {
      userId,
      lastEpisode: {
        episodeNumber,
        episodeId,
        updatedAt: new Date().toISOString(),
        ...(animeKey && { animeKey }),
      },
    };

    storage.setItem(STORAGE_KEYS.RESUME, JSON.stringify(data));
    
    if (process.env.NODE_ENV === 'development') {
      console.warn('[resume-storage] setLastEpisode', { episodeNumber, episodeId });
    }
  } catch (e) {
    console.error('[resume-storage] setLastEpisode error:', e);
  }
}

/**
 * Get playback progress for a specific episode
 * 
 * @param userId - User ID
 * @param episodeId - Episode ID
 * @returns Episode progress or null
 */
export function getProgress(userId: string, episodeId: number): EpisodeProgress | null {
  try {
    const key = `${STORAGE_KEYS.PROGRESS_PREFIX}:${userId}`;
    const data = storage.getItem(key);
    if (!data) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('[resume-storage] No progress data found for user:', userId);
      }
      return null;
    }

    const progressMap: ProgressMap = JSON.parse(data);
    const progress = progressMap[episodeId] || null;

    if (process.env.NODE_ENV === 'development') {
      console.warn('[resume-storage] Retrieved progress for episode', episodeId, ':', progress);
    }

    return progress;
  } catch (e) {
    console.error('[resume-storage] getProgress error:', e);
    return null;
  }
}

/**
 * Set playback progress for a specific episode
 * 
 * @param userId - User ID
 * @param episodeId - Episode ID
 * @param progress - Progress data (time, declined flag)
 */
export function setProgress(
  userId: string,
  episodeId: number,
  progress: Partial<EpisodeProgress>
): void {
  try {
    const key = `${STORAGE_KEYS.PROGRESS_PREFIX}:${userId}`;
    const data = storage.getItem(key);
    
    let progressMap: ProgressMap = {};
    if (data) {
      try {
        progressMap = JSON.parse(data);
      } catch (e) {
        console.warn('[resume-storage] Corrupted progress data, resetting');
      }
    }

    // Merge with existing progress
    const existing = progressMap[episodeId] || { time: 0, declined: false, updatedAt: '' };
    progressMap[episodeId] = {
      ...existing,
      ...progress,
      updatedAt: new Date().toISOString(),
    };

    storage.setItem(key, JSON.stringify(progressMap));
    
    if (process.env.NODE_ENV === 'development') {
      console.warn('[resume-storage] setProgress', { episodeId, progress });
    }
  } catch (e) {
    console.error('[resume-storage] setProgress error:', e);
  }
}

/**
 * Clear progress for a specific episode
 * 
 * @param userId - User ID
 * @param episodeId - Episode ID
 */
export function clearProgress(userId: string, episodeId: number): void {
  try {
    const key = `${STORAGE_KEYS.PROGRESS_PREFIX}:${userId}`;
    const data = storage.getItem(key);
    if (!data) return;

    const progressMap: ProgressMap = JSON.parse(data);
    delete progressMap[episodeId];
    
    storage.setItem(key, JSON.stringify(progressMap));
  } catch (e) {
    console.error('[resume-storage] clearProgress error:', e);
  }
}

/**
 * Check if session redirect has already occurred
 * (Prevents redirect loops)
 * 
 * @returns true if redirect already happened this session
 */
export function hasSessionRedirected(): boolean {
  if (typeof window === 'undefined') return false;
  return sessionStorage.getItem(STORAGE_KEYS.SESSION_REDIRECTED) === 'true';
}

/**
 * Mark session as redirected
 */
export function markSessionRedirected(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(STORAGE_KEYS.SESSION_REDIRECTED, 'true');
}

/**
 * Clean up old progress data (older than MAX_PROGRESS_AGE_DAYS)
 * 
 * @param userId - User ID
 */
export function cleanupOldProgress(userId: string): void {
  try {
    const key = `${STORAGE_KEYS.PROGRESS_PREFIX}:${userId}`;
    const data = storage.getItem(key);
    if (!data) return;

    const progressMap: ProgressMap = JSON.parse(data);
    const maxAge = RESUME_CONFIG.MAX_PROGRESS_AGE_DAYS * 24 * 60 * 60 * 1000;
    const now = Date.now();
    
    let cleaned = false;
    for (const [episodeId, progress] of Object.entries(progressMap)) {
      const age = now - new Date(progress.updatedAt).getTime();
      if (age > maxAge) {
        delete progressMap[episodeId];
        cleaned = true;
      }
    }

    if (cleaned) {
  storage.setItem(key, JSON.stringify(progressMap));
  console.warn('[resume-storage] Cleaned up old progress data');
    }
  } catch (e) {
    console.error('[resume-storage] cleanupOldProgress error:', e);
  }
}

/**
 * Check if storage is available
 * 
 * @returns true if storage is available (not using in-memory fallback)
 */
export function isStorageAvailable(): boolean {
  return !storage.isUsingFallback();
}

/**
 * Get the most recently updated episode from the user's progress map
 * Useful fallback when lastEpisode is missing but per-episode progress exists
 */
export function getLatestProgressEpisode(userId: string): { episodeId: number; progress: EpisodeProgress } | null {
  try {
    const key = `${STORAGE_KEYS.PROGRESS_PREFIX}:${userId}`;
    const data = storage.getItem(key);
    if (!data) return null;
    const progressMap: ProgressMap = JSON.parse(data);
    let latest: { episodeId: number; progress: EpisodeProgress } | null = null;
    for (const [epIdStr, prog] of Object.entries(progressMap)) {
      if (!prog?.updatedAt) continue;
      const epId = Number(epIdStr);
      if (!latest) {
        latest = { episodeId: epId, progress: prog };
      } else {
        const prev = new Date(latest.progress.updatedAt).getTime();
        const cur = new Date(prog.updatedAt).getTime();
        if (cur > prev) {
          latest = { episodeId: epId, progress: prog };
        }
      }
    }
    return latest;
  } catch (e) {
    console.error('[resume-storage] getLatestProgressEpisode error:', e);
    return null;
  }
}

