// Application configuration
export const APP_CONFIG = {
  // Performance settings
  performance: {
    debounceMs: 150,
    throttleMs: 100,
    intersectionThreshold: 0.3,
    lazyLoadingOffset: 100,
  },

  // UI settings
  ui: {
    animationDuration: 200,
    mobileBreakpoint: 768,
    tabletBreakpoint: 1024,
    maxEpisodesPerPage: 50,
    gridColumnsMapping: {
      mobile: { min: 4, max: 5 },
      tablet: { min: 6, max: 8 },
      desktop: { min: 10, max: 15 },
    },
  },

  // Video player settings
  video: {
    defaultQuality: 'auto',
    qualityMapping: {
      low: { maxWidth: 640, quality: 'medium' },
      medium: { maxWidth: 1280, quality: 'hd720' },
      high: { maxWidth: 1920, quality: 'hd1080' },
      ultra: { maxWidth: Infinity, quality: 'hd1080' },
    },
    autoPlay: false,
    muted: false,
    controls: true,
  },

  // Storage settings
  storage: {
    keys: {
      preferences: 'anime-preferences',
      lastEpisode: 'last-episode',
      watchHistory: 'watch-history',
      userSettings: 'user-settings',
    },
    syncAcrossTabs: true,
    compressionEnabled: true,
  },

  // Analytics settings
  analytics: {
    trackPageViews: true,
    trackEpisodeSelections: true,
    trackPerformance: process.env.NODE_ENV === 'development',
    batchSize: 10,
    flushInterval: 5000,
  },

  // API settings
  api: {
    baseUrl: 'https://short.icu',
    timeout: 10000,
    retryAttempts: 3,
    retryDelay: 1000,
  },
} as const;

// Feature flags
export const FEATURES = {
  // Core features
  episodeHistory: true,
  autoPlay: true,
  qualitySelection: true,
  fullscreenMode: true,

  // Advanced features
  watchProgress: true,
  recommendations: false,
  socialSharing: false,
  offlineMode: false,
  pictureInPicture: true,

  // Experimental features
  aiRecommendations: false,
  voiceControl: false,
  gestureControls: false,
  vrMode: false,

  // Debug features
  performanceMonitoring: process.env.NODE_ENV === 'development',
  debugPanel: process.env.NODE_ENV === 'development',
  devTools: process.env.NODE_ENV === 'development',
} as const;

// Theme configuration
export const THEME_CONFIG = {
  colors: {
    primary: 'hsl(var(--primary))',
    secondary: 'hsl(var(--secondary))',
    accent: 'hsl(var(--accent))',
    background: 'hsl(var(--background))',
    foreground: 'hsl(var(--foreground))',
  },
  
  darkMode: {
    enabled: true,
    strategy: 'class' as const,
    defaultTheme: 'dark',
  },

  responsive: {
    mobile: '(max-width: 767px)',
    tablet: '(min-width: 768px) and (max-width: 1023px)',
    desktop: '(min-width: 1024px)',
    ultrawide: '(min-width: 1920px)',
  },
} as const;

// Error messages
export const ERROR_MESSAGES = {
  network: {
    offline: 'You appear to be offline. Please check your connection.',
    timeout: 'Request timed out. Please try again.',
    serverError: 'Server error occurred. Please try again later.',
    notFound: 'The requested content was not found.',
  },

  validation: {
    invalidEpisode: 'Invalid episode data provided.',
    invalidAnime: 'Invalid anime data provided.',
    missingRequired: 'Required field is missing.',
  },

  player: {
    loadFailed: 'Failed to load video player.',
    playbackError: 'An error occurred during playback.',
    unsupportedFormat: 'Video format is not supported.',
  },

  storage: {
    quotaExceeded: 'Storage quota exceeded. Please clear some data.',
    accessDenied: 'Storage access was denied.',
    corruptedData: 'Stored data appears to be corrupted.',
  },
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  episodeChanged: 'Episode changed successfully.',
  settingsSaved: 'Settings saved successfully.',
  dataLoaded: 'Data loaded successfully.',
  cacheClear: 'Cache cleared successfully.',
} as const;

// Key bindings
export const KEY_BINDINGS = {
  player: {
    play: 'Space',
    pause: 'Space',
    mute: 'm',
    fullscreen: 'f',
    volumeUp: 'ArrowUp',
    volumeDown: 'ArrowDown',
    seekForward: 'ArrowRight',
    seekBackward: 'ArrowLeft',
  },

  navigation: {
    nextEpisode: 'n',
    previousEpisode: 'p',
    home: 'h',
    search: '/',
    settings: 's',
  },

  accessibility: {
    skipToContent: 'Tab',
    activateElement: 'Enter',
    escapeModal: 'Escape',
  },
} as const;

// Validation schemas
export const VALIDATION_RULES = {
  episode: {
    id: (value: any) => typeof value === 'number' && value > 0,
    title: (value: any) => typeof value === 'string' && value.length > 0,
    videoId: (value: any) => typeof value === 'string' && value.length > 0,
  },

  preferences: {
    volume: (value: any) => typeof value === 'number' && value >= 0 && value <= 1,
    playbackSpeed: (value: any) => typeof value === 'number' && value > 0 && value <= 3,
    theme: (value: any) => ['light', 'dark', 'auto'].includes(value),
  },
} as const;

// Export all configurations
export const CONFIG = {
  app: APP_CONFIG,
  features: FEATURES,
  theme: THEME_CONFIG,
  errors: ERROR_MESSAGES,
  success: SUCCESS_MESSAGES,
  keys: KEY_BINDINGS,
  validation: VALIDATION_RULES,
} as const;

// Type helpers
export type AppConfig = typeof APP_CONFIG;
export type Features = typeof FEATURES;
export type ThemeConfig = typeof THEME_CONFIG;
