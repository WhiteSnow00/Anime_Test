"use client";

import { useEffect, useRef, useState } from "react";

export default function Test() {
  const playerRef = useRef<HTMLDivElement>(null);
  const [playerLoaded, setPlayerLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const videoUrl = "https://cdn.fluidplayer.com/videos/valerian-1080p.mkv";

  useEffect(() => {
    // Check if JWPlayer is already loaded
    if (typeof window !== 'undefined' && (window as any).jwplayer) {
      initializePlayer();
      return;
    }

    // Create script element for JWPlayer
    const script = document.createElement("script");
    script.src = "https://ssl.p.jwpcdn.com/player/v/8.38.3/jwplayer.js";
    script.async = true;
    
    script.onload = () => {
      console.log("JWPlayer script loaded successfully");
      initializePlayer();
    };

    script.onerror = () => {
      console.error("Failed to load JWPlayer script");
      setError("Failed to load video player");
    };

    document.head.appendChild(script);

    // Cleanup function
    return () => {
      try {
        if (typeof window !== 'undefined' && (window as any).jwplayer) {
          const playerInstance = (window as any).jwplayer("test-player");
          if (playerInstance && typeof playerInstance.remove === 'function') {
            playerInstance.remove();
          }
        }
      } catch (err) {
        console.warn("Error during player cleanup:", err);
      }
      
      // Remove script if it exists
      const existingScript = document.querySelector('script[src*="jwplayer.js"]');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, []);

  const initializePlayer = () => {
    try {
      if (typeof window !== 'undefined' && (window as any).jwplayer) {
        const jwplayer = (window as any).jwplayer;
        
        jwplayer("test-player").setup({
          file: videoUrl,
          type: videoUrl.includes("m3u8") ? "hls" : "mp4",
          width: "100%",
          height: "100%",
          playbackRateControls: true,
          playbackRates: [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2],
          hlsjsdefault: true,
          enableNativeHls: false,
          safarihlsjs: true,
          key: "cLGMn8T20tGvW+0eXPhq4NNmLB57TrscPjd1IyJF84o=",
          autostart: false,
          mute: false,
          controls: true,
          displaytitle: true,
          displaydescription: true,
          abouttext: "Test JWPlayer Implementation",
          aboutlink: "http://ayaya-kana.id.vn/",
        });

        // Add event listeners
        jwplayer("test-player").on('ready', () => {
          console.log("JWPlayer is ready");
          setPlayerLoaded(true);
          setError(null);
        });

        jwplayer("test-player").on('error', (e: any) => {
          console.error("JWPlayer error:", e);
          setError(`Video player error: ${e.message || 'Unknown error'}`);
        });

        jwplayer("test-player").on('setupError', (e: any) => {
          console.error("JWPlayer setup error:", e);
          setError(`Player setup error: ${e.message || 'Setup failed'}`);
        });
      }
    } catch (err) {
      console.error("Error initializing player:", err);
      setError("Failed to initialize video player");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-pink-900 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-4">
            🧪 JWPlayer Test Page
          </h1>
          <p className="text-gray-300 text-lg">
            Testing JWPlayer integration - This page is isolated from the main website
          </p>
          <div className="mt-4 p-4 bg-blue-900/30 rounded-lg border border-blue-500/50">
            <p className="text-blue-200 text-sm">
              📍 URL: <code className="bg-blue-800/50 px-2 py-1 rounded">localhost:9002/test</code>
            </p>
          </div>
        </div>

        {/* Player Container */}
        <div className="bg-black/50 backdrop-blur-sm rounded-2xl p-6 border border-white/10 shadow-2xl">
          <div className="aspect-video w-full max-w-[1280px] mx-auto bg-black rounded-lg overflow-hidden">
            {error ? (
              <div className="flex items-center justify-center h-full bg-red-900/30 border border-red-500/50 rounded-lg">
                <div className="text-center">
                  <div className="text-red-400 text-6xl mb-4">⚠️</div>
                  <h3 className="text-red-300 text-xl font-semibold mb-2">Player Error</h3>
                  <p className="text-red-200">{error}</p>
                  <button 
                    onClick={() => window.location.reload()} 
                    className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
                  >
                    Retry
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div id="test-player" className="w-full h-full"></div>
                {!playerLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                      <p className="text-white">Loading JWPlayer...</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          
          {/* Player Info */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="bg-white/5 p-4 rounded-lg">
              <h3 className="text-white font-semibold mb-2">📹 Video Source</h3>
              <p className="text-gray-300 break-all">{videoUrl}</p>
            </div>
            <div className="bg-white/5 p-4 rounded-lg">
              <h3 className="text-white font-semibold mb-2">⚙️ Player Status</h3>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-400">Loaded:</span>
                  <span className={playerLoaded ? "text-green-400" : "text-yellow-400"}>
                    {playerLoaded ? "✅ Yes" : "⏳ Loading..."}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Error:</span>
                  <span className={error ? "text-red-400" : "text-green-400"}>
                    {error ? "❌ Yes" : "✅ None"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Features Info */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white/5 p-6 rounded-lg border border-white/10">
            <h3 className="text-white font-semibold mb-3">🎛️ Player Features</h3>
            <ul className="text-gray-300 space-y-2 text-sm">
              <li>• Playback rate controls</li>
              <li>• HLS support</li>
              <li>• Responsive design</li>
              <li>• Custom controls</li>
            </ul>
          </div>
          
          <div className="bg-white/5 p-6 rounded-lg border border-white/10">
            <h3 className="text-white font-semibold mb-3">🔧 Technical Details</h3>
            <ul className="text-gray-300 space-y-2 text-sm">
              <li>• JWPlayer v8.38.3</li>
              <li>• HLS.js enabled</li>
              <li>• Native HLS disabled</li>
              <li>• Safari HLS.js enabled</li>
            </ul>
          </div>
          
          <div className="bg-white/5 p-6 rounded-lg border border-white/10">
            <h3 className="text-white font-semibold mb-3">🛡️ Safety Notes</h3>
            <ul className="text-gray-300 space-y-2 text-sm">
              <li>• Isolated from main site</li>
              <li>• Test environment only</li>
              <li>• No production impact</li>
              <li>• Easy to remove</li>
            </ul>
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-8 text-center">
          <a 
            href="/" 
            className="inline-flex items-center px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            ← Back to Main Website
          </a>
        </div>
      </div>
    </div>
  );
}
