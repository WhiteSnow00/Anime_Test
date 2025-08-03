// "use client";

// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import type { Episode } from "@/data/anime";
// import {
//   isValidDownloadUrl,
//   openGoogleDriveLink,
//   triggerDownload,
// } from "@/lib/download-utils";
// import { withPerformanceOptimization } from "@/lib/higher-order-components";
// import { cn } from "@/lib/utils";
// import { Download, Server } from "lucide-react";
// import { memo, useCallback } from "react";
// // import {
// //   getServerStatus,
// //   ServerStatus,
// //   validateEpisodeServers,
// //   getServerReliabilityScore,
// // } from "@/lib/video-server-utils";

// export type ServerType = "hls" | "helvid" | "hydax";

// interface ServerSelectorProps {
//   currentServer: ServerType;
//   onServerChange: (server: ServerType) => void;
//   currentEpisode?: Episode;
//   className?: string;
//   serverStatus?: Record<string, ServerStatus>;
// }

// const serverConfig = {
//   hls: {
//     name: "HLS Stream",
//     label: "HD Quality",
//     color: "bg-purple-500 hover:bg-purple-600",
//   },
//   helvid: {
//     name: "Helvid",
//     label: "HD Fast",
//     color: "bg-blue-500 hover:bg-blue-600",
//   },
//   hydax: {
//     name: "Hydax",
//     label: "HD Backup",
//     color: "bg-green-500 hover:bg-green-600",
//   },
// };

// function ServerSelectorComponent({
//   currentServer,
//   onServerChange,
//   currentEpisode,
//   className,
//   serverStatus,
// }: ServerSelectorProps) {
//   const handleServerSelect = useCallback(
//     (server: ServerType) => {
//       onServerChange(server);
//     },
//     [onServerChange]
//   );

//   const handleDownload = useCallback(() => {
//     if (!currentEpisode?.downloadUrl) {
//       console.warn("No download URL available for current episode");
//       return;
//     }

//     if (!isValidDownloadUrl(currentEpisode.downloadUrl)) {
//       console.error("Invalid download URL:", currentEpisode.downloadUrl);
//       return;
//     }

//     const filename = `Tập ${currentEpisode.id}`;

//     // Check if it's a Google Drive link and handle accordingly
//     if (currentEpisode.downloadUrl.includes("drive.google.com")) {
//       openGoogleDriveLink(
//         currentEpisode.downloadUrl,
//         filename,
//         false,
//         currentEpisode.id
//       );
//     } else {
//       // For other types of links, try direct download
//       triggerDownload(currentEpisode.downloadUrl, filename);
//     }
//   }, [currentEpisode]);

//   const handleRawDownload = useCallback(() => {
//     if (!currentEpisode?.rawDownloadUrl) {
//       console.warn("No raw download URL available for current episode");
//       return;
//     }

//     if (!isValidDownloadUrl(currentEpisode.rawDownloadUrl)) {
//       console.error("Invalid raw download URL:", currentEpisode.rawDownloadUrl);
//       return;
//     }

//     const filename = `Tập ${currentEpisode.id} RAW`;

//     // Check if it's a Google Drive link and handle accordingly
//     if (currentEpisode.rawDownloadUrl.includes("drive.google.com")) {
//       openGoogleDriveLink(
//         currentEpisode.rawDownloadUrl,
//         filename,
//         true,
//         currentEpisode.id
//       );
//     } else {
//       // For other types of links, try direct download
//       triggerDownload(currentEpisode.rawDownloadUrl, filename);
//     }
//   }, [currentEpisode]);

//   return (
//     <Card className={cn("w-full shadow-lg rounded-lg", className)}>
//       <CardHeader>
//         <CardTitle className="flex items-center gap-2 font-headline vietnamese-text">
//           <Server className="w-5 h-5 text-primary" />
//           <span>Máy Chủ</span>
//         </CardTitle>
//       </CardHeader>

//       <CardContent>
//         <div className="flex gap-2 sm:gap-3 flex-wrap">
//           {/* Server Selection Buttons */}
//           {(Object.keys(serverConfig) as ServerType[]).map((server) => {
//             const config = serverConfig[server];
//             const isActive = currentServer === server;
//             // const status = serverStatus?.[server] || getServerStatus(server);

