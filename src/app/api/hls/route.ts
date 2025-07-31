import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';

/**
 * HLS Streaming API Route
 * Serves m3u8 playlist files and video segments for JWPlayer
 */

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Handle both old and new parameter formats for backward compatibility
    let file = searchParams.get('file'); // Legacy format
    const obfuscatedFile = searchParams.get('f'); // New obfuscated format
    const token = searchParams.get('t');
    const sessionId = searchParams.get('s');
    const timestamp = searchParams.get('ts');
    const ref = searchParams.get('ref');

    // Advanced security validation for new format
    if (obfuscatedFile && token && sessionId && timestamp && ref) {
      try {
        // Verify referrer
        const decodedRef = atob(ref);
        const requestHost = request.headers.get('host') || '';
        
        if (!requestHost.includes(decodedRef) && decodedRef !== 'localhost') {
          return NextResponse.json(
            { error: 'Invalid referrer' },
            { status: 403 }
          );
        }

        // Verify timestamp (reject requests older than 5 minutes)
        const requestTime = parseInt(timestamp);
        const currentTime = Date.now();
        if (currentTime - requestTime > 5 * 60 * 1000) {
          return NextResponse.json(
            { error: 'Request expired' },
            { status: 403 }
          );
        }

        // Decode obfuscated file parameter
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
    
    if (!file) {
      return NextResponse.json(
        { error: 'File parameter is required' },
        { status: 400 }
      );
    }

    // Security: Only allow specific file patterns
    const allowedPattern = /^kanasub-\d{2}\.m3u8$/;
    if (!allowedPattern.test(file)) {
      return NextResponse.json(
        { error: 'Invalid file format' },
        { status: 400 }
      );
    }

    // Additional security headers for obfuscation
    const userAgent = request.headers.get('user-agent') || '';
    const clientSession = request.headers.get('x-client-session');
    const playerToken = request.headers.get('x-player-token');

    // Construct file path
    const filePath = join(process.cwd(), 'src', 'm3u8', file);
    
    try {
      // Read the m3u8 file
      let fileContent = await readFile(filePath, 'utf8');
      
      // Obfuscate the m3u8 content to make tracking harder
      if (obfuscatedFile && token && timestamp) {
        // Add noise comments to confuse parsers
        const noiseComments = [
          `# Protected Stream - Session: ${sessionId || 'unknown'}`,
          `# Anti-Track Token: ${token.slice(0, 8)}...`,
          `# Timestamp: ${new Date(parseInt(timestamp)).toISOString()}`,
          `# Client Guard: ${btoa(Math.random().toString()).slice(0, 12)}`
        ];
        
        fileContent = noiseComments.join('\n') + '\n' + fileContent;
      }
      
      // Set appropriate headers for HLS streaming with additional protection
      const headers = new Headers({
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Range, Content-Type, X-Client-Session, X-Player-Token, X-Anti-Track, X-Session-Guard',
        // Additional protection headers
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'SAMEORIGIN',
        'X-Stream-Protected': 'true',
        'X-Session-Token': btoa(Date.now().toString() + Math.random().toString()),
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

// Handle OPTIONS for CORS with enhanced headers
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
