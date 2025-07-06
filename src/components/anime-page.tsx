"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { animeData, type Episode } from '@/data/anime';
import { VideoPlayer } from './video-player';
import { EpisodeSelector } from './episode-selector';
import { AnimeInfo } from './anime-info';
import { MobileHeader } from './mobile-header';
import { MobileBottomNav } from './mobile-bottom-nav';
import { Heart } from 'lucide-react';

// Import advanced hooks and utilities
import { useAnimeNavigation } from '@/hooks/use-anime-navigation';
import { useScrollNavigation } from '@/hooks/use-scroll-navigation';
import { useViewport } from '@/hooks/use-viewport';
import { useAnimeState } from '@/hooks/use-anime-state';
import { utils, fp } from '@/lib/advanced-utils';
import { withPerformanceOptimization, withErrorBoundary } from '@/lib/higher-order-components';

function AnimePageComponent() {
  // Track hydration to avoid hydration mismatch
  const [isHydrated, setIsHydrated] = useState(false);
  
  useEffect(() => {
    setIsHydrated(true);
  }, []);
  // Initialize advanced state management
  const { state, actions, computed } = useAnimeState(animeData);
  
  // Advanced navigation with callbacks
  const navigationCallbacks = useMemo(() => ({
    onEpisodeChange: fp.debounce((episode: Episode, previousEpisode: Episode) => {
      console.log(`Episode changed from ${previousEpisode.title} to ${episode.title}`);
      actions.setEpisode(episode);
    }, 150),
    
    onSectionChange: fp.throttle((section: string, previousSection: string) => {
      console.log(`Section changed from ${previousSection} to ${section}`);
      actions.setSection(section);
    }, 100),
  }), [actions]);

  // Use advanced navigation hook
  const { state: navState, actions: navActions } = useAnimeNavigation({
    episodes: animeData.episodes,
    initialEpisode: animeData.episodes[0],
    initialSection: 'video',
    ...navigationCallbacks,
  });

  // Use scroll navigation hook
  const { refs, actions: scrollActions } = useScrollNavigation({
    behavior: 'smooth',
    offset: 80,
  });

  // Use viewport hook for responsive behavior
  const viewport = useViewport({
    mobileBreakpoint: 768,
    tabletBreakpoint: 1024,
    debounceMs: 150,
  });

  // Create episode operations utility
  const episodeOps = useMemo(
    () => utils.createEpisodeOperations(animeData.episodes),
    [animeData.episodes]
  );

  // Advanced episode selection with analytics
  const handleSelectEpisode = useCallback(
    fp.compose(
      utils.performance.measure,
      (episode: Episode) => {
        navActions.selectEpisode(episode);
        scrollActions.scrollToTop();
        return episode;
      }
    ),
    [navActions.selectEpisode, scrollActions.scrollToTop]
  );

  // Advanced navigation handler
  const handleNavigate = useCallback((section: string) => {
    navActions.navigateToSection(section);
    scrollActions.scrollToSection(section);
  }, [navActions.navigateToSection, scrollActions.scrollToSection]);

  // Enhanced episode navigation with validation
  const handlePreviousEpisode = useCallback(() => {
    const currentEpisode = navState.currentEpisode;
    if (!currentEpisode || !computed.canGoPrevious) return;

    const previousEpisode = episodeOps.getCircularPrevious(currentEpisode.id);
    if (previousEpisode && utils.validation.isValidEpisode(previousEpisode)) {
      handleSelectEpisode(previousEpisode);
    }
  }, [navState.currentEpisode, computed.canGoPrevious, episodeOps, handleSelectEpisode]);

  const handleNextEpisode = useCallback(() => {
    const currentEpisode = navState.currentEpisode;
    if (!currentEpisode || !computed.canGoNext) return;

    const nextEpisode = episodeOps.getCircularNext(currentEpisode.id);
    if (nextEpisode && utils.validation.isValidEpisode(nextEpisode)) {
      handleSelectEpisode(nextEpisode);
    }
  }, [navState.currentEpisode, computed.canGoNext, episodeOps, handleSelectEpisode]);

  // Memoized data extraction
  const { episodes, ...animeDetails } = useMemo(() => animeData, []);

  // Advanced responsive layout calculation - use defaults before hydration
  const layoutConfig = useMemo(() => {
    // Use safe defaults before hydration to avoid mismatch
    if (!isHydrated) {
      return {
        containerClass: "px-6 pb-6", // Default to desktop layout
        spacing: "space-y-6",
        showDesktopFooter: true,
        showMobileHeader: false,
      };
    }
    
    const { isMobile, isTablet, isDesktop } = viewport;
    
    return {
      containerClass: isMobile
        ? "px-2 sm:px-4 pb-32"
        : isTablet
        ? "px-4 lg:px-6 pb-20"
        : "px-6 pb-6",
      spacing: isMobile ? "space-y-4" : "space-y-6",
      showDesktopFooter: isDesktop,
      showMobileHeader: isMobile,
    };
  }, [isHydrated, viewport]);

  // Memoized episode statistics
  const episodeStats = useMemo(() => episodeOps.getStats(), [episodeOps]);

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header - Conditionally rendered */}
      {layoutConfig.showMobileHeader && (
        <MobileHeader title={animeDetails.title} />
      )}

      {/* Main Content */}
      <div className={`w-full max-w-7xl mx-auto ${layoutConfig.spacing} ${layoutConfig.containerClass}`}>
        {/* Video Section */}
        <div ref={refs.videoRef} id="video-section" data-section="video">
          <VideoPlayer videoId={navState.currentEpisode?.videoId || episodes[0].videoId} />
        </div>

        {/* Episodes Section */}
        <div ref={refs.episodesRef} id="episodes-section" data-section="episodes">
          <EpisodeSelector
            episodes={episodes}
            currentEpisode={navState.currentEpisode || episodes[0]}
            onSelectEpisode={handleSelectEpisode}
          />
        </div>

        {/* Info Section */}
        <div ref={refs.infoRef} id="info-section" data-section="info">
          <AnimeInfo anime={animeDetails} />
        </div>
      </div>

      {/* Desktop Footer - Conditionally rendered */}
      {layoutConfig.showDesktopFooter && (
        <footer className="w-full max-w-7xl mx-auto mt-8 py-4 text-center text-muted-foreground text-sm">
          <p>
            Made by Kana <Heart className="inline w-4 h-4 text-primary fill-current" />
          </p>
        </footer>
      )}

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        currentSection={navState.currentSection}
        onNavigate={handleNavigate}
        onPreviousEpisode={handlePreviousEpisode}
        onNextEpisode={handleNextEpisode}
        canGoBack={computed.canGoPrevious}
        canGoNext={computed.canGoNext}
      />
    </div>
  );
}

// Apply higher-order components for advanced functionality
const OptimizedAnimePage = withPerformanceOptimization(AnimePageComponent);
const AnimePage = withErrorBoundary(OptimizedAnimePage);

export default AnimePage;
