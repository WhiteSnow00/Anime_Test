"use client";

import { memo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Server, Play, Download, AlertCircle, CheckCircle, PackageOpen, HardDrive } from 'lucide-react';
import { withPerformanceOptimization } from '@/lib/higher-order-components';
import { triggerDownload, isValidDownloadUrl, openDropboxLink, openFolderRedirect, detectDownloadProvider, getDownloadProviderLabel } from '@/lib/download-utils';
import type { Episode } from '@/data/anime';
import { getServerStatus, ServerStatus, validateEpisodeServers, getServerReliabilityScore } from '@/lib/video-server-utils';

export type ServerType = string;

interface ServerSelectorProps {
  currentServer: ServerType;
  onServerChange: (server: ServerType) => void;
  currentEpisode?: Episode; 
  className?: string;
  serverStatus?: Record<string, ServerStatus>;
  folderUrl?: string;
}

const SERVER_CONFIG: Record<string, { name: string; label: string; color: string }> = {
  hls: {
    name: 'HLS Stream',
    label: 'HD Quality',
    color: 'bg-purple-500 hover:bg-purple-600',
  },
  helvid: {
    name: 'Helvid',
    label: 'HD Fast',
    color: 'bg-blue-500 hover:bg-blue-600',
  },
  hydax: {
    name: 'Hydax',
    label: 'HD Backup',
    color: 'bg-green-500 hover:bg-green-600',
  },
  hv: {
    name: 'Hv',
    label: 'HD Slow',
    color: 'bg-green-500 hover:bg-green-600',
  },
};

function getServerDisplayConfig(server: string) {
  return SERVER_CONFIG[server] ?? {
    name: server.charAt(0).toUpperCase() + server.slice(1),
    label: 'Server',
    color: 'bg-orange-500 hover:bg-orange-600',
  };
}

