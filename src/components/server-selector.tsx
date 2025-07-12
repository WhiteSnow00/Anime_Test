"use client";

import { memo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Server, Play, Download } from 'lucide-react';
import { withPerformanceOptimization } from '@/lib/higher-order-components';
import { triggerDownload, isValidDownloadUrl } from '@/lib/download-utils';
import type { Episode } from '@/data/anime';

export type ServerType = 'hydax' | 'mxdrop';

interface ServerSelectorProps {
  currentServer: ServerType;
  onServerChange: (server: ServerType) => void;
  currentEpisode?: Episode; 
  className?: string;
}

const serverConfig = {
  hydax: {
    name: 'Hydax',
    label: 'HD Fast',
    color: 'bg-blue-500 hover:bg-blue-600',
  },
  mxdrop: {
    name: 'MxDrop',
    label: 'HD Backup',
    color: 'bg-green-500 hover:bg-green-600',
  },
};

function ServerSelectorComponent({ 
  currentServer, 
  onServerChange,
  currentEpisode,
  className,
}: ServerSelectorProps) {
  const handleServerSelect = useCallback((server: ServerType) => {
    onServerChange(server);
  }, [onServerChange]);

  const handleDownload = useCallback(() => {
    if (!currentEpisode?.downloadUrl) {
      console.warn('No download URL available for current episode');
      return;
    }

    if (!isValidDownloadUrl(currentEpisode.downloadUrl)) {
      console.error('Invalid download URL:', currentEpisode.downloadUrl);
      return;
    }

    const filename = `${currentEpisode.title || `Episode ${currentEpisode.id}`}.mp4`;
    triggerDownload(currentEpisode.downloadUrl, filename);
  }, [currentEpisode]);

  return (
    <Card className={cn("w-full shadow-lg rounded-lg", className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-headline vietnamese-text">
          <Server className="w-5 h-5 text-primary" />
          <span>Máy Chủ</span>
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="flex gap-2 sm:gap-3 flex-wrap">
          {/* Server Selection Buttons */}
          {(Object.keys(serverConfig) as ServerType[]).map((server) => {
            const config = serverConfig[server];
            const isActive = currentServer === server;
            
            return (
              <Button
                key={server}
                variant={isActive ? 'default' : 'outline'}
                className={cn(
                  "flex items-center gap-2 font-medium transition-all duration-200",
                  "hover:scale-105 active:scale-95 touch-manipulation",
                  "focus:ring-2 focus:ring-primary focus:ring-offset-2",
                  "text-xs sm:text-sm", // Responsive text size
                  "px-3 py-2 sm:px-4 sm:py-2", // Responsive padding
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-md scale-105" 
                    : "hover:bg-muted",
                )}
                onClick={() => handleServerSelect(server)}
                aria-label={`Select ${config.name} server`}
              >
                <Play className="w-3 h-3 sm:w-4 sm:h-4" />
                <div className="flex flex-col items-start">
                  <span className="text-xs sm:text-sm font-semibold">{config.name}</span>
                  <span className="text-xs opacity-75 hidden sm:block">{config.label}</span>
                </div>
              </Button>
            );
          })}

          {/* Download Button */}
          {currentEpisode?.downloadUrl && (
            <Button
              variant="outline"
              className={cn(
                "flex items-center gap-2 font-medium transition-all duration-200",
                "hover:scale-105 active:scale-95 touch-manipulation",
                "focus:ring-2 focus:ring-primary focus:ring-offset-2",
                "text-xs sm:text-sm", // Responsive text size
                "px-3 py-2 sm:px-4 sm:py-2", // Responsive padding
                "bg-purple-500 text-white hover:bg-purple-600 border-purple-500",
              )}
              onClick={handleDownload}
              aria-label="Download episode"
            >
              <Download className="w-3 h-3 sm:w-4 sm:h-4" />
              <div className="flex flex-col items-start">
                <span className="text-xs sm:text-sm font-semibold">Download</span>
                <span className="text-xs opacity-75 hidden sm:block">HD File</span>
              </div>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export const ServerSelector = withPerformanceOptimization(memo(ServerSelectorComponent));
