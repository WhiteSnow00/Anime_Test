declare global {
  interface Window {
    jwplayer: any;
  }
}
declare function jwplayer(id: string): any;

export {};
