"use client";

import { Heart } from 'lucide-react';

interface MobileHeaderProps {
  title: string;
}

export function MobileHeader({ title }: MobileHeaderProps) {

  return (
    <header className="lg:hidden sticky top-0 z-50 w-full bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-12 items-center justify-between px-4">
        {/* <div className="flex items-center gap-2">
          <Heart className="w-6 h-6 text-primary" />
          <h1 className="font-headline font-semibold text-lg truncate vietnamese-text">{title}</h1>
        </div> */}
        <div className="flex items-center gap-2">
          <h1 className="font-headline font-semibold text-lg truncate vietnamese-text bg-gradient-to-r from-pink-400 via-fuchsia-400 to-purple-400 bg-clip-text text-transparent">KanaFansub</h1>
        </div>
      </div>
    </header>
  );
} 