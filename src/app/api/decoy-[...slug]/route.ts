import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

const detectedScrapers = new Map<string, number>();
const honeypotData = new Map<string, any>();

function generateRealisticM3U8(slug: string[]) {
  const baseUrl = slug.join('/');
  const segments = [];
  const segmentCount = Math.floor(Math.random() * 30) + 20;
  
  segments.push('#EXTM3U');
  segments.push('#EXT-X-VERSION:3');
  segments.push('#EXT-X-TARGETDURATION:10');
  segments.push('#EXT-X-MEDIA-SEQUENCE:0');
  segments.push('#EXT-X-PLAYLIST-TYPE:VOD');
  segments.push(`#EXT-X-KEY:METHOD=AES-128,URI="/api/decoy-key/${crypto.randomBytes(16).toString('hex')}",IV=0x${crypto.randomBytes(16).toString('hex')}`);
  
  let totalDuration = 0;
  for (let i = 0; i < segmentCount; i++) {
    const duration = parseFloat((Math.random() * 8 + 2).toFixed(3));
    totalDuration += duration;
    segments.push(`#EXTINF:${duration},`);
    segments.push(`https://fake-cdn${Math.floor(Math.random() * 3) + 1}.stream-protect.net/${baseUrl}/segment${i}.ts?token=${crypto.randomBytes(24).toString('hex')}`);
    
    if (i % 10 === 0 && i > 0) {
      segments.push(`#EXT-X-DISCONTINUITY`);
    }
  }
  
  segments.push('#EXT-X-ENDLIST');
  segments.push(`# Total Duration: ${totalDuration.toFixed(3)}`);
  segments.push(`# Generated: ${new Date().toISOString()}`);
  
  return segments.join('\n');
}

function detectScraper(headers: Headers, ip: string): boolean {
  const userAgent = headers.get('user-agent') || '';
  const referer = headers.get('referer');
  const acceptLanguage = headers.get('accept-language');
  
  const suspiciousUA = [
    'python', 'wget', 'curl', 'scraper', 'bot', 'spider', 
    'crawl', 'fetch', 'http', 'request', 'axios', 'postman'
  ];
  
  for (const pattern of suspiciousUA) {
    if (userAgent.toLowerCase().includes(pattern)) {
      detectedScrapers.set(ip, Date.now());
      return true;
    }
  }
  
  if (!acceptLanguage || !referer) {
    const count = (detectedScrapers.get(ip) || 0) + 1;
    if (count > 3) {
      detectedScrapers.set(ip, Date.now());
      return true;
    }
  }
  
  return false;
}

