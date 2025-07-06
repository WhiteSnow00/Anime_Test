"use client";

import { useState, useCallback, useMemo } from 'react';
import type { Episode } from '@/data/anime';

export interface NavigationState {
  currentEpisode: Episode;
  currentSection: string;
  currentIndex: number;
  canGoBack: boolean;
  canGoNext: boolean;
}

export interface NavigationActions {
  selectEpisode: (episode: Episode) => void;
  navigateToSection: (section: string) => void;
  goToPreviousEpisode: () => void;
  goToNextEpisode: () => void;
  goToEpisodeByIndex: (index: number) => void;
  resetToFirstEpisode: () => void;
}

export interface UseAnimeNavigationOptions {
  episodes: Episode[];
  initialEpisode?: Episode;
  initialSection?: string;
  onEpisodeChange?: (episode: Episode, previousEpisode: Episode) => void;
  onSectionChange?: (section: string, previousSection: string) => void;
}

export function useAnimeNavigation({
  episodes,
  initialEpisode,
  initialSection = 'video',
  onEpisodeChange,
  onSectionChange,
}: UseAnimeNavigationOptions) {
  const [currentEpisode, setCurrentEpisode] = useState<Episode>(
    initialEpisode || episodes[0]
  );
  const [currentSection, setCurrentSection] = useState(initialSection);

  // Memoized calculations
  const currentIndex = useMemo(
    () => episodes.findIndex(ep => ep.id === currentEpisode.id),
    [episodes, currentEpisode.id]
  );

  const canGoBack = useMemo(() => currentIndex > 0, [currentIndex]);
  const canGoNext = useMemo(
    () => currentIndex < episodes.length - 1,
    [currentIndex, episodes.length]
  );

  // Navigation actions
  const selectEpisode = useCallback((episode: Episode) => {
    const previousEpisode = currentEpisode;
    setCurrentEpisode(episode);
    setCurrentSection('video');
    onEpisodeChange?.(episode, previousEpisode);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentEpisode, onEpisodeChange]);

  const navigateToSection = useCallback((section: string) => {
    const previousSection = currentSection;
    setCurrentSection(section);
    onSectionChange?.(section, previousSection);
  }, [currentSection, onSectionChange]);

  const goToPreviousEpisode = useCallback(() => {
    if (canGoBack) {
      const newEpisode = episodes[currentIndex - 1];
      selectEpisode(newEpisode);
    }
  }, [canGoBack, episodes, currentIndex, selectEpisode]);

  const goToNextEpisode = useCallback(() => {
    if (canGoNext) {
      const newEpisode = episodes[currentIndex + 1];
      selectEpisode(newEpisode);
    }
  }, [canGoNext, episodes, currentIndex, selectEpisode]);

  const goToEpisodeByIndex = useCallback((index: number) => {
    if (index >= 0 && index < episodes.length) {
      selectEpisode(episodes[index]);
    }
  }, [episodes, selectEpisode]);

  const resetToFirstEpisode = useCallback(() => {
    if (episodes.length > 0) {
      selectEpisode(episodes[0]);
    }
  }, [episodes, selectEpisode]);

  // State object
  const state: NavigationState = useMemo(() => ({
    currentEpisode,
    currentSection,
    currentIndex,
    canGoBack,
    canGoNext,
  }), [currentEpisode, currentSection, currentIndex, canGoBack, canGoNext]);

  // Actions object
  const actions: NavigationActions = useMemo(() => ({
    selectEpisode,
    navigateToSection,
    goToPreviousEpisode,
    goToNextEpisode,
    goToEpisodeByIndex,
    resetToFirstEpisode,
  }), [
    selectEpisode,
    navigateToSection,
    goToPreviousEpisode,
    goToNextEpisode,
    goToEpisodeByIndex,
    resetToFirstEpisode,
  ]);

  return { state, actions };
}
