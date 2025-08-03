"use client";
import { useEffect } from "react";

export default function Test() {
  const videoUrl = "https://cdn.fluidplayer.com/videos/valerian-1080p.mkv";

  const addSkipButtons = (player: any) => {
    player.addButton(
      '<svg xmlns="http://www.w3.org/2000/svg" class="jw-svg-icon" viewBox="0 0 240 240" focusable="false"><path d="m 25.993957,57.778 v 125.3 c 0.03604,2.63589 2.164107,4.76396 4.8,4.8 h 62.7 v -19.3 h -48.2 v -96.4 H 160.99396 v 19.3 c 0,5.3 3.6,7.2 8,4.3 l 41.8,-27.9 c 2.93574,-1.480087 4.13843,-5.04363 2.7,-8 -0.57502,-1.174985 -1.52502,-2.124979 -2.7,-2.7 l -41.8,-27.9 c -4.4,-2.9 -8,-1 -8,4.3 v 19.3 H 30.893957 c -2.689569,0.03972 -4.860275,2.210431 -4.9,4.9 z m 163.422413,73.04577 c -3.72072,-6.30626 -10.38421,-10.29683 -17.7,-10.6 -7.31579,0.30317 -13.97928,4.29374 -17.7,10.6 -8.60009,14.23525 -8.60009,32.06475 0,46.3 3.72072,6.30626 10.38421,10.29683 17.7,10.6 7.31579,-0.30317 13.97928,-4.29374 17.7,-10.6 8.60009,-14.23525 8.60009,-32.06475 0,-46.3 z m -17.7,47.2 c -7.8,0 -14.4,-11 -14.4,-24.1 0,-13.1 6.6,-24.1 14.4,-24.1 7.8,0 14.4,11 14.4,24.1 0,13.1 -6.5,24.1 -14.4,24.1 z m -47.77056,9.72863 v -51 l -4.8,4.8 -6.8,-6.8 13,-12.99999 c 3.02543,-3.03598 8.21053,-0.88605 8.2,3.4 v 62.69999 z"></path></svg>',
      "Tới 10 giây",
      () => {
        const currentTime = player.getPosition();
        const duration = player.getDuration();
        player.seek(Math.min(currentTime + 10, duration));
      },
      "forward10"
    );

    player.addButton(
      '<svg xmlns="http://www.w3.org/2000/svg" class="jw-svg-icon" viewBox="0 0 240 240" focusable="false"><path d="M113.2,131.078a21.589,21.589,0,0,0-17.7-10.6,21.589,21.589,0,0,0-17.7,10.6,44.769,44.769,0,0,0,0,46.3,21.589,21.589,0,0,0,17.7,10.6,21.589,21.589,0,0,0,17.7-10.6,44.769,44.769,0,0,0,0-46.3Zm-17.7,47.2c-7.8,0-14.4-11-14.4-24.1s6.6-24.1,14.4-24.1,14.4,11,14.4,24.1S103.4,178.278,95.5,178.278Zm-43.4,9.7v-51l-4.8,4.8-6.8-6.8,13-13a4.8,4.8,0,0,1,8.2,3.4v62.7l-9.6-.1Zm162-130.2v125.3a4.867,4.867,0,0,1-4.8,4.8H146.6v-19.3h48.2v-96.4H79.1v19.3c0,5.3-3.6,7.2-8,4.3l-41.8-27.9a6.013,6.013,0,0,1-2.7-8,5.887,5.887,0,0,1,2.7-2.7l41.8-27.9c4.4-2.9,8-1,8,4.3v19.3H209.2A4.974,4.974,0,0,1,214.1,57.778Z"></path></svg>',
      "Lùi 10 giây",
      () => {
        const currentTime = player.getPosition();
        player.seek(Math.max(currentTime - 10, 0));
      },
      "rewind10"
    );
  };

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://ssl.p.jwpcdn.com/player/v/8.38.3/jwplayer.js";
    script.async = true;
    script.onload = () => {
      const player = jwplayer("player").setup({
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
      });
      player.on("ready", () => {
        addSkipButtons(player);
      });
    };
    document.body.appendChild(script);

    return () => {
      jwplayer().remove();
      script.remove();
    };
  }, [videoUrl]);

  return (
    <div className="aspect-video w-full max-w-[1280px]">
      <div id="player"></div>
    </div>
  );
}
