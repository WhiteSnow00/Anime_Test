"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Download,
  Clock,
  Video,
  AlertTriangle,
  ExternalLink,
} from "lucide-react";
import { isH265Episode } from "@/data/anime";
import { set } from "mongoose";
import { clearEpisodePosition } from "@/lib/download-utils";

export default function DownloadRedirectContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [countdown, setCountdown] = useState(5);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const url = searchParams.get("url");
  const filename = searchParams.get("filename") || "Tập";
  const type = searchParams.get("type") || "download";
  const episodeId = parseInt(searchParams.get("episodeId") || "0");

  const isH265 =
    type === "raw" || type === "folder" ? false : isH265Episode(episodeId);
  const isFolder = type === "folder";

  const isBackForwardRef = useRef(false);

  const startRedirect = (targetUrl: string) => {
    if (!targetUrl || isRedirecting) return;
    setIsRedirecting(true);
    setTimeout(() => {
      window.location.replace(targetUrl);
    }, 1000);
  };

  useEffect(() => {
    try {
      const nav = performance.getEntriesByType("navigation")[0] as
        | PerformanceNavigationTiming
        | undefined;
      if (nav?.type === "back_forward") {
        isBackForwardRef.current = true;
        window.location.replace("/");
        return;
      }
    } catch {}

    const onPageShow = (e: PageTransitionEvent) => {
      if ((e as any).persisted) {
        isBackForwardRef.current = true;
        try {
          window.location.replace("/");
        } catch {}
      }
    };
    window.addEventListener("pageshow", onPageShow as any);
    return () => window.removeEventListener("pageshow", onPageShow as any);
  }, []);

  useEffect(() => {
    if (!url || isBackForwardRef.current || isRedirecting) return;

    const t = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(t);
          startRedirect(url); // green 1s, then navigate
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(t);
  }, [url, isRedirecting]);

  const handleManualRedirect = () => {
    if (url) startRedirect(url);
  };

  const handleGoBack = () => {
    clearEpisodePosition();
    router.back();
  }

  if (!url) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-50 to-pink-50 dark:from-pink-950/20 dark:via-purple-950/20 dark:to-pink-950/20 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-gradient-to-r from-pink-100/30 via-transparent to-purple-100/30 dark:from-pink-900/10 dark:via-transparent dark:to-purple-900/10" />
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-400 via-purple-400 to-pink-400" />

      <Card className="w-full max-w-md mx-auto shadow-xl border-pink-200/50 dark:border-pink-800/50 backdrop-blur-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-pink-400 via-purple-400 to-pink-400" />
        <CardContent className="p-6 space-y-6">
          <div className="text-center space-y-2">
            <div className="w-16 h-16 mx-auto bg-gradient-to-r from-pink-100 to-purple-100 dark:from-pink-900/50 dark:to-purple-900/50 rounded-full flex items-center justify-center shadow-md">
              <Download className="w-8 h-8 text-pink-600 dark:text-pink-400 animate-bounce" />
            </div>
            <h1 className="text-xl font-bold text-foreground vietnamese-text">
              Chuẩn Bị Tải Xuống
            </h1>
            <p className="text-sm text-muted-foreground">
              {type === "raw"
                ? "Phim RAW (Không phụ đề)"
                : isFolder
                ? "Thư mục Dropbox"
                : "Phim có phụ đề"}
              : {filename}
            </p>
          </div>

          {isH265 && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <h3 className="font-medium text-yellow-800 dark:text-yellow-200 vietnamese-text">
                    Lưu ý về định dạng video
                  </h3>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 leading-relaxed vietnamese-text">
                    Nếu bạn không thể xem video, hãy thử{" "}
                    <span className="font-semibold">VLC</span>{" "}
                    (iOS/Android/Windows/MacOS) hoặc app tương tự.
                  </p>
                  <div className="flex items-center gap-2 text-xs text-yellow-600 dark:text-yellow-400">
                    <Video className="w-4 h-4" />
                    <span>Video mã hóa H.265 để tối ưu dung lượng</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {isFolder && (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <h3 className="font-medium text-yellow-800 dark:text-yellow-200 vietnamese-text">
                    Lưu ý khi mở liên kết
                  </h3>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 leading-relaxed vietnamese-text">
                    Nếu mở lỗi/trắng trang, thử trình duyệt khác hoặc dán URL
                    trực tiếp; đảm bảo đã đăng nhập Dropbox.
                  </p>
                  <div className="flex items-center gap-2 text-xs text-yellow-600 dark:text-yellow-400">
                    <ExternalLink className="w-4 h-4" />
                    <span>
                      Nếu vẫn lỗi, thử trình duyệt mặc định của thiết bị.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!isRedirecting ? (
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-2 text-lg font-semibold text-primary">
                <Clock className="w-5 h-5 animate-pulse" />
                <span>Chuyển hướng sau {countdown} giây</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-pink-500 to-purple-500 transition-all duration-1000 ease-linear"
                  style={{ width: `${((5 - countdown) / 5) * 100}%` }}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={handleGoBack}
                  className="flex-1 vietnamese-text"
                >
                  Quay lại
                </Button>
                <Button
                  onClick={handleManualRedirect}
                  className="flex-1 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 vietnamese-text"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Tải ngay
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-2 text-lg font-semibold text-green-600 dark:text-green-400">
                <ExternalLink className="w-5 h-5 animate-pulse" />
                <span>Đang chuyển hướng đến Dropbox...</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-1000 ease-linear"
                  style={{ width: "100%" }}
                />
              </div>
              <p className="text-sm text-muted-foreground vietnamese-text">
                Vui lòng chờ trong giây lát...
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
