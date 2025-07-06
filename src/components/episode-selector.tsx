"use client";

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Episode } from '@/data/anime';
import { cn } from '@/lib/utils';
import { Tv } from 'lucide-react';

interface EpisodeSelectorProps {
  episodes: Episode[];
  currentEpisode: Episode;
  onSelectEpisode: (episode: Episode) => void;
}

export function EpisodeSelector({ episodes, currentEpisode, onSelectEpisode }: EpisodeSelectorProps) {
  return (
    <Card className="w-full shadow-lg rounded-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline">
          <Tv className="w-6 h-6 text-primary" />
          Tập
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-13 gap-2">
          {episodes.map((episode) => (
            <Button
              key={episode.id}
              variant={currentEpisode.id === episode.id ? 'default' : 'outline'}
              className="transform transition-transform duration-200 hover:scale-110 active:scale-105"
              onClick={() => onSelectEpisode(episode)}
            >
              {episode.id}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
