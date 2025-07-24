"use client";

/**
 * Utility functions for handling file downloads
 */

/**
 * Opens a Google Drive link through the redirect page with H.265 guide
 * @param url - Google Drive share URL
 * @param filename - Optional filename (for display purposes)
 * @param isRaw - Whether this is a raw download (no subtitles)
 * @param episodeId - Episode ID to check H.265 encoding status
 */
export function openGoogleDriveLink(url: string, filename?: string, isRaw?: boolean, episodeId?: number): void {
  try {
    const params = new URLSearchParams({
      url: url,
      filename: filename || 'Tập',
      type: isRaw ? 'raw' : 'download',
      episodeId: episodeId?.toString() || '0'
    });
    
    // Navigate to the redirect page instead of directly opening Google Drive
    window.location.href = `/download-redirect?${params.toString()}`;
    
  } catch (error) {
    console.error('Failed to navigate to redirect page:', error);
    // Fallback: open Google Drive directly
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

/**
 * Legacy download function for non-Google Drive links
 * @param url - Download URL  
 * @param filename - Optional filename for the download
 */
export function triggerDownload(url: string, filename?: string): void {
  try {
    // Create a temporary anchor element
    const link = document.createElement('a');
    link.href = url;
    link.style.display = 'none';
    
    // Set download attribute if filename is provided
    if (filename) {
      link.download = filename;
    }
    
    // Add to document, click, and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
  } catch (error) {
    console.error('Download failed:', error);
    // Fallback: open in new tab
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

/**
 * Checks if a URL is a valid download URL
 * @param url - URL to validate
 * @returns True if URL appears to be valid
 */
export function isValidDownloadUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Formats file size from bytes to human readable format
 * @param bytes - File size in bytes
 * @returns Formatted file size string
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
