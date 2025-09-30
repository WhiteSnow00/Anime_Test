/**
 * Resume Debug Panel
 * 
 * Development-only component to debug resume memory feature
 * Shows current state of storage and allows manual testing
 */

"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { 
  getUserId, 
  getLastEpisode, 
  getProgress,
  setLastEpisode,
  setProgress,
  clearProgress,
  hasSessionRedirected,
  markSessionRedirected,
} from '@/lib/resume-storage';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { isFeatureEnabled } from '@/lib/feature-flags';

export function ResumeDebugPanel({ currentEpisodeId }: { currentEpisodeId?: number }) {
  const { user } = useAuth();
  const [lastEpisode, setLastEpisodeState] = useState<any>(null);
  const [progressData, setProgressData] = useState<any>(null);
  const [sessionRedirected, setSessionRedirected] = useState(false);
  const [userId, setUserId] = useState('');

  const refresh = () => {
    const uid = getUserId(user);
    setUserId(uid);
    
    const last = getLastEpisode(uid);
    setLastEpisodeState(last);
    
    // Get progress for episodes 1-12
    const progress: any = {};
    for (let i = 1; i <= 12; i++) {
      const p = getProgress(uid, i);
      if (p) {
        progress[i] = p;
      }
    }
    setProgressData(progress);
    
    setSessionRedirected(hasSessionRedirected());
  };

  useEffect(() => {
    refresh();

    // Refresh every 2 seconds
    const interval = setInterval(refresh, 2000);
    return () => clearInterval(interval);
  }, [user]);

  // Expose debug functions to window for console access
  useEffect(() => {
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
      (window as any).resumeDebug = {
        refresh,
        getStorage: () => ({
          lastEpisode: getLastEpisode(userId),
          progress: (() => {
            const result: any = {};
            for (let i = 1; i <= 12; i++) {
              const p = getProgress(userId, i);
              if (p) result[i] = p;
            }
            return result;
          })(),
          sessionRedirected: hasSessionRedirected(),
        }),
        clearAll: () => {
          localStorage.clear();
          sessionStorage.clear();
          refresh();
          console.info('[resume-debug] All storage cleared');
        },
        saveEpisode: (epId: number) => {
          setLastEpisode(userId, epId, epId);
          refresh();
          console.info('[resume-debug] Saved episode:', epId);
        },
        saveProgress: (epId: number, time: number) => {
          setProgress(userId, epId, { time, declined: false });
          refresh();
          console.info('[resume-debug] Saved progress:', { epId, time });
        },
      };
      console.info('[resume-debug] Debug functions available: window.resumeDebug');
    }
  }, [userId, refresh]);

  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <Card className="fixed bottom-4 right-4 w-96 max-h-96 overflow-auto z-50 bg-background/95 backdrop-blur">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm">Resume Debug Panel</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-xs">
        <div>
          <div className="font-semibold mb-1">Feature Flags:</div>
          <div className="space-y-1 text-muted-foreground">
            <div>RESUME_FEATURE_ENABLED: {isFeatureEnabled('RESUME_FEATURE_ENABLED') ? '✅' : '❌'}</div>
            <div>RESUME_PROMPT_ENABLED: {isFeatureEnabled('RESUME_PROMPT_ENABLED') ? '✅' : '❌'}</div>
            <div>RESUME_AUTO_NAVIGATE_ENABLED: {isFeatureEnabled('RESUME_AUTO_NAVIGATE_ENABLED') ? '✅' : '❌'}</div>
          </div>
        </div>

        <div>
          <div className="font-semibold mb-1">User ID:</div>
          <div className="text-muted-foreground">{userId}</div>
        </div>

        <div>
          <div className="font-semibold mb-1">Current Episode:</div>
          <div className="text-muted-foreground">{currentEpisodeId || 'Unknown'}</div>
        </div>

        <div>
          <div className="font-semibold mb-1">Session Redirected:</div>
          <div className="text-muted-foreground">{sessionRedirected ? 'Yes' : 'No'}</div>
        </div>

        <div>
          <div className="font-semibold mb-1">Last Episode:</div>
          {lastEpisode ? (
            <div className="text-muted-foreground">
              <div>Episode: {lastEpisode.episodeNumber}</div>
              <div>ID: {lastEpisode.episodeId}</div>
              <div>Updated: {new Date(lastEpisode.updatedAt).toLocaleTimeString()}</div>
            </div>
          ) : (
            <div className="text-muted-foreground">None</div>
          )}
        </div>

        <div>
          <div className="font-semibold mb-1">Progress Data:</div>
          {Object.keys(progressData || {}).length > 0 ? (
            <div className="space-y-1 text-muted-foreground max-h-32 overflow-auto">
              {Object.entries(progressData).map(([ep, data]: [string, any]) => {
                const isCurrent = currentEpisodeId && parseInt(ep) === currentEpisodeId;
                return (
                  <div
                    key={ep}
                    className={`border-l-2 pl-2 ${isCurrent ? 'border-green-500 bg-green-500/10' : 'border-primary/50'}`}
                  >
                    <div className="font-medium">
                      Episode {ep} {isCurrent && '← CURRENT'}
                    </div>
                    <div className="text-xs">Time: {Math.floor(data.time)}s ({Math.floor(data.time / 60)}:{String(Math.floor(data.time % 60)).padStart(2, '0')})</div>
                    <div className="text-xs">
                      Declined: {data.declined ? 'Yes' : 'No'}
                    </div>
                    <div className="text-xs opacity-50">
                      Updated: {new Date(data.updatedAt).toLocaleTimeString()}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-muted-foreground">None</div>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <Button size="sm" variant="outline" onClick={refresh}>
            Refresh
          </Button>
          <Button 
            size="sm" 
            variant="destructive" 
            onClick={() => {
              localStorage.clear();
              sessionStorage.clear();
              refresh();
            }}
          >
            Clear All
          </Button>
        </div>

        <div className="flex gap-2">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => {
              setLastEpisode(userId, 5, 5);
              refresh();
            }}
          >
            Test: Set Ep 5
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => {
              setProgress(userId, 1, { time: 120, declined: false });
              refresh();
            }}
          >
            Test: Set Progress
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