function ServerSelectorComponent({ 
  currentServer, 
  onServerChange,
  currentEpisode,
  className,
  serverStatus,
  folderUrl,
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

    const filename = `Tập ${currentEpisode.id}`;
    const provider = detectDownloadProvider(currentEpisode.downloadUrl);

    if (provider === 'dropbox') {
      openDropboxLink(currentEpisode.downloadUrl, filename, false, currentEpisode.id);
    } else if (provider === 'googleDrive') {
      // Open Google Drive link in new tab
      window.open(currentEpisode.downloadUrl, '_blank', 'noopener,noreferrer');
    } else {
      triggerDownload(currentEpisode.downloadUrl, filename);
    }
  }, [currentEpisode]);

  const handleRawDownload = useCallback(() => {
    if (!currentEpisode?.rawDownloadUrl) {
      console.warn('No raw download URL available for current episode');
      return;
    }

    if (!isValidDownloadUrl(currentEpisode.rawDownloadUrl)) {
      console.error('Invalid raw download URL:', currentEpisode.rawDownloadUrl);
      return;
    }

    const filename = `Tập ${currentEpisode.id} RAW`;
    const provider = detectDownloadProvider(currentEpisode.rawDownloadUrl);

    if (provider === 'dropbox') {
      openDropboxLink(currentEpisode.rawDownloadUrl, filename, true, currentEpisode.id);
    } else if (provider === 'googleDrive') {
      window.open(currentEpisode.rawDownloadUrl, '_blank', 'noopener,noreferrer');
    } else {
      triggerDownload(currentEpisode.rawDownloadUrl, filename);
    }
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
          {currentEpisode && Object.keys(currentEpisode.servers).map((server) => {
            const config = getServerDisplayConfig(server);
            const isActive = currentServer === server;
            const status = serverStatus?.[server] || getServerStatus(server);

            // Check server data validation
            const episodeValidation = validateEpisodeServers(currentEpisode);
            const isValidServer = episodeValidation[server] ?? true;
            const reliability = getServerReliabilityScore(server);

            if (!isValidServer) return null;

            return (
              <Button
                key={server}
                variant={isActive ? 'default' : 'outline'}
                className={cn(
                  "flex items-center gap-2 font-medium transition-all duration-200",
                  "hover:scale-105 active:scale-95 touch-manipulation",
                  "focus:ring-2 focus:ring-primary focus:ring-offset-2",
                  "text-xs sm:text-sm",
                  "px-3 py-2 sm:px-4 sm:py-2",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md scale-105"
                    : "hover:bg-muted",
                )}
                onClick={() => handleServerSelect(server)}
                aria-label={`Select ${config.name} server`}
              >
                {status === 'online' ? (
                  <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-500" />
                ) : status === 'error' || status === 'offline' ? (
                  <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 text-red-500" />
                ) : (
                  <Play className="w-3 h-3 sm:w-4 sm:h-4" />
                )}
                <div className="flex flex-col items-start">
                  <span className="text-xs sm:text-sm font-semibold">{config.name}</span>
                  <span className="text-xs opacity-75 hidden sm:block">{config.label}</span>
                </div>
              </Button>
            );
          })}

          {/* Per-episode Download Button */}
          {currentEpisode?.downloadUrl && (
            <Button
              variant="outline"
              className={cn(
                "flex items-center gap-2 font-medium transition-all duration-200",
                "hover:scale-105 active:scale-95 touch-manipulation",
                "focus:ring-2 focus:ring-primary focus:ring-offset-2",
                "text-xs sm:text-sm",
                "px-3 py-2 sm:px-4 sm:py-2",
                detectDownloadProvider(currentEpisode.downloadUrl) === 'googleDrive'
                  ? "bg-green-600 text-white hover:bg-green-700 border-green-600"
                  : detectDownloadProvider(currentEpisode.downloadUrl) === 'dropbox'
                  ? "bg-purple-500 text-white hover:bg-purple-600 border-purple-500"
                  : "bg-blue-500 text-white hover:bg-blue-600 border-blue-500",
              )}
              onClick={handleDownload}
              aria-label="Tải về anime sub"
            >
              {detectDownloadProvider(currentEpisode.downloadUrl) === 'googleDrive' ? (
                <HardDrive className="w-3 h-3 sm:w-4 sm:h-4" />
              ) : detectDownloadProvider(currentEpisode.downloadUrl) === 'dropbox' ? (
                <PackageOpen className="w-3 h-3 sm:w-4 sm:h-4" />
              ) : (
                <Download className="w-3 h-3 sm:w-4 sm:h-4" />
              )}
              <div className="flex flex-col items-start">
                <span className="text-xs sm:text-sm font-semibold">
                  {getDownloadProviderLabel(detectDownloadProvider(currentEpisode.downloadUrl))}
                </span>
                <span className="text-xs opacity-75 hidden sm:block">Sub</span>
              </div>
            </Button>
          )}

          {/* Raw Download Button */}
          {currentEpisode?.rawDownloadUrl && (
            <Button
              variant="outline"
              className={cn(
                "flex items-center gap-2 font-medium transition-all duration-200",
                "hover:scale-105 active:scale-95 touch-manipulation",
                "focus:ring-2 focus:ring-primary focus:ring-offset-2",
                "text-xs sm:text-sm",
                "px-3 py-2 sm:px-4 sm:py-2",
                detectDownloadProvider(currentEpisode.rawDownloadUrl) === 'googleDrive'
                  ? "bg-green-600 text-white hover:bg-green-700 border-green-600"
                  : detectDownloadProvider(currentEpisode.rawDownloadUrl) === 'dropbox'
                  ? "bg-gray-500 text-white hover:bg-gray-600 border-gray-500"
                  : "bg-gray-500 text-white hover:bg-gray-600 border-gray-500",
              )}
              onClick={handleRawDownload}
              aria-label="Tải về anime raw"
            >
              {detectDownloadProvider(currentEpisode.rawDownloadUrl) === 'googleDrive' ? (
                <HardDrive className="w-3 h-3 sm:w-4 sm:h-4" />
              ) : detectDownloadProvider(currentEpisode.rawDownloadUrl) === 'dropbox' ? (
                <PackageOpen className="w-3 h-3 sm:w-4 sm:h-4" />
              ) : (
                <Download className="w-3 h-3 sm:w-4 sm:h-4" />
              )}
              <div className="flex flex-col items-start">
                <span className="text-xs sm:text-sm font-semibold">
                  {getDownloadProviderLabel(detectDownloadProvider(currentEpisode.rawDownloadUrl))}
                </span>
                <span className="text-xs opacity-75 hidden sm:block">RAW</span>
              </div>
            </Button>
          )}
          {/* Always-visible Folder Button */}
          <Button
            variant="outline"
            className={cn(
              "flex items-center gap-2 font-medium transition-all duration-200",
              "hover:scale-105 active:scale-95 touch-manipulation",
              "focus:ring-2 focus:ring-primary focus:ring-offset-2",
              "text-xs sm:text-sm",
              "px-3 py-2 sm:px-4 sm:py-2",
              detectDownloadProvider(folderUrl || '') === 'googleDrive'
                ? "bg-green-600 text-white hover:bg-green-700 border-green-600"
                : detectDownloadProvider(folderUrl || '') === 'dropbox'
                ? "bg-blue-600 text-white hover:bg-blue-700 border-blue-600"
                : "bg-blue-600 text-white hover:bg-blue-700 border-blue-600"
            )}
            onClick={() => { if (folderUrl) { openFolderRedirect(folderUrl, getDownloadProviderLabel(detectDownloadProvider(folderUrl)) + ' (toàn bộ)', currentEpisode?.id); }}}
            aria-label="Mở thư mục chứa tất cả tập"
            disabled={!folderUrl}
            title={folderUrl ? 'Mở thư mục' : 'Chưa có link thư mục'}
          >
            {detectDownloadProvider(folderUrl || '') === 'googleDrive' ? (
              <HardDrive className="w-3 h-3 sm:w-4 sm:h-4" />
            ) : (
              <PackageOpen className="w-3 h-3 sm:w-4 sm:h-4" />
            )}
            <div className="flex flex-col items-start">
              <span className="text-xs sm:text-sm font-semibold">Tải về</span>
              <span className="text-xs opacity-75 hidden sm:block">
                {getDownloadProviderLabel(detectDownloadProvider(folderUrl || ''))} (toàn bộ)
              </span>
            </div>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export const ServerSelector = withPerformanceOptimization(memo(ServerSelectorComponent));
