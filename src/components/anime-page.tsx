"use client";

import { useState } from 'react';
import { animeData, type Episode } from '@/data/anime';
import { VideoPlayer } from './video-player';
import { EpisodeSelector } from './episode-selector';
import { AnimeInfo } from './anime-info';
import { Heart } from 'lucide-react';

export default function AnimePage() {
  const [currentEpisode, setCurrentEpisode] = useState<Episode>(animeData.episodes[0]);

  const handleSelectEpisode = (episode: Episode) => {
    setCurrentEpisode(episode);
  };

  const { episodes, ...animeDetails } = animeData;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-2 sm:p-4 lg:p-6">
      <header className="w-full max-w-7xl mx-auto my-6 text-center">
        <h1 className="text-4xl md:text-5xl font-bold font-headline text-primary flex items-center justify-center gap-3">
          <Heart className="w-8 h-8 md:w-10 md:h-10 text-primary/70 animate-pulse" />
          Kana Webpage
          <Heart className="w-8 h-8 md:w-10 md:h-10 text-primary/70 animate-pulse" />
        </h1>
        <p className="text-muted-foreground mt-2">Test Da Tinh Sau!</p>
      </header>
      <div className="w-full max-w-7xl mx-auto space-y-6">
        <VideoPlayer videoId={currentEpisode.videoId} />
        <EpisodeSelector
          episodes={episodes}
          currentEpisode={currentEpisode}
          onSelectEpisode={handleSelectEpisode}
        />
        <AnimeInfo anime={animeDetails} />
      </div>
      <footer className="w-full max-w-7xl mx-auto mt-8 py-4 text-center text-muted-foreground text-sm">
        <p>Made by Kana <Heart className="inline w-4 h-4 text-primary fill-current" /></p>
      </footer>
    </div>
  );
}
