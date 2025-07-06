"use client";

import { Card } from '@/components/ui/card';

interface VideoPlayerProps {
  videoId: string;
}

export function VideoPlayer({ videoId }: VideoPlayerProps) {
  return (
    <Card className="w-full overflow-hidden shadow-lg rounded-lg">
      <div className="aspect-video bg-muted relative">
        <iframe
          key={videoId}
          width="1920"
          height="1080"
          src={`https://short.icu/${videoId}`}
          frameBorder="0"
          scrolling="no"
          allowFullScreen
          className="w-full h-full touch-manipulation"
          style={{
            border: 'none',
            outline: 'none'
          }}
        ></iframe>
        
        {/* Mobile Controls Overlay (if needed) */}
        <div className="lg:hidden absolute inset-0 pointer-events-none">
          <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-auto">
            {/* Video title could go here */}
          </div>
        </div>
      </div>
    </Card>
  );
}