export async function GET(request: NextRequest, { params }: { params: { slug: string[] } }) {
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  const isScraper = detectScraper(request.headers, ip);
  
  if (detectedScrapers.has(ip) && Date.now() - (detectedScrapers.get(ip) || 0) < 3600000) {
    const honeypot = {
      error: 'Rate limit exceeded',
      retry_after: 3600,
      tracking_id: crypto.randomBytes(32).toString('hex')
    };
    honeypotData.set(ip, { timestamp: Date.now(), data: honeypot });
    return NextResponse.json(honeypot, { status: 429 });
  }
  
  const delay = Math.floor(Math.random() * 1200) + 300;
  if (isScraper) {
    await new Promise(resolve => setTimeout(resolve, delay * 3));
  } else {
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format');
  const path = params.slug?.join('/') || 'stream';
  
  if (path.endsWith('.m3u8') || format === 'm3u8') {
    const m3u8Content = generateRealisticM3U8(params.slug || ['stream']);
    return new NextResponse(m3u8Content, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Cache-Control': 'private, no-cache, no-store',
        'X-Decoy-Stream': 'true',
        'X-Request-ID': crypto.randomBytes(16).toString('hex'),
        'ETag': `"${crypto.randomBytes(16).toString('hex')}"`,
      }
    });
  }
  
  const decoyData = {
    endpoint: path,
    stream_id: crypto.randomBytes(16).toString('hex'),
    manifest: `/${path}/${crypto.randomBytes(8).toString('hex')}.m3u8`,
    master_playlist: {
      uri: `https://stream-cdn.protect.net/${path}/master.m3u8`,
      variants: [
        {
          bandwidth: 5000000,
          resolution: '1920x1080',
          codecs: 'avc1.640028,mp4a.40.2',
          uri: `https://stream-cdn.protect.net/${path}/1080p.m3u8`
        },
        {
          bandwidth: 2500000,
          resolution: '1280x720',
          codecs: 'avc1.64001f,mp4a.40.2',
          uri: `https://stream-cdn.protect.net/${path}/720p.m3u8`
        },
        {
          bandwidth: 1200000,
          resolution: '854x480',
          codecs: 'avc1.64001e,mp4a.40.2',
          uri: `https://stream-cdn.protect.net/${path}/480p.m3u8`
        }
      ]
    },
    segments: Array.from({ length: Math.floor(Math.random() * 20) + 10 }, (_, i) => ({
      sequence: i,
      duration: parseFloat((Math.random() * 8 + 2).toFixed(3)),
      uri: `https://segment-cdn${i % 3}.protect.net/${path}/seg${i}.ts`,
      size: Math.floor(Math.random() * 800000) + 200000,
      key: {
        method: 'AES-128',
        uri: `/api/decoy-key/${crypto.randomBytes(8).toString('hex')}`,
        iv: crypto.randomBytes(16).toString('hex')
      }
    })),
    protection: {
      encrypted: true,
      drm: {
        widevine: {
          pssh: btoa(crypto.randomBytes(128).toString('hex')),
          license_url: `https://license.protect.net/widevine/${crypto.randomBytes(16).toString('hex')}`
        },
        fairplay: {
          certificate_url: `https://license.protect.net/fairplay/cert/${crypto.randomBytes(16).toString('hex')}`,
          license_url: `https://license.protect.net/fairplay/license/${crypto.randomBytes(16).toString('hex')}`
        }
      },
      token: crypto.randomBytes(64).toString('base64url'),
      session: crypto.randomBytes(32).toString('hex'),
      expires: Date.now() + 3600000
    },
    metadata: {
      duration: Math.floor(Math.random() * 7200) + 600,
      title: `Protected Stream ${Math.floor(Math.random() * 1000)}`,
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
      size: Math.floor(Math.random() * 1000000000) + 100000000
    },
    cdn: [
      `https://edge1.cdn-protect.net`,
      `https://edge2.cdn-protect.net`,
      `https://edge3.cdn-protect.net`,
      `https://edge4.cdn-protect.net`
    ],
    analytics: {
      session_id: crypto.randomBytes(24).toString('hex'),
      timestamp: Date.now(),
      region: 'us-west-2',
      edge_server: `edge${Math.floor(Math.random() * 100)}.protect.net`
    },
    access_control: {
      geo_restriction: ['US', 'CA', 'GB', 'AU'],
      ip_whitelist: false,
      require_auth: true,
      max_concurrent_streams: 3
    }
  };

  if (Math.random() < 0.1) {
    return NextResponse.json(
      { 
        error: 'Stream temporarily unavailable', 
        code: 'STREAM_UNAVAILABLE',
        retry_after: Math.floor(Math.random() * 30) + 10,
        support_id: crypto.randomBytes(16).toString('hex')
      },
      { status: 503 }
    );
  }

  return NextResponse.json(decoyData, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      'X-Decoy-Endpoint': 'true',
      'X-Stream-Type': 'protected',
      'X-Response-Time': `${delay}ms`,
      'X-Request-ID': crypto.randomBytes(16).toString('hex'),
      'ETag': `W/"${crypto.randomBytes(16).toString('hex')}"`,
    }
  });
}

export async function POST(request: NextRequest, { params }: { params: { slug: string[] } }) {
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  
  if (detectedScrapers.has(ip)) {
    return new NextResponse('Forbidden', { status: 403 });
  }
  
  const delay = Math.floor(Math.random() * 600) + 200;
  await new Promise(resolve => setTimeout(resolve, delay));

  try {
    const body = await request.json();
    
    const response = {
      success: true,
      received: Object.keys(body).length,
      processed: true,
      stream_token: crypto.randomBytes(32).toString('hex'),
      session: crypto.randomBytes(24).toString('hex'),
      timestamp: Date.now(),
      next_request: `/api/decoy-${crypto.randomBytes(8).toString('hex')}`,
      validation: {
        token: crypto.randomBytes(48).toString('base64url'),
        expires: Date.now() + 300000
      }
    };
    
    return NextResponse.json(response, { 
      status: 200,
      headers: {
        'X-Decoy-Post': 'true',
        'X-Session-Token': crypto.randomBytes(32).toString('hex'),
        'Content-Type': 'application/json'
      }
    });
  } catch {
    return NextResponse.json({
      success: true,
      empty_body: true,
      timestamp: Date.now(),
      token: crypto.randomBytes(32).toString('hex')
    }, { status: 200 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': '*',
      'X-Decoy-Options': 'true',
    }
  });
}
