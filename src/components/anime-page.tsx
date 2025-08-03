"use client";

import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { animeData, type Episode } from '@/data/anime';
import { VideoPlayer } from './video-player';
import { SimpleMobilePlayer, type SimpleMobileServerType } from './simple-mobile-player';
import { MobileServerSelector } from './mobile-server-selector';
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
import { useScrollNavigation } from '@/hooks/use-scroll-navigation';
import { useViewport } from '@/hooks/use-viewport';
import { useAnimeState } from '@/hooks/use-anime-state';
import { utils, fp } from '@/lib/advanced-utils';
import { withPerformanceOptimization, withErrorBoundary } from '@/lib/higher-order-components';
import { FloatingSupportWidget } from './floating-support-widget';

function AnimePageComponent() {
const [isHydrated, setIsHydrated] = useState(false);
  
  useEffect(() => {
    setIsHydrated(true);
    const timeoutId = setTimeout(() => {
      clearEpisodePosition();
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, []);

const [currentServer, setCurrentServer] = useState<ServerType>('hls');

  const handleServerChange = useCallback((server: ServerType) => {
    setCurrentServer(server);
  }, []);

  const handleMobileServerChange = useCallback((server: SimpleMobileServerType) => {
    setCurrentServer(server as ServerType);
  }, []);

const getCurrentVideoId = useCallback((episode: Episode) => {
    const serverKey = currentServer as keyof typeof episode.servers;
    const currentVideoId = episode.servers[serverKey];
    if (currentVideoId) {
      return currentVideoId;
    }
    return episode.servers.hls || '';
  }, [currentServer]);

const { state, actions, computed } = useAnimeState(animeData);
  const currentEpisode = state.currentEpisode || animeData.episodes[0];
  const currentSection = state.currentSection;

const handleServerError = useCallback((error: string) => {
    console.error('Server error:', error);
    if (!error.includes('Failed to load video:')) {
      return;
    }
    if (currentServer === 'hls' && currentEpisode) {
      if (error.includes('hls') && (error.includes('404') || error.includes('network'))) {
        const helvidId = currentEpisode.servers.helvid;
        if (helvidId) {
          console.log('HLS server failed with critical error, falling back to Helvid');
          setCurrentServer('helvid');
          return;
        }
      }
    }
    if (currentServer === 'helvid' || currentServer === 'hydax') {
      console.log(`${currentServer} failed - user should manually switch back to HLS main server`);
      return;
    }
    console.error('Server error for episode:', currentEpisode?.id, error);
  }, [currentServer, currentEpisode]);

  const { refs, actions: scrollActions } = useScrollNavigation({
    behavior: 'smooth',
    offset: 80,
  });

  const viewport = useViewport({
    mobileBreakpoint: 768,
    tabletBreakpoint: 1024,
    debounceMs: 150,
  });

  useEffect(() => {
    if (!viewport?.isDesktop) {
      setCurrentServer("helvid");
    }
  }, []);

  const episodeOps = useMemo(
    () => utils.createEpisodeOperations(animeData.episodes),
    [animeData.episodes]
  );

  const handleSelectEpisode = useCallback(
    fp.compose(
      utils.performance.measure,
      (episode: Episode) => {
        actions.setEpisode(episode);
        scrollActions.scrollToTop();
        setCurrentServer(viewport.isDesktop ? "hls" : "helvid");
        console.log(`Episode changed to ${episode.id}, resetting server to HLS`);
        
        return episode;
      }
    ),
    [actions.setEpisode, scrollActions.scrollToTop]
  );

  const handleNavigate = useCallback((section: string) => {
    actions.setSection(section);
    scrollActions.scrollToSection(section);
  }, [actions.setSection, scrollActions.scrollToSection]);

  const handlePreviousEpisode = useCallback(() => {
    const currentEpisode = state.currentEpisode;
    if (!currentEpisode || !computed.canGoPrevious) return;

    const previousEpisode = episodeOps.getCircularPrevious(currentEpisode.id);
    if (previousEpisode && utils.validation.isValidEpisode(previousEpisode)) {
      handleSelectEpisode(previousEpisode);
      setTimeout(() => scrollActions.scrollToSection('video'), 100);
    }
  }, [state.currentEpisode, computed.canGoPrevious, episodeOps, handleSelectEpisode, scrollActions]);

  const handleNextEpisode = useCallback(() => {
    const currentEpisode = state.currentEpisode;
    if (!currentEpisode || !computed.canGoNext) return;

    const nextEpisode = episodeOps.getCircularNext(currentEpisode.id);
    if (nextEpisode && utils.validation.isValidEpisode(nextEpisode)) {
      handleSelectEpisode(nextEpisode);
      setTimeout(() => scrollActions.scrollToSection('video'), 100);
    }
  }, [state.currentEpisode, computed.canGoNext, episodeOps, handleSelectEpisode, scrollActions]);

  const { episodes, ...animeDetails } = useMemo(() => animeData, []);

const layoutConfig = useMemo(() => {
    if (!isHydrated) {
      return {
        containerClass: "px-6 pb-6",
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

  // Switch to mobile player component for mobile devices
  const videoPlayerComponent = useMemo(() => {
    if (viewport.isMobile && ['helvid', 'hydax'].includes(currentServer)) {
      return (
        <SimpleMobilePlayer 
          videoId={getCurrentVideoId(currentEpisode)}
          server={currentServer as SimpleMobileServerType}
          episodeTitle={`Tập ${currentEpisode.id}`}
          className="mt-4"
        />
      );
    }
    
    return (
      <VideoPlayer 
        videoId={getCurrentVideoId(currentEpisode)}
        server={currentServer}
        episodeTitle={`Tập ${currentEpisode.id}`}
        autoPlay={true}
        muted={false}
        onError={handleServerError}
        onLoad={() => console.log(`Episode ${currentEpisode.id} loaded successfully on ${currentServer}`)}
      />
    );
  }, [viewport.isMobile, currentServer, currentEpisode, handleServerError]);

  // Switch to mobile server selector for mobile devices
  const serverSelectorComponent = useMemo(() => {
    if (viewport.isMobile) {
      // Only show mobile servers on mobile
      const mobileServer = ['helvid', 'hydax'].includes(currentServer) 
        ? currentServer as SimpleMobileServerType 
        : 'helvid';
      
      return (
        <MobileServerSelector
          currentServer={mobileServer}
          onServerChange={handleMobileServerChange}
          currentEpisode={currentEpisode}
        />
      );
    }
    
    return (
      <ServerSelector
        currentServer={currentServer}
        onServerChange={handleServerChange}
        currentEpisode={currentEpisode}
      />
    );
  }, [viewport.isMobile, currentServer, currentEpisode, handleServerChange, handleMobileServerChange]);

  const episodeStats = useMemo(() => episodeOps.getStats(), [episodeOps]);

  return (
    <div className="min-h-screen bg-background">
      <FloatingSupportWidget />

      {layoutConfig.showMobileHeader && (
        <MobileHeader title={animeDetails.title} />
      )}

      <div className={`w-full max-w-7xl mx-auto ${layoutConfig.spacing} ${layoutConfig.containerClass}`}>
        <NotificationHeader />

        <div ref={refs.videoRef} id="video-section" data-section="video">
{videoPlayerComponent}
        </div>

        <div className="mb-4">
          <Alert className="mx-3 sm:mx-0 border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
            <Info className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertDescription className="text-xs sm:text-sm text-amber-800 dark:text-amber-200 vietnamese-text leading-relaxed ml-1">
              Các bạn xem anime trên điện thoại vui lòng sử dụng chế độ máy tính của trình duyệt(nếu có) hoặc xoay ngang màn hình rồi bật toán màn hình để tránh lỗi phát sinh. 
            </AlertDescription>
          </Alert>
        </div>

        <div id="server-section" data-section="server">
          {serverSelectorComponent}
        </div>

        <div ref={refs.episodesRef} id="episodes-section" data-section="episodes">
          <EpisodeSelector
            episodes={episodes}
            currentEpisode={currentEpisode}
            onSelectEpisode={handleSelectEpisode}
          />
        </div>

        <div ref={refs.infoRef} id="info-section" data-section="info">
          <AnimeInfo anime={animeDetails} />
        </div>

        <div ref={refs.commentRef} id="comment-section" data-section="comment" className="mt-6 comment-section-mobile">
          <CommentSection currentEpisodeId={currentEpisode.id} />
        </div>
      </div>

      {layoutConfig.showDesktopFooter && (
        <footer className="w-full max-w-7xl mx-auto mt-8 py-4 text-center text-muted-foreground text-sm">
          <p>
            Made by Kana <Heart className="inline w-4 h-4 text-primary fill-current" />
          </p>
        </footer>
      )}

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

const OptimizedAnimePage = withPerformanceOptimization(AnimePageComponent);
const AnimePage = withErrorBoundary(OptimizedAnimePage);

export default AnimePage;
