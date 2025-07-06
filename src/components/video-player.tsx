"use client";

import { Card } from '@/components/ui/card';

interface VideoPlayerProps {
  videoId: string;
}

export function VideoPlayer({ videoId }: VideoPlayerProps) {
  return (
    <Card className="w-full overflow-hidden shadow-lg rounded-lg">
      <div className="aspect-video bg-muted">
        <iframe
          key={videoId}
          width="1920"
          height="1080"
          src={`https://short.icu/${videoId}`}
          frameBorder="0"
          scrolling="no"
          allowFullScreen
          className="w-full h-full"
        ></iframe>
      </div>
    </Card>
  );
}
