"use client";

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Info, MessageCircle, User, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { AuthModal } from '@/components/auth-modal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";

interface MobileBottomNavProps {
  currentSection: string;
  onNavigate: (section: string) => void;
  onPreviousEpisode?: () => void;
  onNextEpisode?: () => void;
  canGoBack?: boolean;
  canGoNext?: boolean;
  enableScrollspy?: boolean;
}

export function MobileBottomNav({ 
  currentSection, 
  onNavigate, 
  onPreviousEpisode, 
  onNextEpisode,
  canGoBack = false,
  canGoNext = false,
  enableScrollspy = true
}: MobileBottomNavProps) {
  const { isLoggedIn, user, logout } = useAuth();
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);
  const [activeSection, setActiveSection] = useState(currentSection);
  const scrollspyTicking = useRef(false);

  // Scrollspy to track active section
  useEffect(() => {
    if (!enableScrollspy) {
      setActiveSection(currentSection);
      return;
    }

    const updateActiveSection = () => {
      const sections = ['video', 'info', 'comment'];
      const scrollY = window.pageYOffset || document.documentElement.scrollTop;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      
      // If near bottom of page, set to last section
      if (scrollY + windowHeight >= documentHeight - 100) {
        setActiveSection('comment');
        scrollspyTicking.current = false;
        return;
      }

      let currentActive = 'video'; // default
      let closestSection = { id: 'video', distance: Infinity };
      
      for (const sectionId of sections) {
        // Try multiple possible selectors for each section
        const selectors = [
          `#${sectionId}`,
          `[data-section="${sectionId}"]`,
          `[id*="${sectionId}"]`,
          `.${sectionId}-section`
        ];
        
        let element = null;
        for (const selector of selectors) {
          element = document.querySelector(selector);
          if (element) break;
        }
        
        if (element) {
          const rect = element.getBoundingClientRect();
          const elementTop = rect.top + scrollY;
          const elementHeight = rect.height;
          const elementCenter = elementTop + elementHeight / 2;
          const viewportCenter = scrollY + windowHeight / 2;
          
          // Calculate distance from viewport center to element center
          const distance = Math.abs(elementCenter - viewportCenter);
          
          // Check if section is in viewport
          const isInViewport = rect.top < windowHeight && rect.bottom > 0;
          
          if (isInViewport && distance < closestSection.distance) {
            closestSection = { id: sectionId, distance };
          }
          
          // Alternative method: check if section takes up significant viewport space
          const visibleHeight = Math.min(rect.bottom, windowHeight) - Math.max(rect.top, 0);
          const visiblePercentage = visibleHeight / windowHeight;
          
          if (visiblePercentage > 0.3) { // Section takes up more than 30% of viewport
            currentActive = sectionId;
            break;
          }
        }
      }
      
      // Use closest section if no section meets the visibility threshold
      if (closestSection.distance !== Infinity) {
        currentActive = closestSection.id;
      }
      
      setActiveSection(currentActive);
      scrollspyTicking.current = false;
    };

    const requestScrollspyTick = () => {
      if (!scrollspyTicking.current) {
        requestAnimationFrame(updateActiveSection);
        scrollspyTicking.current = true;
      }
    };

    const handleScrollspyScroll = () => requestScrollspyTick();

    // Initial check
    updateActiveSection();
    
    window.addEventListener('scroll', handleScrollspyScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScrollspyScroll);
    };
  }, [enableScrollspy, currentSection]);

  // Update active section when currentSection prop changes
  useEffect(() => {
    if (!enableScrollspy) {
      setActiveSection(currentSection);
    }
  }, [currentSection, enableScrollspy]);

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
                      activeSection === item.id && "text-primary bg-primary/10"
                    )}
                  >
                    <item.icon className="w-4 h-4" />
                    <span className="text-xs font-medium vietnamese-text truncate">
                      {item.label}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-48 mb-2">
                  <DropdownMenuItem 
                    onClick={handleLogout} 
                    className="cursor-pointer text-muted-foreground hover:text-destructive focus:text-destructive focus:bg-destructive/10 transition-colors"
                  >
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
                activeSection === item.id && "text-primary bg-primary/10"
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
