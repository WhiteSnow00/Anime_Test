"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { animeData, type Episode } from "@/data/anime";
import { cn } from "@/lib/utils";
import { Download, Heart, Info, Server, Tv } from "lucide-react";
import { useLayoutEffect, useState } from "react";
import { FloatingSupportWidget } from "./floating-support-widget";
import { NotificationHeader } from "./notification-header";
import JWPlayerNew from "./player/JWPlayerNew";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { CommentSection } from "./comment-section";
import { AnimeInfo } from "./anime-info";
import { MobileHeader } from "./mobile-header";

export default function AnimePage() {
  const [playerType, setPlayerType] = useState<"iframe" | "jwplayer" | null>(
    "jwplayer"
  );

  const [episodeNumber, setEpisodeNumber] = useState<number>(1);

  const [videoUrl, setVideoUrl] = useState<null | string>(
    animeData.episodes[0].servers[0].videoUrl as string
  );

  const handleSelectEpisode = (episodeNumber: Episode["id"]) => {
    setEpisodeNumber(episodeNumber);
    setVideoUrl(
      animeData.episodes[episodeNumber - 1].servers[0].videoUrl as string
    );
  };

  useLayoutEffect(() => {
    if (videoUrl?.includes("/m3u8/")) {
      setPlayerType("jwplayer");
    } else {
      setPlayerType("iframe");
    }
  }, [videoUrl]);

  return (
    <div className="min-h-screen bg-background">
      <FloatingSupportWidget />

      <MobileHeader title={animeData.title} />

      <div className={`w-full max-w-7xl mx-auto`}>
        <NotificationHeader />

        <div className="max-w-[1280px] aspect-video mx-auto w-full">
          {playerType === "iframe" ? (
            <iframe
              src={videoUrl as string}
              width="100%"
              height="100%"
              allowFullScreen
            />
          ) : (
            <JWPlayerNew videoUrl={videoUrl as string} />
          )}
        </div>

        <div className="mb-4">
          <Alert className="mx-3 sm:mx-0 border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
            <Info className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <AlertDescription className="text-xs sm:text-sm text-amber-800 dark:text-amber-200 vietnamese-text leading-relaxed ml-1">
              Web vừa cập nhật server video mới, nếu gặp lỗi gì xin hãy comment
              hoặc thông báo trên Discord. Xem trên PC để có trải nghiệm tốt
              nhất.
            </AlertDescription>
          </Alert>
        </div>

        <Card className={cn("w-full shadow-lg rounded-lg")}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-headline vietnamese-text">
              <Server className="w-5 h-5 text-primary" />
              <span>Máy Chủ</span>
            </CardTitle>
          </CardHeader>

          <CardContent>
            <div className="flex gap-2 sm:gap-3 flex-wrap">
              {/* Select Server */}
              {animeData.episodes[episodeNumber - 1].servers.map((server) => (
                <Button
                  onClick={() => setVideoUrl(server.videoUrl)}
                  key={server.videoUrl}
                  className={cn(
                    "flex items-center gap-2 font-medium transition-all duration-200",
                    "hover:scale-105 active:scale-95 touch-manipulation",
                    "focus:ring-2 focus:ring-primary focus:ring-offset-2",
                    "text-xs sm:text-sm",
                    "px-3 py-2 sm:px-4 sm:py-2"
                  )}
                >
                  <div className="flex flex-col items-start">
                    <span className="text-xs sm:text-sm font-semibold">
                      {server.name}
                    </span>
                    <span className="text-xs opacity-75 hidden sm:block">
                      {server.note}
                    </span>
                  </div>
                </Button>
              ))}

              {/* Download Button */}
              <Button
                variant="outline"
                className={cn(
                  "flex items-center gap-2 font-medium transition-all duration-200",
                  "hover:scale-105 active:scale-95 touch-manipulation",
                  "focus:ring-2 focus:ring-primary focus:ring-offset-2",
                  "text-xs sm:text-sm",
                  "px-3 py-2 sm:px-4 sm:py-2",
                  "bg-purple-500 text-white hover:bg-purple-600 border-purple-500"
                )}
                aria-label="Mở link Google Drive để tải về"
              >
                <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                <div className="flex flex-col items-start">
                  <span className="text-xs sm:text-sm font-semibold">
                    Tải về
                  </span>
                  <span className="text-xs opacity-75 hidden sm:block">
                    Google Drive
                  </span>
                </div>
              </Button>

              {/* Raw Download Button */}
              <Button
                variant="outline"
                className={cn(
                  "flex items-center gap-2 font-medium transition-all duration-200",
                  "hover:scale-105 active:scale-95 touch-manipulation",
                  "focus:ring-2 focus:ring-primary focus:ring-offset-2",
                  "text-xs sm:text-sm",
                  "px-3 py-2 sm:px-4 sm:py-2",
                  "bg-gray-500 text-white hover:bg-gray-600 border-gray-500"
                )}
                aria-label="Tải phim raw (không phụ đề)"
              >
                <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                <div className="flex flex-col items-start">
                  <span className="text-xs sm:text-sm font-semibold">RAW</span>
                  <span className="text-xs opacity-75 hidden sm:block">
                    Không Sub
                  </span>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>

        <div>
          <Card className={cn("w-full shadow-lg rounded-lg")}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-headline vietnamese-text">
                <Tv className="w-6 h-6 text-primary" />
                <span>Tập</span>
              </CardTitle>
            </CardHeader>

            <CardContent>
              {/* Episode grid */}
              <div
                className={cn(
                  "grid gap-2 grid-cols-8 lg:grid-cols-10 xl:grid-cols-12 2xl:grid-cols-15"
                )}
              >
                {animeData.episodes.map((episodeNumber) => (
                  <Button
                    key={episodeNumber.id}
                    onClick={() => handleSelectEpisode(episodeNumber.id)}
                    className={cn(
                      "font-medium relative overflow-hidden",
                      "transform transition-all duration-200",
                      "hover:scale-105 active:scale-95",
                      "touch-manipulation",
                      "focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    )}
                    // aria-label={`Select episode ${episode.id}`}
                  >
                    <span className="font-semibold">{episodeNumber.id}</span>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div id="info-section" data-section="info">
          <AnimeInfo anime={animeData} />
        </div>

        <div
          // ref={refs.commentRef}
          id="comment-section"
          data-section="comment"
          className="mt-6 comment-section-mobile"
        >
          <CommentSection currentEpisodeId={episodeNumber} />
        </div>
      </div>

      <footer className="w-full max-w-7xl mx-auto mt-8 py-4 text-center text-muted-foreground text-sm">
        <p>
          Made by Kana
          <Heart className="inline w-4 h-4 text-primary fill-current" />
        </p>
      </footer>

      {/* <MobileBottomNav
        currentSection={currentSection}
        onNavigate={handleNavigate}
        onPreviousEpisode={handlePreviousEpisode}
        onNextEpisode={handleNextEpisode}
        canGoBack={computed.canGoPrevious}
        canGoNext={computed.canGoNext}
      /> */}
    </div>
  );
}
