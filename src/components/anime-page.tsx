"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { animeData, type Episode } from '@/data/anime';
import { VideoPlayer } from './video-player';
import { EpisodeSelector } from './episode-selector';
import { ServerSelector, type ServerType } from './server-selector';
import { AnimeInfo } from './anime-info';
import { MobileHeader } from './mobile-header';
import { MobileBottomNav } from './mobile-bottom-nav';
import { CommentSection } from './comment-section';
import { NotificationHeader } from './notification-header';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Heart, Info } from 'lucide-react';
import { clearEpisodePosition } from '@/lib/download-utils';

// Import advanced hooks and utilities
import { useScrollNavigation } from '@/hooks/use-scroll-navigation';
import { useViewport } from '@/hooks/use-viewport';
import { useAnimeState } from '@/hooks/use-anime-state';
import { utils, fp } from '@/lib/advanced-utils';
import { withPerformanceOptimization, withErrorBoundary } from '@/lib/higher-order-components';
import { FloatingSupportWidget } from './floating-support-widget';

function AnimePageComponent() {
  // Track hydration to avoid hydration mismatch
  const [isHydrated, setIsHydrated] = useState(false);
  
  useEffect(() => {
    setIsHydrated(true);
    
    // Clear the download position flag after user returns to the page
    // This ensures the download position only affects the initial load
    const timeoutId = setTimeout(() => {
      clearEpisodePosition();
    }, 1000);
    
    return () => clearTimeout(timeoutId);
  }, []);

  // Server state management
  const [currentServer, setCurrentServer] = useState<ServerType>('hls');

  // Handle server change
  const handleServerChange = useCallback((server: ServerType) => {
    setCurrentServer(server);
  }, []);

  // Get current video ID based on selected server with fallback logic
  const getCurrentVideoId = useCallback((episode: Episode) => {
    // Check if current server has video ID for this episode
    const currentVideoId = episode.servers[currentServer];
    if (currentVideoId) {
      return currentVideoId;
    }
    
    // If current server doesn't have video ID, fallback to HLS
    return episode.servers.hls || '';
  }, [currentServer]);

  // Initialize advanced state management
  const { state, actions, computed } = useAnimeState(animeData);

  // Use the current episode from useAnimeState directly
  const currentEpisode = state.currentEpisode || animeData.episodes[0];
  const currentSection = state.currentSection;

  // Auto-reset server to HLS when episode changes (HLS as primary server)
  useEffect(() => {
    if (currentEpisode) {
      // Always reset to HLS when episode changes, making HLS the primary server
      // User can manually select other servers if needed for that specific episode
      if (currentServer !== 'hls') {
        console.log(`Episode changed to ${currentEpisode.id}, resetting to HLS server (primary)`);
        setCurrentServer('hls');
      }
    }
  }, [currentEpisode.id]); // Only depend on episode ID

  // Handle server errors and auto-fallback
  const handleServerError = useCallback((error: string) => {
    console.error('Server error:', error);
    
    // If HLS fails, try fallback to Helvid
    if (currentServer === 'hls' && currentEpisode) {
      const helvidId = currentEpisode.servers.helvid;
      if (helvidId) {
        console.log('HLS failed, falling back to Helvid server');
        setCurrentServer('helvid');
        return;
      }
    }
    
    // If Helvid fails, try Hydax
    if (currentServer === 'helvid' && currentEpisode) {
      const hydaxId = currentEpisode.servers.hydax;
      if (hydaxId) {
        console.log('Helvid failed, falling back to Hydax server');
        setCurrentServer('hydax');
        return;
      }
    }
    
    // If all servers fail, show error message
    console.error('All servers failed for episode:', currentEpisode?.id);
  }, [currentServer, currentEpisode]);

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

  // Advanced episode selection with video transition
  const handleSelectEpisode = useCallback(
    fp.compose(
      utils.performance.measure,
      (episode: Episode) => {
        // Only update episode state, video player will handle transition automatically
        actions.setEpisode(episode);
        scrollActions.scrollToTop();
        
        // Optional: Add analytics or user feedback
        
        return episode;
      }
    ),
    [actions.setEpisode, scrollActions.scrollToTop]
  );

  // Advanced navigation handler
  const handleNavigate = useCallback((section: string) => {
    actions.setSection(section);
    scrollActions.scrollToSection(section);
  }, [actions.setSection, scrollActions.scrollToSection]);

  // Enhanced episode navigation with validation and scroll-to-video for mobile
  const handlePreviousEpisode = useCallback(() => {
    const currentEpisode = state.currentEpisode;
    if (!currentEpisode || !computed.canGoPrevious) return;

    const previousEpisode = episodeOps.getCircularPrevious(currentEpisode.id);
    if (previousEpisode && utils.validation.isValidEpisode(previousEpisode)) {
      handleSelectEpisode(previousEpisode);
      // Scroll to video section for mobile navigation
      setTimeout(() => scrollActions.scrollToSection('video'), 100);
    }
  }, [state.currentEpisode, computed.canGoPrevious, episodeOps, handleSelectEpisode, scrollActions]);

  const handleNextEpisode = useCallback(() => {
    const currentEpisode = state.currentEpisode;
    if (!currentEpisode || !computed.canGoNext) return;

    const nextEpisode = episodeOps.getCircularNext(currentEpisode.id);
    if (nextEpisode && utils.validation.isValidEpisode(nextEpisode)) {
      handleSelectEpisode(nextEpisode);
      // Scroll to video section for mobile navigation
      setTimeout(() => scrollActions.scrollToSection('video'), 100);
    }
  }, [state.currentEpisode, computed.canGoNext, episodeOps, handleSelectEpisode, scrollActions]);

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
      {/* Floating Support Widget - Only for PC */}
      <FloatingSupportWidget />

      {/* Mobile Header - Conditionally rendered */}
      {layoutConfig.showMobileHeader && (
        <MobileHeader title={animeDetails.title} />
      )}

      {/* Main Content */}
      <div className={`w-full max-w-7xl mx-auto ${layoutConfig.spacing} ${layoutConfig.containerClass}`}>
        {/* Notification Header - moved inside main container */}
        <NotificationHeader />

        {/* Video Section with Enhanced Transitions */}
        <div ref={refs.videoRef} id="video-section" data-section="video">
          <VideoPlayer 
            videoId={getCurrentVideoId(currentEpisode)} 
            server={currentServer}
            episodeTitle={`Tập ${currentEpisode.id}`}
            autoPlay={true}
            muted={false}
            onError={handleServerError}
          />
        </div>

        {/* Ads Notice Section */}
        <div className="mb-4">
          <Alert className="mx-3 sm:mx-0 border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
            <Info className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertDescription className="text-xs sm:text-sm text-amber-800 dark:text-amber-200 vietnamese-text leading-relaxed ml-1">
              Sẽ có quảng cáo khi xem anime tại web vì mình đang dùng host free chứ không phải mình đang kiếm tiền từ quảng cáo trên web, mong các bạn thông  cảm!
            </AlertDescription>
          </Alert>
        </div>

        {/* Server Selection */}
        <div id="server-section" data-section="server">
          <ServerSelector
            currentServer={currentServer}
            onServerChange={handleServerChange}
            currentEpisode={currentEpisode}
          />
        </div>

        {/* Episodes Section */}
        <div ref={refs.episodesRef} id="episodes-section" data-section="episodes">
          <EpisodeSelector
            episodes={episodes}
            currentEpisode={currentEpisode}
            onSelectEpisode={handleSelectEpisode}
          />
        </div>

        {/* Info Section */}
        <div ref={refs.infoRef} id="info-section" data-section="info">
          <AnimeInfo anime={animeDetails} />
        </div>

        {/* Comment Section */}
        <div ref={refs.commentRef} id="comment-section" data-section="comment" className="mt-6 comment-section-mobile">
          <CommentSection currentEpisodeId={currentEpisode.id} />
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
        currentSection={currentSection}
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
