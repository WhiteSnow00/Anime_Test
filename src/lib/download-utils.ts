"use client";

export function saveEpisodePosition(episodeId: number): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem('last-episode-download', episodeId.toString());
    }
  } catch (error) {
    console.warn('Failed to save episode position:', error);
  }
}

export function getSavedEpisodePosition(): number | null {
  try {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('last-episode-download');
      if (saved) {
        const episodeId = parseInt(saved, 10);
        return isNaN(episodeId) ? null : episodeId;
      }
    }
  } catch (error) {
    console.warn('Failed to get saved episode position:', error);
  }
  return null;
}

export function clearEpisodePosition(): void {
  try {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('last-episode-download');
    }
  } catch (error) {
    console.warn('Failed to clear episode position:', error);
  }
}

export function openDropboxLink(url: string, filename?: string, isRaw?: boolean, episodeId?: number): void {
  try {
    if (episodeId) {
      saveEpisodePosition(episodeId);
    }
    
    const params = new URLSearchParams({
      url: url,
      filename: filename || 'Tập',
      type: isRaw ? 'raw' : 'download',
      episodeId: episodeId?.toString() || '0'
    });
    
    window.location.href = `/download-redirect?${params.toString()}`;
    
  } catch (error) {
    console.error('Failed to navigate to redirect page:', error);
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

export function triggerDownload(url: string, filename?: string): void {
  try {
    const link = document.createElement('a');
    link.href = url;
    link.style.display = 'none';
    
    if (filename) {
      link.download = filename;
    }
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
  } catch (error) {
    console.error('Download failed:', error);
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

export function isValidDownloadUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
  } catch {
    return false;
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
