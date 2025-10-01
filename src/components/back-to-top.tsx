"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ArrowUp } from "lucide-react";

export function BackToTop() {
  const [visible, setVisible] = useState(false);
  const ticking = useRef(false);

  useEffect(() => {
    const onScroll = () => {
      if (ticking.current) return;
      ticking.current = true;
      requestAnimationFrame(() => {
        try {
          const doc = document.documentElement;
          const scrollY = window.pageYOffset || doc.scrollTop || 0;
          const scrollHeight = doc.scrollHeight;
          const viewport = window.innerHeight;
          const maxScrollable = Math.max(scrollHeight - viewport, 1);
          const ratio = scrollY / maxScrollable;
          setVisible(ratio >= 0.25);
        } finally {
          ticking.current = false;
        }
      });
    };

    // Initial check
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const handleClick = () => {
    try {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      window.scrollTo(0, 0);
    }
  };

  return (
    <div
      className={
        "fixed right-4 md:right-6 bottom-24 md:bottom-8 z-40 transition-opacity duration-300 " +
        (visible ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none")
      }
      // Add a bit of extra spacing for devices with home indicator (iOS)
      style={{ marginBottom: "env(safe-area-inset-bottom)" }}
      aria-hidden={!visible}
    >
      <Button
        type="button"
        size="icon"
        onClick={handleClick}
        aria-label="Lên đầu trang"
        className="h-10 w-10 rounded-full shadow-lg bg-gradient-to-r from-pink-400 via-fuchsia-400 to-purple-400 text-white hover:from-pink-500 hover:via-fuchsia-500 hover:to-purple-500"
      >
        <ArrowUp className="h-5 w-5" />
      </Button>
    </div>
  );
}

export default BackToTop;
