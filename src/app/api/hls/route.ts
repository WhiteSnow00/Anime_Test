import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import crypto from 'crypto';

// Create a mapping between encrypted IDs and real filenames
const fileMapping = new Map<string, string>();
const reverseMapping = new Map<string, string>();

function getOrCreateFileId(realFileName: string): string {
  if (reverseMapping.has(realFileName)) {
    return reverseMapping.get(realFileName)!;
  }
  
  const fileId = crypto.randomBytes(16).toString('hex');
  fileMapping.set(fileId, realFileName);
  reverseMapping.set(realFileName, fileId);
  return fileId;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    let file = searchParams.get('file');
    const streamId = searchParams.get('id');
    const obfuscatedFile = searchParams.get('f'); 
    const token = searchParams.get('t');
    const sessionId = searchParams.get('s');
    const timestamp = searchParams.get('ts');
    const ref = searchParams.get('ref');

    if (obfuscatedFile && token && sessionId && timestamp && ref) {
      try {
        const decodedRef = atob(ref);
        const requestHost = request.headers.get('host') || '';
        
        if (!requestHost.includes(decodedRef) && decodedRef !== 'localhost') {
          return NextResponse.json(
            { error: 'Invalid referrer' },
            { status: 403 }
          );
        }
        const requestTime = parseInt(timestamp);
        const currentTime = Date.now();
        if (currentTime - requestTime > 5 * 60 * 1000) {
          return NextResponse.json(
            { error: 'Request expired' },
            { status: 403 }
          );
        }
        try {
          const decoded = atob(obfuscatedFile);
          const timestampIndex = decoded.lastIndexOf(Date.now().toString(36).slice(0, 8));
          let cleanDecoded = decoded;
          
          if (timestampIndex > 0) {
            cleanDecoded = decoded.substring(0, timestampIndex);
          }
          
          const reversed = cleanDecoded.split('').reverse().join('');
          file = atob(reversed);
        } catch (decodeError) {
          console.error('Decode error:', decodeError);
          return NextResponse.json(
            { error: 'Invalid file parameter' },
            { status: 400 }
          );
        }
      } catch (validationError) {
        console.error('Validation error:', validationError);
        return NextResponse.json(
          { error: 'Security validation failed' },
          { status: 403 }
        );
      }
    }
    
    // Handle encrypted stream ID
    if (streamId && !file) {
      const realFileName = fileMapping.get(streamId);
      if (realFileName) {
        file = realFileName;
      } else {
        return NextResponse.json(
          { error: 'Invalid stream ID' },
          { status: 403 }
        );
      }
    }
    
    if (!file) {
      return NextResponse.json(
        { error: 'File parameter is required' },
        { status: 400 }
      );
    }
    
    // If using old format, create mapping for future use
    if (file.includes('Tập')) {
      getOrCreateFileId(file);
    }

    // Security: Only allow specific file patterns
    const allowedPattern = /^Tập\d+\.m3u8$/;
    if (!allowedPattern.test(file)) {
      return NextResponse.json(
        { error: 'Invalid file format' },
        { status: 400 }
      );
    }
    const userAgent = request.headers.get('user-agent') || '';
    const clientSession = request.headers.get('x-client-session');
    const playerToken = request.headers.get('x-player-token');
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    const isAndroid = /android/i.test(userAgent);

    const filePath = join(process.cwd(), 'src', 'm3u8', file);
    
    try {
      let fileContent = await readFile(filePath, 'utf8');
      
      const lines = fileContent.split('\n');
      const rewrittenLines = lines.map(line => {
        if (line.trim() && !line.startsWith('#') && line.includes('tiktokcdn.com')) {
          const originalUrl = line.trim();
          const proxyUrl = `/api/hls-segment?url=${encodeURIComponent(originalUrl)}`;
          console.log(`Rewriting segment URL:`, originalUrl, '->', proxyUrl);
          return proxyUrl;
        }
        return line;
      });
      
      fileContent = rewrittenLines.join('\n');
      
      // Add mobile-specific optimizations to the playlist
      if (isMobile) {
        // Add mobile-optimized headers to the m3u8 content
        const mobileOptimizations = [
          '#EXT-X-TARGETDURATION:10',
          '#EXT-X-MEDIA-SEQUENCE:0',
          '#EXT-X-PLAYLIST-TYPE:VOD'
        ];
        
        // Insert optimizations after #EXTM3U if not already present
        if (!fileContent.includes('#EXT-X-TARGETDURATION')) {
          const lines = fileContent.split('\n');
          const extm3uIndex = lines.findIndex(line => line.startsWith('#EXTM3U'));
          if (extm3uIndex !== -1) {
            lines.splice(extm3uIndex + 1, 0, ...mobileOptimizations);
            fileContent = lines.join('\n');
          }
        }
      }
      
      if (obfuscatedFile && token && timestamp) {
        const noiseComments = [
          `# Protected Stream - Session: ${sessionId || 'unknown'}`,
          `# Anti-Track Token: ${token.slice(0, 8)}...`,
          `# Timestamp: ${new Date(parseInt(timestamp)).toISOString()}`,
          `# Client Guard: ${btoa(Math.random().toString()).slice(0, 12)}`
        ];
        
        fileContent = noiseComments.join('\n') + '\n' + fileContent;
      }
            const headers = new Headers({
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Cache-Control': isAndroid ? 'public, max-age=300, stale-while-revalidate=900' : (isMobile ? 'public, max-age=600, stale-while-revalidate=1800' : 'no-cache, no-store, must-revalidate'),
        'Pragma': isMobile ? 'public' : 'no-cache',
        'Expires': isMobile ? new Date(Date.now() + 600000).toUTCString() : '0',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Range, Content-Type, X-Client-Session, X-Player-Token, X-Anti-Track, X-Session-Guard',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'SAMEORIGIN',
        'X-Stream-Protected': 'true',
        'X-Mobile-Optimized': isMobile ? 'true' : 'false',
        'X-Android-Optimized': isAndroid ? 'true' : 'false',
        'X-Session-Token': btoa(Date.now().toString() + Math.random().toString()),
        'Connection': 'keep-alive',
        'Keep-Alive': 'timeout=30, max=1000',
      });

      return new NextResponse(fileContent, {
        status: 200,
        headers,
      });
    } catch (fileError) {
      console.error('File read error:', fileError);
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('HLS API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Type, X-Client-Session, X-Player-Token, X-Anti-Track, X-Session-Guard',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'SAMEORIGIN',
    },
  });
}
