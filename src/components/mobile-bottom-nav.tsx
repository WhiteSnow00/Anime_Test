"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Info, MessageCircle, User, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { AuthModal } from '@/components/auth-modal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

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
  const { isLoggedIn, user, logout } = useAuth();
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);

  const navItems = [
    { id: 'video', label: 'Video', icon: Play },
    { id: 'info', label: 'Thông tin', icon: Info },
    { id: 'comment', label: 'Bình luận', icon: MessageCircle },
    { id: 'login', label: isLoggedIn ? user?.username : 'Đăng nhập', icon: User }
  ];

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-t">
      {/* Main Navigation */}
      <div className="flex items-center justify-around py-2">
        {navItems.map((item) => {
          // For login item when user is logged in, use dropdown
          if (item.id === 'login' && isLoggedIn) {
            return (
              <DropdownMenu key={item.id}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "flex flex-col items-center gap-1 h-auto py-2 px-2 min-w-0 flex-1",
                      currentSection === item.id && "text-primary bg-primary/10"
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    <span className="text-xs font-medium vietnamese-text truncate">
                      {item.label}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-48">
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                    <LogOut className="h-4 w-4 mr-2" />
                    Đăng xuất
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            );
          }

          // Regular buttons for other items and login when not logged in
          return (
            <Button
              key={item.id}
              variant="ghost"
              size="sm"
              onClick={() => item.id === 'login' ? setAuthModalOpen(true) : onNavigate(item.id)}
              className={cn(
                "flex flex-col items-center gap-1 h-auto py-2 px-2 min-w-0 flex-1",
                currentSection === item.id && "text-primary bg-primary/10"
              )}
            >
              <item.icon className="w-4 h-4" />
              <span className="text-xs font-medium vietnamese-text truncate">{item.label}</span>
            </Button>
          );
        })}
      </div>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
    </div>
  );
}
