"use client";

import React, { useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, AlertCircle, Download, CloudDownload, PackageOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SimpleMobileServerType } from './simple-mobile-player';
import type { Episode } from '@/data/anime';

// Extended type to include HLS for mobile
export type MobileServerType = SimpleMobileServerType | 'hls';

interface MobileServerSelectorProps {
  currentServer: MobileServerType;
  onServerChange: (server: MobileServerType) => void;
  currentEpisode: Episode;
  className?: string;
  onDownload: (url: string, filename: string) => void;
  onRawDownload: (url: string, filename: string) => void;
  dropboxFolderUrl?: string;
}

const MOBILE_SERVER_CONFIG = {
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
} as const;

export function MobileServerSelector({
  currentServer,
  onServerChange,
  currentEpisode,
  className,
  onDownload,
  onRawDownload,
  dropboxFolderUrl
}: MobileServerSelectorProps) {
  const allServers: MobileServerType[] = ['hls', 'helvid', 'hydax'];

  const isServerAvailable = (server: MobileServerType): boolean => {
    return Boolean(currentEpisode.servers[server as keyof typeof currentEpisode.servers]);
  };

  // Filter servers to only show available ones
  const availableServers = allServers.filter(server => 
    isServerAvailable(server)
  );

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
              const config = MOBILE_SERVER_CONFIG[server];
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
            className="w-full mt-3 flex items-center gap-2 bg-purple-500 text-white hover:bg-purple-600 border-purple-500"
            onClick={handleDownload}
            aria-label="Tải về anime sub"
          >
            <PackageOpen className="h-4 w-4" />
            <span>Tải về (Sub)</span>
          </Button>
        )}
        {currentEpisode?.rawDownloadUrl && (
          <Button
            variant="outline"
            className="w-full mt-2 flex items-center gap-2 bg-gray-500 text-white hover:bg-gray-600 border-gray-500"
            onClick={handleRawDownload}
            aria-label="Tải về anime raw"
          >
            <Download className="h-4 w-4" />
            <span>Tải về (RAW)</span>
          </Button>
        )}
        {/* Always-visible Dropbox Folder button */}
        <Button
          variant="outline"
          className="w-full mt-2 mb-3 flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-700 border-blue-600"
          onClick={() => {
            if (!dropboxFolderUrl) return;
            try { window.open(dropboxFolderUrl, '_blank', 'noopener,noreferrer'); } catch {}
          }}
          aria-label="Mở thư mục Dropbox chứa tất cả tập"
          disabled={!dropboxFolderUrl}
          title={dropboxFolderUrl ? 'Mở thư mục Dropbox' : 'Chưa có link Dropbox'}
        >
          <PackageOpen className="h-4 w-4" />
          <span>Tải về (Dropbox - toàn bộ)</span>
        </Button>
        {/* <div className="mt-3 text-xs text-muted-foreground text-center">
          <p>Chỉ dành cho thiết bị di động. Sử dụng PC để có thêm tùy chọn server.</p>
        </div> */}
      </CardContent>
    </Card>
  );
}
