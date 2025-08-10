import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const activeSessions = new Map<string, { timestamp: number; attempts: number }>();
const blockedIPs = new Set<string>();

function generateFakeM3U8() {
  const segmentCount = Math.floor(Math.random() * 20) + 10;
  const segments = [];
  
  segments.push('#EXTM3U');
  segments.push('#EXT-X-VERSION:3');
  segments.push('#EXT-X-TARGETDURATION:10');
  segments.push('#EXT-X-MEDIA-SEQUENCE:0');
  segments.push('#EXT-X-PLAYLIST-TYPE:VOD');
  
  for (let i = 0; i < segmentCount; i++) {
    const duration = (Math.random() * 8 + 2).toFixed(3);
    segments.push(`#EXTINF:${duration},`);
    segments.push(`/api/decoy-segment/${crypto.randomBytes(16).toString('hex')}.ts?t=${Date.now()}&s=${i}`);
  }
  
  segments.push('#EXT-X-ENDLIST');
  return segments.join('\n');
}

function trackSuspiciousActivity(ip: string, userAgent: string) {
  const session = activeSessions.get(ip) || { timestamp: Date.now(), attempts: 0 };
  session.attempts++;
  
  if (session.attempts > 50) {
    blockedIPs.add(ip);
    return true;
  }
  
  if (Date.now() - session.timestamp < 1000 && session.attempts > 10) {
    blockedIPs.add(ip);
    return true;
  }
  
  activeSessions.set(ip, session);
  
  if (activeSessions.size > 1000) {
    const oldestKey = Array.from(activeSessions.keys())[0];
    activeSessions.delete(oldestKey);
  }
  
  return false;
}

export async function GET(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const userAgent = request.headers.get('user-agent') || '';
  
  if (blockedIPs.has(ip)) {
    return new NextResponse('Forbidden', { status: 403 });
  }
  
  const isBlocked = trackSuspiciousActivity(ip, userAgent);
  if (isBlocked) {
    return new NextResponse('Too Many Requests', { status: 429 });
  }
  
  const delay = Math.floor(Math.random() * 800) + 200;
  await new Promise(resolve => setTimeout(resolve, delay));
  
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format');
  
  if (format === 'm3u8' || Math.random() > 0.7) {
    const fakeM3U8 = generateFakeM3U8();
    return new NextResponse(fakeM3U8, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Cache-Control': 'no-cache',
        'X-Decoy-Response': 'true',
        'X-Stream-Token': crypto.randomBytes(32).toString('hex'),
      }
    });
  }
  
  const fakeResponse = {
    manifest: `/api/decoy/${crypto.randomBytes(8).toString('hex')}.m3u8`,
    stream: `decoy-${Math.random().toString(36).substring(2)}`,
    url: `blob:${location.origin}/${crypto.randomUUID()}`,
    segments: Array.from({ length: Math.floor(Math.random() * 10) + 5 }, (_, i) => ({
      id: i,
      duration: Math.random() * 10 + 2,
      url: `/api/decoy-segment/${crypto.randomBytes(12).toString('hex')}.ts`,
      key: crypto.randomBytes(16).toString('hex')
    })),
    timestamp: Date.now(),
    protected: true,
    session: crypto.randomBytes(24).toString('hex'),
    token: crypto.randomBytes(32).toString('base64'),
    encryption: {
      method: 'AES-128',
      uri: `/api/decoy-key/${crypto.randomBytes(8).toString('hex')}`,
      iv: crypto.randomBytes(16).toString('hex')
    }
  };

  return NextResponse.json(fakeResponse, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      'X-Decoy-Response': 'true',
      'X-Session-ID': crypto.randomBytes(16).toString('hex'),
    }
  });
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  
  if (blockedIPs.has(ip)) {
    return new NextResponse('Forbidden', { status: 403 });
  }
  
  const delay = Math.floor(Math.random() * 300) + 50;
  await new Promise(resolve => setTimeout(resolve, delay));

  return NextResponse.json(
    { 
      success: true, 
      decoy: true, 
      timestamp: Date.now(),
      nextToken: crypto.randomBytes(32).toString('hex')
    },
    { status: 200 }
  );
}
