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
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-13 gap-2">
          {episodes.map((episode) => (
            <Button
              key={episode.id}
              variant={currentEpisode.id === episode.id ? 'default' : 'outline'}
              className={cn(
                "h-12 w-full text-sm font-medium",
                "transform transition-all duration-200",
                "hover:scale-105 active:scale-95",
                "touch-manipulation",
                "focus:ring-2 focus:ring-primary focus:ring-offset-2",
                currentEpisode.id === episode.id 
                  ? "bg-primary text-primary-foreground shadow-md scale-105" 
                  : "hover:bg-muted"
              )}
              onClick={() => onSelectEpisode(episode)}
            >
              {episode.id}
            </Button>
          ))}
        </div>
        
        {/* Mobile Episode Info */}
        <div className="lg:hidden mt-4 p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Tập hiện tại:</span>
            <span className="text-lg font-bold text-primary">#{currentEpisode.id}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{currentEpisode.title}</p>
        </div>
      </CardContent>
    </Card>
  );
}
