"use client";

import { Heart } from 'lucide-react';

interface MobileHeaderProps {
  title: string;
}

export function MobileHeader({ title }: MobileHeaderProps) {

  return (
    <header className="lg:hidden sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between px-4">
        {/* <div className="flex items-center gap-2">
          <Heart className="w-6 h-6 text-primary" />
          <h1 className="font-headline font-semibold text-lg truncate vietnamese-text">{title}</h1>
        </div> */}
        <div className="flex items-center gap-2">
          <h1 className="font-headline font-semibold text-lg truncate vietnamese-text bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-500 bg-clip-text text-transparent">KanaFansub</h1>
        </div>
      </div>
    </header>
  );
} 