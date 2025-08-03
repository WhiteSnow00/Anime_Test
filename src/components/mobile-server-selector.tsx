"use client";

import React, { useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, AlertCircle, Download } from 'lucide-react';
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
  onRawDownload
}: MobileServerSelectorProps) {
  const servers: MobileServerType[] = ['hls', 'helvid', 'hydax'];

  const handleDownload = useCallback(() => {
    if (!currentEpisode?.downloadUrl) return;
    onDownload(currentEpisode.downloadUrl, `Tập ${currentEpisode.id}`);
  }, [currentEpisode, onDownload]);

  const handleRawDownload = useCallback(() => {
    if (!currentEpisode?.rawDownloadUrl) return;
    onRawDownload(currentEpisode.rawDownloadUrl, `Tập ${currentEpisode.id} RAW`);
  }, [currentEpisode, onRawDownload]);

  const isServerAvailable = (server: MobileServerType): boolean => {
    return Boolean(currentEpisode.servers[server as keyof typeof currentEpisode.servers]);
  };

  const getServerStatus = (server: MobileServerType): 'active' | 'available' | 'unavailable' => {
    if (!isServerAvailable(server)) return 'unavailable';
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
        <div className="grid grid-cols-3 gap-2">
          {servers.map((server) => {
            const config = MOBILE_SERVER_CONFIG[server];
            const status = getServerStatus(server);
            const Icon = config.icon;
            
            return (
              <Button
                key={server}
                variant={status === 'active' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  if (status !== 'unavailable') {
                    onServerChange(server);
                  }
                }}
                disabled={status === 'unavailable'}
                className={cn(
                  "h-auto p-1 flex flex-col items-center justify-center gap-1 transition-all duration-200 min-h-[3rem]",
                  status === 'active' && "ring-2 ring-primary",
                  status === 'unavailable' && "opacity-50 cursor-not-allowed"
                )}
              >
                <div className="flex items-center gap-1.5 w-full justify-center">
                  <div className={cn(
                    "w-1.5 h-1.5 rounded-full flex-shrink-0",
                    status === 'active' ? "bg-green-400" :
                    status === 'available' ? "bg-blue-400" : "bg-red-400"
                  )} />
                  <Icon className="h-3 w-3 flex-shrink-0" />
                  <span className="text-xs font-semibold text-center leading-tight">{config.name}</span>
                </div>
                
                {/* {status === 'active' && (
                  <div className="w-full text-center">
                    <Badge variant="secondary" className="text-xs py-0.5 px-1.5 h-auto text-[10px] leading-none">
                      Đang dùng
                    </Badge>
                  </div>
                )} */}
                
                {status === 'unavailable' && (
                  <div className="w-full text-center">
                    <div className="flex items-center justify-center gap-1">
                      <AlertCircle className="h-2.5 w-2.5 text-destructive flex-shrink-0" />
                      <span className="text-[10px] text-destructive leading-tight">Lỗi</span>
                    </div>
                  </div>
                )}
              </Button>
            );
          })}
        </div>

        {currentEpisode?.downloadUrl && (
          <Button
            variant="outline"
            className="w-full mt-3 flex items-center gap-2 bg-purple-500 text-white hover:bg-purple-600 border-purple-500"
            onClick={handleDownload}
            aria-label="Tải về anime sub"
          >
            <Download className="h-4 w-4" />
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

        {/* <div className="mt-3 text-xs text-muted-foreground text-center">
          <p>Chỉ dành cho thiết bị di động. Sử dụng PC để có thêm tùy chọn server.</p>
        </div> */}
      </CardContent>
    </Card>
  );
}
