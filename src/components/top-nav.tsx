"use client";

import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { AuthModal } from "@/components/auth-modal";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogIn, LogOut, User } from "lucide-react";

export function TopNav() {
  const { isLoggedIn, user, logout, isLoading } = useAuth();
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <>
      <nav
        className="hidden md:block z-50 w-full bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60"
        aria-label="KanaFansub top navigation"
      >
        <div className="mx-auto w-full max-w-7xl px-3 sm:px-4">
          <div className="h-12 md:h-14 flex items-center justify-between px-2">
            {/* Brand */}
            <button
              type="button"
              onClick={() => {
                try { window.scrollTo({ top: 0, behavior: "smooth" }); } catch {}
              }}
              className="select-none text-base md:text-xl font-extrabold tracking-tight bg-gradient-to-r from-pink-400 via-fuchsia-400 to-purple-400 bg-clip-text text-transparent"
              aria-label="KanaFansub"
            >
              KanaFansub
            </button>

            {/* Auth controls */}
            <div className="flex items-center gap-2">
              {isLoading ? (
                <Button variant="ghost" size="sm" disabled aria-label="Đang tải tài khoản">
                  <User className="h-4 w-4" />
                </Button>
              ) : isLoggedIn && user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="secondary" size="sm" className="shadow-sm">
                      <User className="h-4 w-4 mr-2" />
                      <span className="hidden sm:inline">{user.username}</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
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
                  className="shadow-sm"
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Đăng nhập</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </nav>

      <AuthModal isOpen={showAuthModal} onClose={() => setShowAuthModal(false)} />
    </>
  );
}

export default TopNav;
