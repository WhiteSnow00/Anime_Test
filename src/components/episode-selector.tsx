"use client";

import { memo, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { Episode } from '@/data/anime';
import { cn } from '@/lib/utils';
import { Tv } from 'lucide-react';
import { useViewport } from '@/hooks/use-viewport';
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
  const viewport = useViewport();

  // Responsive grid calculation
  const gridConfig = useMemo(() => {
    const { width, isMobile, isTablet } = viewport;
    
    if (isMobile) {
      return {
        columns: width < 400 ? 4 : 5,
        className: "grid-cols-4 sm:grid-cols-5",
        buttonSize: "h-10 w-full text-xs",
      };
    } else if (isTablet) {
      return {
        columns: 8,
        className: "grid-cols-6 md:grid-cols-8",
        buttonSize: "h-12 w-full text-sm",
      };
    } else {
      return {
        columns: width > 1600 ? 15 : width > 1200 ? 12 : 10,
        className: "grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 2xl:grid-cols-15",
        buttonSize: "h-12 w-full text-sm",
      };
    }
  }, [viewport]);

  // Enhanced episode selection with performance optimization
  const handleEpisodeSelect = useCallback(
    fp.compose(
      fp.debounce,
      (episode: Episode) => {
        // Performance measurement
        const measure = performanceUtils.measure((ep: Episode) => {
          onSelectEpisode(ep);
        }, 'Episode Selection');
        
        measure(episode);
      }
    ),
    [onSelectEpisode]
  );

  // Memoized episode button renderer
  const renderEpisodeButton = useCallback((episode: Episode) => {
    const isActive = currentEpisode.id === episode.id;
    
    return (
      <Button
        key={episode.id}
        variant={isActive ? 'default' : 'outline'}
        className={cn(
          gridConfig.buttonSize,
          "font-medium relative overflow-hidden",
          "transform transition-all duration-200",
          "hover:scale-105 active:scale-95",
          "touch-manipulation",
          "focus:ring-2 focus:ring-primary focus:ring-offset-2",
          isActive 
            ? "bg-primary text-primary-foreground shadow-md scale-105 z-10" 
            : "hover:bg-muted",
          className
        )}
        onClick={() => handleEpisodeSelect(episode)}
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
    gridConfig.buttonSize,
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
          gridConfig.className
        )}>
          {episodes.map(renderEpisodeButton)}
        </div>
      </CardContent>
    </Card>
  );
}

// Apply performance optimizations
export const EpisodeSelector = withPerformanceOptimization(memo(EpisodeSelectorComponent));
