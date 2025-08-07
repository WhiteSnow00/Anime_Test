"use client";

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LogIn, User, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { AuthModal } from './auth-modal';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function AuthHeader() {
  const { isLoggedIn, user, logout, isLoading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const pathname = usePathname();

  // Check if user is on mobile device
  useEffect(() => {
    const checkMobile = () => {
      if (typeof window === 'undefined') return true; 
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isMobileUserAgent = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const hasTouchCapability = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const smallScreen = window.innerWidth <= 1024;
      if (isIOS) return true;
      return isMobileUserAgent || (hasTouchCapability && smallScreen);
    };
      const timer = setTimeout(() => {
      setIsMobile(checkMobile());
    }, 100);
    
    const handleResize = () => {
      setIsMobile(checkMobile());
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  if (isMobile) {
    return null;
  }
    if (pathname?.includes('/comment') || pathname?.includes('/admin')) {
      return null;
    }

    if (isLoading) {
      return (
        <div className="fixed top-4 right-1 z-50">
          <Button variant="ghost" size="sm" disabled>
            <User className="h-4 w-4" />
          </Button>
        </div>
      );
    }

    const handleCloseModal = () => {
      setShowAuthModal(false);
    };

  return (
    <>
      <div className="fixed top-4 right-1 z-50">
        {isLoggedIn && user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="sm" className="shadow-md">
                <User className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">{user.username}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48">
              <DropdownMenuLabel>Xin chào, {user.username}!</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="cursor-pointer">
                <LogOut className="h-4 w-4 mr-2" />
                Đăng xuất
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
!showAuthModal && (
            <AnimatePresence>
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 50 }}
                transition={{ duration: 0.3 }}
              >
                <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowAuthModal(true)}
              className="shadow-md"
            >
              <LogIn className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Đăng nhập</span>
</Button>
              </motion.div>
            </AnimatePresence>
          )
        )}
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={handleCloseModal}
      />
    </>
  );
}
