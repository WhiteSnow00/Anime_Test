import { cn } from '@/lib/utils';

interface EpisodeTransitionToastProps {
  isVisible: boolean;
  fromEpisode?: string;
  toEpisode?: string;
  className?: string;
}

export function EpisodeTransitionToast({
  isVisible,
  fromEpisode,
  toEpisode,
  className
}: EpisodeTransitionToastProps) {
  if (!isVisible) return null;

  return (
    <div 
      className={cn(
        "fixed top-4 right-4 z-50 bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg p-3 transition-all duration-300",
        "animate-in slide-in-from-right-4 fade-in",
        isVisible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4",
        className
      )}
    >
      <div className="flex items-center space-x-2 text-sm">
        <div className="h-2 w-2 bg-primary rounded-full animate-pulse" />
        <span className="text-muted-foreground">
          Switching to {toEpisode}
        </span>
      </div>
    </div>
  );
}
