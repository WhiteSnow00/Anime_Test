"use client";

import { Suspense } from 'react';
import DownloadRedirectContent from './DownloadRedirectContent';

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
