"use client";

import dynamic from 'next/dynamic';
import { Card, CardContent } from '@/components/ui/card';
import { Download } from 'lucide-react';

// Dynamically import the component to avoid SSR issues
const DownloadRedirectContent = dynamic(() => import('./DownloadRedirectContent'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-pink-50 dark:from-pink-950/20 dark:via-purple-950/20 dark:to-pink-950/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-md mx-auto shadow-xl">
        <CardContent className="p-6 text-center">
          <div className="w-16 h-16 mx-auto bg-gradient-to-r from-pink-100 to-purple-100 dark:from-pink-900/50 dark:to-purple-900/50 rounded-full flex items-center justify-center shadow-md">
            <Download className="w-8 h-8 text-pink-600 dark:text-pink-400 animate-pulse" />
          </div>
          <p className="mt-4 text-muted-foreground">Đang tải...</p>
        </CardContent>
      </Card>
    </div>
  )
});

export default function DownloadRedirectPage() {
  return <DownloadRedirectContent />;
}
