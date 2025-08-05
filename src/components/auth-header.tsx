"use client";

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { LogIn, User, LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { AuthModal } from './auth-modal';
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
  const pathname = usePathname();

  // Don't show auth header on admin routes
  if (pathname?.includes('/comment') || pathname?.includes('/admin')) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="fixed top-4 right-4 z-50">
        <Button variant="ghost" size="sm" disabled>
          <User className="h-4 w-4" />
        </Button>
      </div>
    );
  }

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
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowAuthModal(true)}
            className="shadow-md"
          >
            <LogIn className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Đăng nhập</span>
          </Button>
        )}
      </div>

      <AuthModal
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
      />
    </>
  );
}
