  /**
 * Feature Flags Configuration
 * 
 * Centralized feature flag management for gradual rollout and A/B testing.
 * All new features should be gated behind flags to enable safe deployment.
 */

export const FEATURE_FLAGS = {
  /**
   * RESUME_FEATURE_ENABLED
   * 
   * Enables client-side resume memory for:
   * - Last watched episode (auto-navigation on app load)
   * - Last watched timestamp per episode (with "Continue?" prompt)
   * 
   * Storage: localStorage (with sessionStorage fallback)
   * Scope: Per device, per user/guest
   * 
   * @default true
   */
  RESUME_FEATURE_ENABLED: true,

  /**
   * RESUME_PROMPT_ENABLED
   * 
   * Shows "Continue watching?" dialog when resuming an episode
   * with saved progress >= MIN_RESUME_THRESHOLD
   * 
   * @default true
   */
  RESUME_PROMPT_ENABLED: true,

  /**
   * RESUME_AUTO_NAVIGATE_ENABLED
   * 
   * Automatically navigates to last watched episode on app load
   * (only once per session to prevent redirect loops)
   * 
   * @default true
   */
  RESUME_AUTO_NAVIGATE_ENABLED: true,
} as const;

/**
 * Resume Configuration Constants
 */
export const RESUME_CONFIG = {
  /**
   * Minimum playback time (seconds) before showing resume prompt
   * Prevents prompts for episodes barely started
   */
  MIN_RESUME_THRESHOLD: 30,

  /**
   * Maximum playback percentage before considering episode "completed"
   * If progress >= 95%, treat as finished and don't prompt
   */
  MAX_RESUME_PERCENTAGE: 0.95,

  /**
   * Debounce interval (ms) for saving playback progress
   * Prevents excessive localStorage writes during playback
   */
  PROGRESS_SAVE_DEBOUNCE_MS: 3000,  

  /**
   * Time tolerance (seconds) for "declined" prompt suppression
   * If stored time is within ±10s of current, don't re-prompt
   */
  DECLINED_TIME_TOLERANCE: 10,

  /**
   * Storage key version for schema migrations
   */
  STORAGE_VERSION: 'v1',

  /**
   * Maximum age (days) for stored progress before cleanup
   */
  MAX_PROGRESS_AGE_DAYS: 90,
} as const;

/**
 * Check if a feature is enabled
 * 
 * @param flag - Feature flag name
 * @returns true if feature is enabled
 */
export function isFeatureEnabled(flag: keyof typeof FEATURE_FLAGS): boolean {
  return FEATURE_FLAGS[flag] === true;
}

/**
 * Get resume configuration value
 * 
 * @param key - Config key
 * @returns Configuration value
 */
export function getResumeConfig<K extends keyof typeof RESUME_CONFIG>(
  key: K
): typeof RESUME_CONFIG[K] {
  return RESUME_CONFIG[key];
}

