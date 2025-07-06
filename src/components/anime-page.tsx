"use client";

import { useState, useRef } from 'react';
import { animeData, type Episode } from '@/data/anime';
import { VideoPlayer } from './video-player';
import { EpisodeSelector } from './episode-selector';
import { AnimeInfo } from './anime-info';
import { MobileHeader } from './mobile-header';
import { MobileBottomNav } from './mobile-bottom-nav';
import { Heart } from 'lucide-react';

export default function AnimePage() {
  const [currentEpisode, setCurrentEpisode] = useState<Episode>(animeData.episodes[0]);
  const [currentSection, setCurrentSection] = useState('video');
  
  const videoRef = useRef<HTMLDivElement>(null);
  const episodesRef = useRef<HTMLDivElement>(null);
  const infoRef = useRef<HTMLDivElement>(null);

  const handleSelectEpisode = (episode: Episode) => {
    setCurrentEpisode(episode);
    setCurrentSection('video');
    // Scroll to top when new episode is selected
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigate = (section: string) => {
    setCurrentSection(section);
    
    switch (section) {
      case 'video':
        // Scroll to top of page when video is selected
        window.scrollTo({ top: 0, behavior: 'smooth' });
        break;
      case 'episodes':
        episodesRef.current?.scrollIntoView({ behavior: 'smooth' });
        break;
      case 'info':
        infoRef.current?.scrollIntoView({ behavior: 'smooth' });
        break;
    }
  };

  const handlePreviousEpisode = () => {
    const currentIndex = animeData.episodes.findIndex(ep => ep.id === currentEpisode.id);
    if (currentIndex > 0) {
      setCurrentEpisode(animeData.episodes[currentIndex - 1]);
      setCurrentSection('video');
      // Scroll to top when episode changes
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleNextEpisode = () => {
    const currentIndex = animeData.episodes.findIndex(ep => ep.id === currentEpisode.id);
    if (currentIndex < animeData.episodes.length - 1) {
      setCurrentEpisode(animeData.episodes[currentIndex + 1]);
      setCurrentSection('video');
      // Scroll to top when episode changes
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const { episodes, ...animeDetails } = animeData;
  const currentIndex = episodes.findIndex(ep => ep.id === currentEpisode.id);
  const canGoBack = currentIndex > 0;
  const canGoNext = currentIndex < episodes.length - 1;

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <MobileHeader 
        title={animeDetails.title}
      />
      {/* Main Content */}
      <div className="w-full max-w-7xl mx-auto space-y-6 px-2 sm:px-4 lg:px-6 pb-32 lg:pb-6">
        {/* Video Section */}
        <div ref={videoRef} id="video-section">
          <VideoPlayer videoId={currentEpisode.videoId} />
        </div>

        {/* Episodes Section */}
        <div ref={episodesRef} id="episodes-section">
          <EpisodeSelector
            episodes={episodes}
            currentEpisode={currentEpisode}
            onSelectEpisode={handleSelectEpisode}
          />
        </div>

        {/* Info Section */}
        <div ref={infoRef} id="info-section">
          <AnimeInfo anime={animeDetails} />
        </div>
      </div>

      {/* Desktop Footer */}
      <footer className="hidden lg:block w-full max-w-7xl mx-auto mt-8 py-4 text-center text-muted-foreground text-sm">
        <p>Made by Kana <Heart className="inline w-4 h-4 text-primary fill-current" /></p>
      </footer>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav
        currentSection={currentSection}
        onNavigate={handleNavigate}
        onPreviousEpisode={handlePreviousEpisode}
        onNextEpisode={handleNextEpisode}
        canGoBack={canGoBack}
        canGoNext={canGoNext}
      />
    </div>
  );
}
