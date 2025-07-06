"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Heart, Menu, Home, Info, List, Star } from 'lucide-react';

interface MobileHeaderProps {
  title: string;
  onNavigate?: (section: string) => void;
}

export function MobileHeader({ title, onNavigate }: MobileHeaderProps) {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { id: 'home', label: 'Trang Chủ', icon: Home },
    { id: 'episodes', label: 'Danh Sách Tập', icon: List },
    { id: 'info', label: 'Thông Tin', icon: Info },
    { id: 'rating', label: 'Đánh Giá', icon: Star },
  ];

  const handleMenuClick = (section: string) => {
    setIsOpen(false);
    onNavigate?.(section);
  };

  return (
    <header className="lg:hidden sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Heart className="w-6 h-6 text-primary" />
          <h1 className="font-headline font-semibold text-lg truncate">{title}</h1>
        </div>

        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Mở menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-72">
            <div className="flex flex-col space-y-4 mt-6">
              <div className="flex items-center gap-2 mb-4">
                <Heart className="w-8 h-8 text-primary" />
                <h2 className="font-headline font-bold text-xl">Ayaya Webpage</h2>
              </div>
              
              <nav className="space-y-2">
                {menuItems.map((item) => (
                  <Button
                    key={item.id}
                    variant="ghost"
                    className="w-full justify-start gap-3 h-12"
                    onClick={() => handleMenuClick(item.id)}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.label}
                  </Button>
                ))}
              </nav>

              <div className="mt-8 pt-6 border-t">
                <p className="text-sm text-muted-foreground text-center">
                  Made by Kana <Heart className="inline w-4 h-4 text-primary fill-current" />
                </p>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
} 