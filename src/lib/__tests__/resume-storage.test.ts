/**
 * Resume Storage Unit Tests
 * 
 * Tests for client-side resume storage utilities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  getUserId,
  getLastEpisode,
  setLastEpisode,
  getProgress,
  setProgress,
  clearProgress,
  hasSessionRedirected,
  markSessionRedirected,
  cleanupOldProgress,
} from '../resume-storage';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

// Mock sessionStorage
const sessionStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

describe('resume-storage', () => {
  beforeEach(() => {
    // Setup mocks
    Object.defineProperty(global, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
    Object.defineProperty(global, 'sessionStorage', {
      value: sessionStorageMock,
      writable: true,
    });
    
    // Clear storage
    localStorageMock.clear();
    sessionStorageMock.clear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserId', () => {
    it('should return user id when user is provided', () => {
      const user = { id: 'user123' };
      expect(getUserId(user)).toBe('user123');
    });

    it('should return "guest" when user is null', () => {
      expect(getUserId(null)).toBe('guest');
    });

    it('should return "guest" when user is undefined', () => {
      expect(getUserId(undefined)).toBe('guest');
    });
  });

  describe('getLastEpisode / setLastEpisode', () => {
    it('should save and retrieve last episode', () => {
      const userId = 'user123';
      setLastEpisode(userId, 5, 5);
      
      const result = getLastEpisode(userId);
      expect(result).toMatchObject({
        episodeNumber: 5,
        episodeId: 5,
      });
      expect(result?.updatedAt).toBeDefined();
    });

    it('should return null when no data exists', () => {
      const result = getLastEpisode('user123');
      expect(result).toBeNull();
    });

    it('should clear stale data when userId mismatch', () => {
      setLastEpisode('user123', 5, 5);
      const result = getLastEpisode('user456');
      expect(result).toBeNull();
    });

    it('should handle corrupted JSON gracefully', () => {
      localStorageMock.setItem('anime_test:resume:v1', 'invalid json');
      const result = getLastEpisode('user123');
      expect(result).toBeNull();
    });

    it('should save with animeKey when provided', () => {
      const userId = 'user123';
      setLastEpisode(userId, 5, 5, 'anime-xyz');
      
      const result = getLastEpisode(userId);
      expect(result?.animeKey).toBe('anime-xyz');
    });
  });

  describe('getProgress / setProgress', () => {
    it('should save and retrieve progress', () => {
      const userId = 'user123';
      const episodeId = 5;
      
      setProgress(userId, episodeId, { time: 120, declined: false });
      
      const result = getProgress(userId, episodeId);
      expect(result).toMatchObject({
        time: 120,
        declined: false,
      });
      expect(result?.updatedAt).toBeDefined();
    });

    it('should return null when no progress exists', () => {
      const result = getProgress('user123', 5);
      expect(result).toBeNull();
    });

    it('should merge with existing progress', () => {
      const userId = 'user123';
      const episodeId = 5;
      
      setProgress(userId, episodeId, { time: 120, declined: false });
      setProgress(userId, episodeId, { time: 180 });
      
      const result = getProgress(userId, episodeId);
      expect(result?.time).toBe(180);
      expect(result?.declined).toBe(false); // Preserved from first call
    });

    it('should handle multiple episodes', () => {
      const userId = 'user123';
      
      setProgress(userId, 1, { time: 60, declined: false });
      setProgress(userId, 2, { time: 120, declined: true });
      setProgress(userId, 3, { time: 180, declined: false });
      
      expect(getProgress(userId, 1)?.time).toBe(60);
      expect(getProgress(userId, 2)?.time).toBe(120);
      expect(getProgress(userId, 3)?.time).toBe(180);
    });

    it('should handle corrupted progress data', () => {
      localStorageMock.setItem('anime_test:progress:v1:user123', 'invalid json');
      
      // Should not throw, should reset
      setProgress('user123', 5, { time: 120, declined: false });
      
      const result = getProgress('user123', 5);
      expect(result?.time).toBe(120);
    });
  });

  describe('clearProgress', () => {
    it('should clear progress for specific episode', () => {
      const userId = 'user123';
      
      setProgress(userId, 1, { time: 60, declined: false });
      setProgress(userId, 2, { time: 120, declined: false });
      
      clearProgress(userId, 1);
      
      expect(getProgress(userId, 1)).toBeNull();
      expect(getProgress(userId, 2)).not.toBeNull();
    });

    it('should handle clearing non-existent progress', () => {
      expect(() => clearProgress('user123', 999)).not.toThrow();
    });
  });

  describe('hasSessionRedirected / markSessionRedirected', () => {
    it('should return false initially', () => {
      expect(hasSessionRedirected()).toBe(false);
    });

    it('should return true after marking', () => {
      markSessionRedirected();
      expect(hasSessionRedirected()).toBe(true);
    });
  });

  describe('cleanupOldProgress', () => {
    it('should remove progress older than MAX_PROGRESS_AGE_DAYS', () => {
      const userId = 'user123';
      const now = new Date();
      const oldDate = new Date(now.getTime() - 100 * 24 * 60 * 60 * 1000); // 100 days ago
      
      // Manually set old progress
      const progressMap = {
        '1': {
          time: 60,
          declined: false,
          updatedAt: oldDate.toISOString(),
        },
        '2': {
          time: 120,
          declined: false,
          updatedAt: now.toISOString(),
        },
      };
      
      localStorageMock.setItem(
        `anime_test:progress:v1:${userId}`,
        JSON.stringify(progressMap)
      );
      
      cleanupOldProgress(userId);
      
      expect(getProgress(userId, 1)).toBeNull(); // Old, should be removed
      expect(getProgress(userId, 2)).not.toBeNull(); // Recent, should remain
    });

    it('should handle empty progress map', () => {
      expect(() => cleanupOldProgress('user123')).not.toThrow();
    });
  });

  describe('Storage quota handling', () => {
    it('should handle quota exceeded errors', () => {
      // Mock quota exceeded
      const originalSetItem = localStorageMock.setItem;
      localStorageMock.setItem = () => {
        throw new Error('QuotaExceededError');
      };
      
      // Should not throw
      expect(() => setLastEpisode('user123', 5, 5)).not.toThrow();
      
      // Restore
      localStorageMock.setItem = originalSetItem;
    });
  });
});

