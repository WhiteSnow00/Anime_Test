"use client";

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Clock, Video, AlertTriangle, ExternalLink } from 'lucide-react';
import { isH265Episode } from '@/data/anime';

export default function DownloadRedirectContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [countdown, setCountdown] = useState(5);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [isReturning, setIsReturning] = useState(false);

  const url = searchParams.get('url');
  const filename = searchParams.get('filename') || 'Tập';
  const type = searchParams.get('type') || 'download'; 
  const episodeId = parseInt(searchParams.get('episodeId') || '0');
  
  const isH265 = (type === 'folder' || type === "raw") ? false : isH265Episode(episodeId);

  const redirectToUrl = (targetUrl: string) => {
    setIsRedirecting(true);
    try {
      if (typeof window !== 'undefined' && targetUrl) {
        // Mark that we already redirected for this URL in this session
        const key = `redirected:${targetUrl}`;
        sessionStorage.setItem(key, '1');
      }
    } catch {}
    window.location.href = targetUrl;
  };

  useEffect(() => {
    // Detect browser back/forward navigation and immediately send user to index to avoid blank screens (iOS bfcache quirks)
    let shouldReturnToHome = false;
    let seenThisUrl = false;
    try {
      const nav = (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined);
      const isBackForward = nav?.type === 'back_forward';
      const key = url ? `redirected:${url}` : '';
      seenThisUrl = key ? sessionStorage.getItem(key) === '1' : false;
      if (isBackForward && seenThisUrl) {
        shouldReturnToHome = true;
      }
    } catch {}

    // Fallback for Safari bfcache: when coming back and page is restored from cache, force navigation to /
    const onPageShow = (e: PageTransitionEvent) => {
      try {
        if ((e as any).persisted && seenThisUrl) {
          setIsReturning(true);
          window.location.replace('/');
        }
      } catch {}
    };
    try { window.addEventListener('pageshow', onPageShow as any); } catch {}

    if (shouldReturnToHome) {
      setIsReturning(true);
      // Use full document navigation to avoid client-state glitches
      try { 
        window.location.replace('/');
        // Fallback: if navigation didn't happen promptly (iOS quirk), try a hard href
        setTimeout(() => {
          try { if (document.visibilityState === 'visible') { window.location.href = '/'; } } catch {}
        }, 400);
      } catch { /* noop */ }
      return () => { try { window.removeEventListener('pageshow', onPageShow as any); } catch {} };
    }

    if (!url || isReturning) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setTimeout(() => redirectToUrl(url), 500);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timer);
      try { window.removeEventListener('pageshow', onPageShow as any); } catch {}
    };
  }, [url, isReturning]);

  const handleManualRedirect = () => {
    if (url) {
      redirectToUrl(url);
    }
  };

  const handleGoBack = () => {
    router.back();
  };

  if (!url) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-pink-50 dark:from-pink-950/20 dark:via-purple-950/20 dark:to-pink-950/20 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-r from-pink-100/30 via-transparent to-purple-100/30 dark:from-pink-900/10 dark:via-transparent dark:to-purple-900/10" />
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-400 via-purple-400 to-pink-400" />

      <Card className="w-full max-w-md mx-auto shadow-xl border-pink-200/50 dark:border-pink-800/50 backdrop-blur-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-400 via-purple-400 to-pink-400" />
        
        <CardContent className="p-6 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 mx-auto bg-gradient-to-r from-pink-100 to-purple-100 dark:from-pink-900/50 dark:to-purple-900/50 rounded-full flex items-center justify-center shadow-md">
              <Download className="w-8 h-8 text-pink-600 dark:text-pink-400 animate-bounce" />
            </div>
            <h1 className="text-xl font-bold text-foreground vietnamese-text">
              Chuẩn Bị Tải Xuống
            </h1>
            <p className="text-sm text-muted-foreground">
              {type === 'raw' ? 'Phim RAW (Không phụ đề)' : type === 'folder' ? 'Thư mục Dropbox' : 'Phim có phụ đề'}: {filename}
            </p>
          </div>

          {isH265 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <h3 className="font-medium text-yellow-800 dark:text-yellow-200 vietnamese-text">
                    Lưu ý về định dạng video
                  </h3>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 leading-relaxed vietnamese-text">
                    Nếu bạn không thể xem video, hãy thử tải các phần mềm phát video bên ngoài ví dụ như{' '}
                    <span className="font-semibold">VLC</span> (Có sẵn trên iOS/Android/Windows/MacOS) hoặc các phần mềm tương tự.
                  </p>
                  <div className="flex items-center gap-2 text-xs text-yellow-600 dark:text-yellow-400">
                    <Video className="w-4 h-4" />
                    <span>Video được mã hóa H.265 để tối ưu dung lượng</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Countdown */}
          {!isRedirecting ? (
            <div className="text-center space-y-4">
              {isReturning ? (
                <>
                  <div className="flex items-center justify-center gap-2 text-lg font-semibold text-primary">
                    <ExternalLink className="w-5 h-5 animate-pulse" />
                    <span>Đang đưa bạn về trang chủ...</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-pink-500 to-purple-500 animate-pulse" style={{ width: '100%' }} />
                  </div>
                  <p className="text-sm text-muted-foreground">Vui lòng chờ trong giây lát</p>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-center gap-2 text-lg font-semibold text-primary">
                    <Clock className="w-5 h-5 animate-pulse" />
                    <span>Chuyển hướng sau {countdown} giây</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-1000 ease-linear"
                      style={{ width: `${((5 - countdown) / 5) * 100}%` }}
                    />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button
                      variant="outline"
                      onClick={handleGoBack}
                      className="flex-1 vietnamese-text"
                    >
                      Quay lại
                    </Button>
                    <Button
                      onClick={handleManualRedirect}
                      className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 vietnamese-text"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Tải ngay
                    </Button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-2 text-lg font-semibold text-green-600 dark:text-green-400">
                <ExternalLink className="w-5 h-5 animate-pulse" />
                <span>Đang chuyển hướng đến Dropbox...</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-green-500 to-emerald-500 animate-pulse" style={{ width: '100%' }} />
              </div>
              <p className="text-sm text-muted-foreground vietnamese-text">
                Vui lòng chờ trong giây lát...
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
