"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SimpleMobileServerType } from './simple-mobile-player';
import type { Episode } from '@/data/anime';

interface MobileServerSelectorProps {
  currentServer: SimpleMobileServerType;
  onServerChange: (server: SimpleMobileServerType) => void;
  currentEpisode: Episode;
  className?: string;
}

const MOBILE_SERVER_CONFIG = {
  helvid: {
    name: 'Helvid',
    description: 'Server chính cho mobile',
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
  className
}: MobileServerSelectorProps) {
  const servers: SimpleMobileServerType[] = ['helvid', 'hydax'];

  const isServerAvailable = (server: SimpleMobileServerType): boolean => {
    return Boolean(currentEpisode.servers[server]);
  };

  const getServerStatus = (server: SimpleMobileServerType): 'active' | 'available' | 'unavailable' => {
    if (!isServerAvailable(server)) return 'unavailable';
    return server === currentServer ? 'active' : 'available';
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Play className="h-4 w-4" />
          Chọn Server (Mobile)
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="grid grid-cols-2 gap-2">
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
                  "h-auto p-3 flex flex-col items-center gap-2 transition-all duration-200",
                  status === 'active' && "ring-2 ring-primary",
                  status === 'unavailable' && "opacity-50 cursor-not-allowed"
                )}
              >
                <div className="flex items-center gap-2 w-full">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    status === 'active' ? "bg-green-400" :
                    status === 'available' ? "bg-blue-400" : "bg-red-400"
                  )} />
                  <Icon className="h-3 w-3" />
                  <span className="text-xs font-medium truncate">{config.name}</span>
                </div>
                
                <div className="w-full text-center">
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {config.description}
                  </p>
                  {status === 'active' && (
                    <Badge variant="secondary" className="mt-1 text-xs">
                      Đang sử dụng
                    </Badge>
                  )}
                  {status === 'unavailable' && (
                    <div className="flex items-center justify-center gap-1 mt-1">
                      <AlertCircle className="h-3 w-3 text-destructive" />
                      <span className="text-xs text-destructive">Không khả dụng</span>
                    </div>
                  )}
                </div>
              </Button>
            );
          })}
        </div>
        
        <div className="mt-3 text-xs text-muted-foreground text-center">
          <p>Chỉ dành cho thiết bị di động. Sử dụng PC để có thêm tùy chọn server.</p>
        </div>
      </CardContent>
    </Card>
  );
}
