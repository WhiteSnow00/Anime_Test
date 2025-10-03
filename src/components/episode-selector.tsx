"use client";

import { memo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Episode } from '@/data/anime';
import { cn } from '@/lib/utils';
import { Tv } from 'lucide-react';
import { withPerformanceOptimization } from '@/lib/higher-order-components';
import { fp, performanceUtils } from '@/lib/advanced-utils';

interface EpisodeSelectorProps {
  episodes: Episode[];
  currentEpisode: Episode;
  onSelectEpisode: (episode: Episode) => void;
  className?: string;
}

function EpisodeSelectorComponent({ 
  episodes, 
  currentEpisode, 
  onSelectEpisode,
  className,
}: EpisodeSelectorProps) {
  const gridClass = "grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 2xl:grid-cols-12";
  const buttonSizeClass = "w-full h-10 md:h-12 text-xs md:text-sm";

  const handleEpisodeSelect = useCallback((episode: Episode) => {
    const measure = performanceUtils.measure((ep: Episode) => {
      onSelectEpisode(ep);
    }, 'Episode Selection');
    measure(episode);
  }, [onSelectEpisode]);

  const renderEpisodeButton = useCallback((episode: Episode) => {
    const isActive = Number(currentEpisode.id) === Number(episode.id);
    
    return (
      <Button
        key={episode.id}
        variant={isActive ? 'default' : 'outline'}
        className={cn(
          buttonSizeClass,
          "font-medium relative overflow-hidden",
          "transform transition-all duration-200",
          "hover:scale-105 active:scale-95",
          "touch-manipulation",
          "focus:ring-2 focus:ring-primary focus:ring-offset-2",
          isActive 
            ? "bg-primary text-primary-foreground shadow-md scale-105 z-10 ring-2 ring-primary ring-offset-2" 
            : "hover:bg-muted",
          className
        )}
        onClick={() => { if (!isActive) handleEpisodeSelect(episode); }}
        aria-label={`Select episode ${episode.id}`}
      >
        <span className="font-semibold">{episode.id}</span>
        
        {/* Active indicator */}
        {isActive && (
          <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-transparent pointer-events-none" />
        )}
      </Button>
    );
  }, [
    currentEpisode.id,
    buttonSizeClass,
    className,
    handleEpisodeSelect,
  ]);

  return (
    <Card className={cn("w-full shadow-lg rounded-lg", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline vietnamese-text">
          <Tv className="w-6 h-6 text-primary" />
          <span>Tập</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {/* Episode grid */}
        <div className={cn(
          "grid gap-2",
          gridClass
        )}>
          {episodes.map(renderEpisodeButton)}
        </div>
      </CardContent>
    </Card>
  );
}

function areEqual(prev: EpisodeSelectorProps, next: EpisodeSelectorProps) {
  const prevSelected = String(prev.currentEpisode?.id ?? "");
  const nextSelected = String(next.currentEpisode?.id ?? "");
  const sameSelected = prevSelected === nextSelected;

  const sameEpisodesRef = prev.episodes === next.episodes; // if you recreate arrays, consider shallow compare by ids
  const sameClass = prev.className === next.className;

  return sameSelected && sameEpisodesRef && sameClass;
}

// Apply performance optimizations
export const EpisodeSelector = withPerformanceOptimization(memo(EpisodeSelectorComponent, areEqual));
