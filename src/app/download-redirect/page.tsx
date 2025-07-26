"use client";

import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState, Suspense } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Clock, ExternalLink } from 'lucide-react';

function DownloadRedirectContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [countdown, setCountdown] = useState(5);
  
  const url = searchParams.get('url');
  const filename = searchParams.get('filename') || 'Tập';

  useEffect(() => {
    if (!url) {
      router.push('/');
      return;
    }

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setTimeout(() => {
            window.location.href = url;
          }, 500);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [url, router]);

  if (!url) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Đang chuyển hướng...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-pink-50 dark:from-pink-950/20 dark:via-purple-950/20 dark:to-pink-950/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto shadow-xl">
        <CardContent className="p-6 text-center">
          <div className="w-16 h-16 mx-auto bg-gradient-to-r from-pink-100 to-purple-100 dark:from-pink-900/50 dark:to-purple-900/50 rounded-full flex items-center justify-center shadow-md">
            <Download className="w-8 h-8 text-pink-600 dark:text-pink-400" />
          </div>
          
          <h2 className="text-xl font-bold text-foreground mt-4">
            Đang tải xuống {filename}
          </h2>
          
          <div className="mt-4 p-3 bg-muted rounded-lg">
            <div className="flex items-center justify-center text-primary">
              <Clock className="w-4 h-4 mr-2" />
              <span className="font-bold text-lg">{countdown}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Tự động chuyển hướng sau {countdown} giây
            </p>
          </div>

          <Button 
            onClick={() => window.location.href = url}
            className="w-full mt-4 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700"
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Tải ngay
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
        <p className="mt-2 text-muted-foreground">Đang tải...</p>
      </div>
    </div>
  );
}

export default function DownloadRedirectPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <DownloadRedirectContent />
    </Suspense>
  );
}
