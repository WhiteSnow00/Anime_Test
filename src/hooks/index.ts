// Core hooks
export { useToast, toast } from './use-toast';

// Advanced hooks
export { useAnimeNavigation } from './use-anime-navigation';
export { useScrollNavigation } from './use-scroll-navigation';
export { useViewport } from './use-viewport';
export { useAnimeState } from './use-anime-state';
export { useLocalStorage } from './use-local-storage';

// Re-export types
export type {
  NavigationState,
  NavigationActions,
  UseAnimeNavigationOptions,
} from './use-anime-navigation';

export type {
  ScrollSectionRefs,
  ScrollActions,
  UseScrollNavigationOptions,
} from './use-scroll-navigation';

export type {
  ViewportState,
  UseViewportOptions,
} from './use-viewport';

export type {
  AnimeAction,
  AnimeState,
  UserPreferences,
} from './use-anime-state';

export type {
  UseLocalStorageOptions,
} from './use-local-storage';
