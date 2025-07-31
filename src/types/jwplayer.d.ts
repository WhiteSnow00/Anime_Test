// TypeScript declarations for JWPlayer
declare global {
  interface Window {
    jwplayer: any;
  }
}

// JWPlayer type definitions
declare function jwplayer(id: string): any;

export {};
