"use client";

import { useReducer, useCallback, useMemo, useEffect } from 'react';
import type { Episode, Anime } from '@/data/anime';
import { isFeatureEnabled } from '@/lib/feature-flags';
import {
  getUserId,
  getLastEpisode,
  setLastEpisode,
  hasSessionRedirected,
  markSessionRedirected,
  cleanupOldProgress,
} from '@/lib/resume-storage';

// Action types
export type AnimeAction =
  | { type: 'SET_EPISODE'; payload: Episode }
  | { type: 'SET_SECTION'; payload: string }
  | { type: 'NEXT_EPISODE' }
  | { type: 'PREVIOUS_EPISODE' }
  | { type: 'RESET_TO_FIRST' }
  | { type: 'SET_ANIME_DATA'; payload: Anime }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'ADD_TO_HISTORY'; payload: Episode }
  | { type: 'CLEAR_HISTORY' }
  | { type: 'SET_PREFERENCES'; payload: Partial<UserPreferences> }
  | { type: 'SET_SERVER_ERROR'; payload: { server: string; hasError: boolean } }
  | { type: 'CLEAR_SERVER_ERRORS' }
  | { type: 'SET_FALLBACK_HISTORY'; payload: string[] }
  | { type: 'INCREMENT_RETRY_COUNT' }
  | { type: 'RESET_RETRY_COUNT' };

// State interface
export interface AnimeState {
  anime: Anime | null;
  currentEpisode: Episode | null;
  currentSection: string;
  isLoading: boolean;
  error: string | null;
  history: Episode[];
  preferences: UserPreferences;
  serverErrors: Record<string, boolean>;
  fallbackHistory: string[];
  retryAttempts: number;
}

export interface UserPreferences {
  autoPlay: boolean;
  volume: number;
  playbackSpeed: number;
  subtitles: boolean;
  theme: 'light' | 'dark' | 'auto';
  rememberPosition: boolean;
}

// Initial state
const initialPreferences: UserPreferences = {
  autoPlay: true,
  volume: 1,
  playbackSpeed: 1,
  subtitles: false,
  theme: 'auto',
  rememberPosition: true,
};

const initialState: AnimeState = {
  anime: null,
  currentEpisode: null,
  currentSection: 'video',
  isLoading: false,
  error: null,
  history: [],
  preferences: initialPreferences,
  serverErrors: {},
  fallbackHistory: [],
  retryAttempts: 0,
};

// Reducer function
function animeReducer(state: AnimeState, action: AnimeAction): AnimeState {
  switch (action.type) {
    case 'SET_ANIME_DATA':
      return {
        ...state,
        anime: action.payload,
        currentEpisode: action.payload.episodes[0] || null,
        error: null,
      };

    case 'SET_EPISODE':
      return {
        ...state,
        currentEpisode: action.payload,
        currentSection: 'video',
      };

    case 'SET_SECTION':
      return {
        ...state,
        currentSection: action.payload,
      };

    case 'NEXT_EPISODE': {
      if (!state.anime || !state.currentEpisode) return state;
      
      const currentIndex = state.anime.episodes.findIndex(
        ep => ep.id === state.currentEpisode!.id
      );
      const nextIndex = currentIndex + 1;
      
      if (nextIndex < state.anime.episodes.length) {
        const nextEpisode = state.anime.episodes[nextIndex];
        return {
          ...state,
          currentEpisode: nextEpisode,
          currentSection: 'video',
        };
      }
      return state;
    }

    case 'PREVIOUS_EPISODE': {
      if (!state.anime || !state.currentEpisode) return state;
      
      const currentIndex = state.anime.episodes.findIndex(
        ep => ep.id === state.currentEpisode!.id
      );
      const prevIndex = currentIndex - 1;
      
      if (prevIndex >= 0) {
        const prevEpisode = state.anime.episodes[prevIndex];
        return {
          ...state,
          currentEpisode: prevEpisode,
          currentSection: 'video',
        };
      }
      return state;
    }

    case 'RESET_TO_FIRST':
      return {
        ...state,
        currentEpisode: state.anime?.episodes[0] || null,
        currentSection: 'video',
      };

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false,
      };

    case 'ADD_TO_HISTORY': {
      const newHistory = [
        action.payload,
        ...state.history.filter(ep => ep.id !== action.payload.id)
      ].slice(0, 10); 
      
      return {
        ...state,
        history: newHistory,
      };
    }

    case 'CLEAR_HISTORY':
      return {
        ...state,
        history: [],
      };

    case 'SET_PREFERENCES':
      return {
        ...state,
        preferences: {
          ...state.preferences,
          ...action.payload,
        },
      };

    default:
      return state;
  }
}

