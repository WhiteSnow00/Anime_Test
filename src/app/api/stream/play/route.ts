import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { join } from 'path';
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.STREAM_ENCRYPTION_KEY || 'kana-stream-protect-2025';
const ALGORITHM = 'aes-256-gcm';

interface StreamData {
  file: string;
  timestamp: number;
  session: string;
}

function decrypt(encrypted: string, tag: string, iv: string): StreamData | null {
  try {
    const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
    const decipher = crypto.createDecipheriv(
      ALGORITHM, 
      key, 
      Buffer.from(iv, 'base64')
    );
    
    decipher.setAuthTag(Buffer.from(tag, 'base64'));
    
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encrypted, 'base64')),
      decipher.final()
    ]);
    
    return JSON.parse(decrypted.toString('utf8'));
  } catch (error) {
    console.error('Decryption failed:', error);
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');
    
    console.log('[Stream Play] Received token:', token?.substring(0, 50) + '...');
    
    if (!token) {
      console.error('[Stream Play] No token provided');
      return NextResponse.json(
        { error: 'Invalid stream token' },
        { status: 403 }
      );
    }
    
    let tokenData;
    try {
      const decodedToken = Buffer.from(token, 'base64url').toString('utf8');
      console.log('[Stream Play] Decoded token:', decodedToken.substring(0, 100) + '...');
      tokenData = JSON.parse(decodedToken);
    } catch (error) {
      console.error('[Stream Play] Token decode error:', error);
      return NextResponse.json(
        { error: 'Malformed token' },
        { status: 400 }
      );
    }
    
    const { e: encrypted, t: tag, i: iv } = tokenData;
    
    console.log('[Stream Play] Token structure - e:', !!encrypted, 't:', !!tag, 'i:', !!iv);
    
    if (!encrypted || !tag || !iv) {
      console.error('[Stream Play] Invalid token structure');
      return NextResponse.json(
        { error: 'Invalid token structure' },
        { status: 400 }
      );
    }
    
    const streamData = decrypt(encrypted, tag, iv);
    
    console.log('[Stream Play] Decrypted stream data:', streamData);
    
    if (!streamData) {
      console.error('[Stream Play] Failed to decrypt token');
      return NextResponse.json(
        { error: 'Token verification failed' },
        { status: 403 }
      );
    }
    
    const { file, timestamp } = streamData;
    
    if (Date.now() - timestamp > 5 * 60 * 1000) {
      return NextResponse.json(
        { error: 'Token expired' },
        { status: 403 }
      );
    }
    
    const allowedPattern = /^Tập\d+\.m3u8$/;
    console.log('[Stream Play] File validation - file:', file, 'matches pattern:', allowedPattern.test(file));
    
    if (!allowedPattern.test(file)) {
      console.error('[Stream Play] Invalid file format:', file);
      return NextResponse.json(
        { error: 'Invalid file format' },
        { status: 400 }
      );
    }
    
    const filePath = join(process.cwd(), 'src', 'm3u8', file);
    console.log('[Stream Play] File path:', filePath);
    
    try {
      let fileContent = await readFile(filePath, 'utf8');
      
      const lines = fileContent.split('\n');
      const rewrittenLines = lines.map(line => {
        if (line.trim() && !line.startsWith('#') && line.includes('tiktokcdn.com')) {
          const originalUrl = line.trim();
          const proxyUrl = `/api/hls-segment?url=${encodeURIComponent(originalUrl)}`;
          return proxyUrl;
        }
        return line;
      });
      
      fileContent = rewrittenLines.join('\n');
      
      const userAgent = request.headers.get('user-agent') || '';
      const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      const isAndroid = /android/i.test(userAgent);
      
      const headers = new Headers({
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Range, Content-Type',
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'SAMEORIGIN',
        'X-Stream-Protected': 'true',
        'X-Mobile-Optimized': isMobile ? 'true' : 'false',
        'X-Android-Optimized': isAndroid ? 'true' : 'false',
      });

      return new NextResponse(fileContent, {
        status: 200,
        headers,
      });
    } catch (fileError) {
      console.error('File read error:', fileError);
      return NextResponse.json(
        { error: 'Stream not found' },
        { status: 404 }
      );
    }
  } catch (error) {
    console.error('Stream play error:', error);
    return NextResponse.json(
      { error: 'Failed to play stream' },
      { status: 500 }
    );
  }
}
