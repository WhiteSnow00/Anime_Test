"use client";

/**
 * Utility functions for handling file downloads
 */

/**
 * Converts Google Drive share URL to direct download URL
 * @param shareUrl - Google Drive share URL
 * @returns Direct download URL
 */
export function convertGoogleDriveUrl(shareUrl: string): string {
  // Extract file ID from Google Drive URL
  const match = shareUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (!match || !match[1]) {
    console.error('Invalid Google Drive URL:', shareUrl);
    return shareUrl; // Return original URL if parsing fails
  }
  
  const fileId = match[1];
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

/**
 * Triggers direct download of a file
 * @param url - Download URL
 * @param filename - Optional filename for the download
 */
export function triggerDownload(url: string, filename?: string): void {
  try {
    // Convert Google Drive URL if needed
    const downloadUrl = url.includes('drive.google.com/file/d/') 
      ? convertGoogleDriveUrl(url) 
      : url;

    // Create a temporary anchor element
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.style.display = 'none';
    
    // Set download attribute if filename is provided
    if (filename) {
      link.download = filename;
    }
    
    // Add to document, click, and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log('Download triggered for:', downloadUrl);
  } catch (error) {
    console.error('Download failed:', error);
    // Fallback: open in new tab
    window.open(url, '_blank');
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