// Hook
export function useAnimeState(initialAnime?: Anime, user?: { id: string } | null) {
  const [state, dispatch] = useReducer(animeReducer, {
    ...initialState,
    anime: initialAnime || null,
    currentEpisode: initialAnime?.episodes[0] || null, // Always start with first episode for SSR
  });

  // Computed values
  const computedValues = useMemo(() => {
    const { anime, currentEpisode } = state;
    
    if (!anime || !currentEpisode) {
      return {
        currentIndex: -1,
        canGoNext: false,
        canGoPrevious: false,
        progress: 0,
        totalEpisodes: 0,
      };
    }

    const currentIndex = anime.episodes.findIndex(ep => ep.id === currentEpisode.id);
    const totalEpisodes = anime.episodes.length;
    
    return {
      currentIndex,
      canGoNext: currentIndex < totalEpisodes - 1,
      canGoPrevious: currentIndex > 0,
      progress: totalEpisodes > 0 ? ((currentIndex + 1) / totalEpisodes) * 100 : 0,
      totalEpisodes,
    };
  }, [state.anime, state.currentEpisode]);

  // Action creators
  const actions = useMemo(() => ({
    setAnimeData: (anime: Anime) => dispatch({ type: 'SET_ANIME_DATA', payload: anime }),

    setEpisode: (episode: Episode) => {
      console.log('🔄 setEpisode CALLED', { episodeId: episode.id, episodeName: episode.title });

      dispatch({ type: 'SET_EPISODE', payload: episode });
      dispatch({ type: 'ADD_TO_HISTORY', payload: episode });

      // Save to resume storage if feature enabled
      if (isFeatureEnabled('RESUME_FEATURE_ENABLED') && typeof window !== 'undefined') {
        const userId = getUserId(user);
        console.log('💾 SAVING last episode to storage', { userId, episodeId: episode.id });
        setLastEpisode(userId, episode.id, episode.id);

        // Verify it was saved
        const saved = getLastEpisode(userId);
        console.log('✅ VERIFIED saved episode:', saved);
      } else {
        console.log('❌ NOT SAVING - feature disabled or not in browser');
      }
    },
    
    setSection: (section: string) => dispatch({ type: 'SET_SECTION', payload: section }),
    
    nextEpisode: () => {
      if (computedValues.canGoNext && state.currentEpisode) {
        dispatch({ type: 'NEXT_EPISODE' });
        dispatch({ type: 'ADD_TO_HISTORY', payload: state.currentEpisode });
      }
    },
    
    previousEpisode: () => {
      if (computedValues.canGoPrevious && state.currentEpisode) {
        dispatch({ type: 'PREVIOUS_EPISODE' });
        dispatch({ type: 'ADD_TO_HISTORY', payload: state.currentEpisode });
      }
    },
    
    resetToFirst: () => dispatch({ type: 'RESET_TO_FIRST' }),
    
    setLoading: (isLoading: boolean) => dispatch({ type: 'SET_LOADING', payload: isLoading }),
    
    setError: (error: string | null) => dispatch({ type: 'SET_ERROR', payload: error }),
    
    clearHistory: () => dispatch({ type: 'CLEAR_HISTORY' }),
    
    updatePreferences: (preferences: Partial<UserPreferences>) => 
      dispatch({ type: 'SET_PREFERENCES', payload: preferences }),
      
    // Advanced actions
    goToEpisodeById: (episodeId: number) => {
      const episode = state.anime?.episodes.find(ep => ep.id === episodeId);
      if (episode) {
        dispatch({ type: 'SET_EPISODE', payload: episode });
        dispatch({ type: 'ADD_TO_HISTORY', payload: episode });

        // Save to resume storage if feature enabled
        if (isFeatureEnabled('RESUME_FEATURE_ENABLED') && typeof window !== 'undefined') {
          const userId = getUserId(user);
          setLastEpisode(userId, episode.id, episode.id);
        }
      }
    },

    goToEpisodeByIndex: (index: number) => {
      const episode = state.anime?.episodes[index];
      if (episode) {
        dispatch({ type: 'SET_EPISODE', payload: episode });
        dispatch({ type: 'ADD_TO_HISTORY', payload: episode });

        // Save to resume storage if feature enabled
        if (isFeatureEnabled('RESUME_FEATURE_ENABLED') && typeof window !== 'undefined') {
          const userId = getUserId(user);
          setLastEpisode(userId, episode.id, episode.id);
        }
      }
    },
    
    // Batch actions
    batchUpdate: (updates: Partial<AnimeState>) => {
      Object.entries(updates).forEach(([key, value]) => {
        switch (key) {
          case 'currentEpisode':
            if (value) dispatch({ type: 'SET_EPISODE', payload: value as Episode });
            break;
          case 'currentSection':
            dispatch({ type: 'SET_SECTION', payload: value as string });
            break;
          case 'isLoading':
            dispatch({ type: 'SET_LOADING', payload: value as boolean });
            break;
          case 'error':
            dispatch({ type: 'SET_ERROR', payload: value as string | null });
            break;
        }
      });
    },
  }), [computedValues, state.anime, state.currentEpisode, user]);

  // Side effects for persistence
  useEffect(() => {
    if (typeof window !== 'undefined' && state.preferences.rememberPosition) {
      localStorage.setItem('anime-preferences', JSON.stringify(state.preferences));
    }
  }, [state.preferences]);

  // Legacy localStorage support (kept for backward compatibility)
  useEffect(() => {
    if (typeof window !== 'undefined' && state.currentEpisode) {
      localStorage.setItem('last-episode', JSON.stringify(state.currentEpisode));
    }
  }, [state.currentEpisode]);

  // Load saved preferences on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedPreferences = localStorage.getItem('anime-preferences');
      if (savedPreferences) {
        try {
          const parsed = JSON.parse(savedPreferences);
          dispatch({ type: 'SET_PREFERENCES', payload: parsed });
        } catch (error) {
          console.warn('Failed to load saved preferences:', error);
        }
      }
    }
  }, []); 

  // Restore saved episode position after hydration to avoid SSR mismatch
  useEffect(() => {
    console.log('🔍 EPISODE RESTORATION EFFECT RUNNING', {
      hasWindow: typeof window !== 'undefined',
      hasAnime: !!state.anime,
      animeTitle: state.anime?.title,
    });

    if (typeof window !== 'undefined' && state.anime) {
      const resumeEnabled = isFeatureEnabled('RESUME_FEATURE_ENABLED');
      const autoNavigateEnabled = isFeatureEnabled('RESUME_AUTO_NAVIGATE_ENABLED');
      const hasRedirected = hasSessionRedirected();

      console.log('🔍 RESTORATION CHECK:', {
        resumeEnabled,
        autoNavigateEnabled,
        hasRedirected,
        currentEpisode: state.currentEpisode?.id,
      });

      try {
        // Priority 1: Resume storage (new system)
        if (resumeEnabled && autoNavigateEnabled && !hasSessionRedirected()) {
          const userId = getUserId(user);
          const lastEpisode = getLastEpisode(userId);

          if (process.env.NODE_ENV === 'development') {
            console.info('[use-anime-state] Checking resume storage:', { userId, lastEpisode });
          }

          if (lastEpisode) {
            const episodeExists = state.anime.episodes.find(
              ep => ep.id === lastEpisode.episodeId
            );
            if (episodeExists) {
              if (process.env.NODE_ENV === 'development') {
                console.info('[use-anime-state] Restoring episode from resume storage:', episodeExists.id);
              }
              dispatch({ type: 'SET_EPISODE', payload: episodeExists });
              markSessionRedirected();

              // Cleanup old progress data
              cleanupOldProgress(userId);
              return;
            }
          }
        }

        // Priority 2: Download position (legacy)
        const downloadPosition = localStorage.getItem('last-episode-download');
        if (downloadPosition) {
          const episodeId = parseInt(downloadPosition, 10);
          const episodeExists = state.anime.episodes.find(ep => ep.id === episodeId);
          if (episodeExists) {
            dispatch({ type: 'SET_EPISODE', payload: episodeExists });
            return;
          }
        }

        // Priority 3: General last episode (legacy)
        const savedEpisode = localStorage.getItem('last-episode');
        if (savedEpisode) {
          const parsedEpisode = JSON.parse(savedEpisode);
          const episodeExists = state.anime.episodes.find(ep => ep.id === parsedEpisode.id);
          if (episodeExists) {
            dispatch({ type: 'SET_EPISODE', payload: episodeExists });
          }
        }
      } catch (error) {
        console.warn('Failed to restore saved episode position:', error);
      }
    }
  }, [state.anime, user]); // Run when anime data or user changes
  
  return {
    state,
    actions,
    computed: computedValues,
  };
}