//             // Check server data validation
//             // const episodeValidation = currentEpisode
//             //   ? validateEpisodeServers(currentEpisode)
//             //   : null;
//             // const isValidServer = episodeValidation
//             //   ? episodeValidation[server]
//             //   : true;
//             // const reliability = getServerReliabilityScore(server);

//             // Hide helvid server if the current episode doesn't have helvid server data
//             if (
//               server === "helvid" &&
//               currentEpisode &&
//               !currentEpisode.servers.helvid
//             ) {
//               return null;
//             }

//             // Hide hydax server if the current episode doesn't have hydax server data
//             if (
//               server === "hydax" &&
//               currentEpisode &&
//               !currentEpisode.servers.hydax
//             ) {
//               return null;
//             }

//             return (
//               <Button
//                 key={server}
//                 variant={isActive ? "default" : "outline"}
//                 className={cn(
//                   "flex items-center gap-2 font-medium transition-all duration-200",
//                   "hover:scale-105 active:scale-95 touch-manipulation",
//                   "focus:ring-2 focus:ring-primary focus:ring-offset-2",
//                   "text-xs sm:text-sm",
//                   "px-3 py-2 sm:px-4 sm:py-2",
//                   isActive
//                     ? "bg-primary text-primary-foreground shadow-md scale-105"
//                     : "hover:bg-muted"
//                 )}
//                 onClick={() => handleServerSelect(server)}
//                 aria-label={`Select ${config.name} server`}
//               >
//                 {/* {status === "online" ? (
//                   <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 text-green-500" />
//                 ) : status === "error" || status === "offline" ? (
//                   <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 text-red-500" />
//                 ) : (
//                   <Play className="w-3 h-3 sm:w-4 sm:h-4" />
//                 )} */}
//                 <div className="flex flex-col items-start">
//                   <span className="text-xs sm:text-sm font-semibold">
//                     {config.name}
//                   </span>
//                   <span className="text-xs opacity-75 hidden sm:block">
//                     {config.label}
//                   </span>
//                 </div>
//               </Button>
//             );
//           })}

//           {/* Download Button */}
//           {currentEpisode?.downloadUrl && (
//             <Button
//               variant="outline"
//               className={cn(
//                 "flex items-center gap-2 font-medium transition-all duration-200",
//                 "hover:scale-105 active:scale-95 touch-manipulation",
//                 "focus:ring-2 focus:ring-primary focus:ring-offset-2",
//                 "text-xs sm:text-sm",
//                 "px-3 py-2 sm:px-4 sm:py-2",
//                 "bg-purple-500 text-white hover:bg-purple-600 border-purple-500"
//               )}
//               onClick={handleDownload}
//               aria-label="Mở link Google Drive để tải về"
//             >
//               <Download className="w-3 h-3 sm:w-4 sm:h-4" />
//               <div className="flex flex-col items-start">
//                 <span className="text-xs sm:text-sm font-semibold">Tải về</span>
//                 <span className="text-xs opacity-75 hidden sm:block">
//                   Google Drive
//                 </span>
//               </div>
//             </Button>
//           )}

//           {/* Raw Download Button */}
//           {currentEpisode?.rawDownloadUrl && (
//             <Button
//               variant="outline"
//               className={cn(
//                 "flex items-center gap-2 font-medium transition-all duration-200",
//                 "hover:scale-105 active:scale-95 touch-manipulation",
//                 "focus:ring-2 focus:ring-primary focus:ring-offset-2",
//                 "text-xs sm:text-sm",
//                 "px-3 py-2 sm:px-4 sm:py-2",
//                 "bg-gray-500 text-white hover:bg-gray-600 border-gray-500"
//               )}
//               onClick={handleRawDownload}
//               aria-label="Tải phim raw (không phụ đề)"
//             >
//               <Download className="w-3 h-3 sm:w-4 sm:h-4" />
//               <div className="flex flex-col items-start">
//                 <span className="text-xs sm:text-sm font-semibold">RAW</span>
//                 <span className="text-xs opacity-75 hidden sm:block">
//                   Không Sub
//                 </span>
//               </div>
//             </Button>
//           )}
//         </div>
//       </CardContent>
//     </Card>
//   );
// }

// export const ServerSelector = withPerformanceOptimization(
//   memo(ServerSelectorComponent)
// );
