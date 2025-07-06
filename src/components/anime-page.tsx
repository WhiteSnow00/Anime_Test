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
