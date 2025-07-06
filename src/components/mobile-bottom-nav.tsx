"use client";

import { Button } from '@/components/ui/button';
import { Play, List, Info, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileBottomNavProps {
  currentSection: string;
  onNavigate: (section: string) => void;
  onPreviousEpisode?: () => void;
  onNextEpisode?: () => void;
  canGoBack?: boolean;
  canGoNext?: boolean;
}

export function MobileBottomNav({ 
  currentSection, 
  onNavigate, 
  onPreviousEpisode, 
  onNextEpisode,
  canGoBack = false,
  canGoNext = false 
}: MobileBottomNavProps) {
  const navItems = [
    { id: 'video', label: 'Video', icon: Play },
    { id: 'episodes', label: 'Tập', icon: List },
    { id: 'info', label: 'Thông tin', icon: Info },
  ];

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t">
      {/* Episode Navigation */}
      <div className="flex items-center justify-between px-4 py-2 border-b">
        <Button
          variant="ghost"
          size="sm"
          onClick={onPreviousEpisode}
          disabled={!canGoBack}
          className={cn(
            "flex items-center gap-2",
            !canGoBack && "opacity-50 cursor-not-allowed"
          )}
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="vietnamese-text">Tập trước</span>
        </Button>

        <div className="text-sm font-medium text-center">
          <span className="text-muted-foreground vietnamese-text">Điều hướng tập</span>
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={onNextEpisode}
          disabled={!canGoNext}
          className={cn(
            "flex items-center gap-2",
            !canGoNext && "opacity-50 cursor-not-allowed"
          )}
        >
          <span className="vietnamese-text">Tập sau</span>
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Main Navigation */}
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => (
          <Button
            key={item.id}
            variant="ghost"
            size="sm"
            onClick={() => onNavigate(item.id)}
            className={cn(
              "flex flex-col items-center gap-1 h-auto py-2 px-3 min-w-0",
              currentSection === item.id && "text-primary bg-primary/10"
            )}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-xs font-medium vietnamese-text">{item.label}</span>
          </Button>
        ))}
      </div>
    </div>
  );
} 