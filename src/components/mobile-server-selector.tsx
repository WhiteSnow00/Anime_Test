"use client";

import React, { useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, AlertCircle, Download, CloudDownload, PackageOpen, HardDrive } from 'lucide-react';
import { openFolderRedirect, detectDownloadProvider, getDownloadProviderLabel } from '@/lib/download-utils';
import { cn } from '@/lib/utils';
import type { Episode } from '@/data/anime';

export type MobileServerType = string;

interface MobileServerSelectorProps {
  currentServer: MobileServerType;
  onServerChange: (server: MobileServerType) => void;
  currentEpisode: Episode;
  className?: string;
  onDownload: (url: string, filename: string) => void;
  onRawDownload: (url: string, filename: string) => void;
  folderUrl?: string;
}

const MOBILE_SERVER_CONFIG: Record<string, { name: string; description: string; icon: typeof Play; color: string; priority: number }> = {
  hls: {
    name: 'HLS',
    description: 'Server chính - tốc độ cao',
    icon: Play,
    color: 'bg-red-500',
    priority: 0,
  },
  helvid: {
    name: 'Helvid',
    description: 'Server dự phòng mobile',
    icon: Play,
    color: 'bg-blue-500',
    priority: 1,
  },
  hydax: {
    name: 'Hydax',
    description: 'Server dự phòng',
    icon: Play,
    color: 'bg-green-500',
    priority: 2,
  },
};

function getMobileServerConfig(server: string) {
  return MOBILE_SERVER_CONFIG[server] ?? {
    name: server.charAt(0).toUpperCase() + server.slice(1),
    description: 'Server',
    icon: Play,
    color: 'bg-orange-500',
    priority: 99,
  };
}

export function MobileServerSelector({
  currentServer,
  onServerChange,
  currentEpisode,
  className,
  onDownload,
  onRawDownload,
  folderUrl
}: MobileServerSelectorProps) {
  const availableServers = Object.keys(currentEpisode.servers || {});

  const handleDownload = useCallback(() => {
    if (!currentEpisode?.downloadUrl) return;
    onDownload(currentEpisode.downloadUrl, `Tập ${currentEpisode.id}`);
  }, [currentEpisode, onDownload]);

  const handleRawDownload = useCallback(() => {
    if (!currentEpisode?.rawDownloadUrl) return;
    onRawDownload(currentEpisode.rawDownloadUrl, `Tập ${currentEpisode.id} RAW`);
  }, [currentEpisode, onRawDownload]);

  const getServerStatus = (server: MobileServerType): 'active' | 'available' => {
    return server === currentServer ? 'active' : 'available';
  };

  return (
    <Card className={cn("w-full", className)} suppressHydrationWarning>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Play className="h-4 w-4" />
          Chọn Server
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0" suppressHydrationWarning>
        {availableServers.length === 0 ? (
          <div className="text-center py-4">
            <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Không có server khả dụng cho tập này
            </p>
          </div>
        ) : (
          <div className={cn(
            "grid gap-2",
            availableServers.length === 1 ? "grid-cols-1" :
            availableServers.length === 2 ? "grid-cols-2" : "grid-cols-3"
          )}>
            {availableServers.map((server) => {
              const config = getMobileServerConfig(server);
              const status = getServerStatus(server);
              const Icon = config.icon;

              return (
                <Button
                  key={server}
                  variant={status === 'active' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    onServerChange(server);
                  }}
                  className={cn(
                    "h-auto p-1 flex flex-col items-center justify-center gap-1 transition-all duration-200 min-h-[3rem]",
                    status === 'active' && "ring-2 ring-primary"
                  )}
                >
                  <div className="flex items-center gap-1.5 w-full justify-center">
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full flex-shrink-0",
                      status === 'active' ? "bg-green-400" : "bg-blue-400"
                    )} />
                    <Icon className="h-3 w-3 flex-shrink-0" />
                    <span className="text-xs font-semibold text-center leading-tight">{config.name}</span>
                  </div>
                </Button>
              );
            })}
          </div>
        )}

        {currentEpisode?.downloadUrl && (
          <Button
            variant="outline"
            className={cn(
              "w-full mt-3 flex items-center gap-2",
              detectDownloadProvider(currentEpisode.downloadUrl) === 'googleDrive'
                ? "bg-green-600 text-white hover:bg-green-700 border-green-600"
                : detectDownloadProvider(currentEpisode.downloadUrl) === 'dropbox'
                ? "bg-purple-500 text-white hover:bg-purple-600 border-purple-500"
                : "bg-blue-500 text-white hover:bg-blue-600 border-blue-500"
            )}
            onClick={handleDownload}
            aria-label="Tải về anime sub"
          >
            {detectDownloadProvider(currentEpisode.downloadUrl) === 'googleDrive' ? (
              <HardDrive className="h-4 w-4" />
            ) : detectDownloadProvider(currentEpisode.downloadUrl) === 'dropbox' ? (
              <PackageOpen className="h-4 w-4" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            <span>{getDownloadProviderLabel(detectDownloadProvider(currentEpisode.downloadUrl))} (Sub)</span>
          </Button>
        )}
        {currentEpisode?.rawDownloadUrl && (
          <Button
            variant="outline"
            className={cn(
              "w-full mt-2 flex items-center gap-2",
              detectDownloadProvider(currentEpisode.rawDownloadUrl) === 'googleDrive'
                ? "bg-green-600 text-white hover:bg-green-700 border-green-600"
                : detectDownloadProvider(currentEpisode.rawDownloadUrl) === 'dropbox'
                ? "bg-gray-500 text-white hover:bg-gray-600 border-gray-500"
                : "bg-gray-500 text-white hover:bg-gray-600 border-gray-500"
            )}
            onClick={handleRawDownload}
            aria-label="Tải về anime raw"
          >
            {detectDownloadProvider(currentEpisode.rawDownloadUrl) === 'googleDrive' ? (
              <HardDrive className="h-4 w-4" />
            ) : detectDownloadProvider(currentEpisode.rawDownloadUrl) === 'dropbox' ? (
              <PackageOpen className="h-4 w-4" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            <span>{getDownloadProviderLabel(detectDownloadProvider(currentEpisode.rawDownloadUrl))} (RAW)</span>
          </Button>
        )}
        {/* Always-visible Folder button */}
        <Button
          variant="outline"
          className={cn(
            "w-full mt-2 mb-3 flex items-center gap-2",
            detectDownloadProvider(folderUrl || '') === 'googleDrive'
              ? "bg-green-600 text-white hover:bg-green-700 border-green-600"
              : "bg-blue-600 text-white hover:bg-blue-700 border-blue-600"
          )}
          onClick={() => { if (folderUrl) { openFolderRedirect(folderUrl, getDownloadProviderLabel(detectDownloadProvider(folderUrl)) + ' (toàn bộ)', currentEpisode?.id); }}}
          aria-label="Mở thư mục chứa tất cả tập"
          disabled={!folderUrl}
          title={folderUrl ? 'Mở thư mục' : 'Chưa có link thư mục'}
        >
          {detectDownloadProvider(folderUrl || '') === 'googleDrive' ? (
            <HardDrive className="h-4 w-4" />
          ) : (
            <PackageOpen className="h-4 w-4" />
          )}
          <span>Tải về ({getDownloadProviderLabel(detectDownloadProvider(folderUrl || ''))} - toàn bộ)</span>
        </Button>
        {/* <div className="mt-3 text-xs text-muted-foreground text-center">
          <p>Chỉ dành cho thiết bị di động. Sử dụng PC để có thêm tùy chọn server.</p>
        </div> */}
      </CardContent>
    </Card>
  );
}
