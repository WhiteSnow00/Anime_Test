import { NextRequest, NextResponse } from 'next/server';

/**
 * Dynamic Decoy API Route
 * Handles random decoy endpoints to create fake network traffic
 */

export async function GET(request: NextRequest, { params }: { params: { slug: string[] } }) {
  // Generate random delay to simulate real processing
  const delay = Math.floor(Math.random() * 600) + 200;
  await new Promise(resolve => setTimeout(resolve, delay));

  const { searchParams } = new URL(request.url);
  const fake = searchParams.get('fake');
  
  // Generate realistic but fake streaming data
  const decoyData = {
    endpoint: params.slug?.join('/') || 'unknown',
    stream_id: `fake_${Math.random().toString(36).substring(2)}`,
    manifest: `fake-manifest-${Date.now()}.m3u8`,
    segments: Array.from({ length: Math.floor(Math.random() * 15) + 8 }, (_, i) => ({
      sequence: i,
      duration: (Math.random() * 8 + 2).toFixed(3),
      uri: `fake-segment-${i}-${Math.random().toString(36).substring(2)}.ts`,
      size: Math.floor(Math.random() * 500000) + 100000
    })),
    bitrates: [
      { resolution: '1920x1080', bandwidth: 5000000 },
      { resolution: '1280x720', bandwidth: 2500000 },
      { resolution: '854x480', bandwidth: 1200000 }
    ],
    protection: {
      encrypted: true,
      drm: 'fake-protection',
      token: fake || `fake_token_${Math.random().toString(36)}`
    },
    metadata: {
      duration: Math.floor(Math.random() * 3600) + 1200,
      title: `Decoy Stream ${Math.floor(Math.random() * 100)}`,
      created: new Date().toISOString()
    },
    cdn: [
      `cdn1.fake-domain.com`,
      `cdn2.fake-domain.com`,
      `cdn3.fake-domain.com`
    ],
    analytics: {
      session_id: Math.random().toString(36),
      timestamp: Date.now(),
      client_ip: 'xxx.xxx.xxx.xxx',
      user_agent: 'decoy-agent'
    }
  };

  // Sometimes return errors to make it more realistic
  if (Math.random() < 0.15) {
    return NextResponse.json(
      { 
        error: 'Resource temporarily unavailable', 
        code: 'TEMP_UNAVAILABLE',
        retry_after: Math.floor(Math.random() * 10) + 5
      },
      { status: 503 }
    );
  }

  return NextResponse.json(decoyData, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-Decoy-Endpoint': 'true',
      'X-Stream-Type': 'fake',
      'X-Response-Time': `${delay}ms`,
      'Access-Control-Allow-Origin': '*',
    }
  });
}

export async function POST(request: NextRequest) {
  const delay = Math.floor(Math.random() * 400) + 100;
  await new Promise(resolve => setTimeout(resolve, delay));

  try {
    const body = await request.json();
    
    return NextResponse.json({
      success: true,
      received: Object.keys(body).length,
      processed: true,
      decoy: true,
      timestamp: Date.now(),
      session: Math.random().toString(36)
    }, { 
      status: 200,
      headers: {
        'X-Decoy-Post': 'true',
        'Content-Type': 'application/json'
      }
    });
  } catch {
    return NextResponse.json({
      success: true,
      decoy: true,
      empty_body: true,
      timestamp: Date.now()
    }, { status: 200 });
  }
}
