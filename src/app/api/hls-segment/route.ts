import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    
    if (!url) {
      return NextResponse.json(
        { error: 'URL parameter is required' },
        { status: 400 }
      );
    }

    if (!url.includes('tiktokcdn.com')) {
      return NextResponse.json(
        { error: 'Invalid URL domain' },
        { status: 403 }
      );
    }

    console.log('Proxying segment:', url);

    let response;
    let lastError;
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`Attempting to fetch segment (attempt ${attempt}/3):`, url);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); 
        
        response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'Accept': '*/*',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'identity', 
            'Connection': 'keep-alive',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache',
            'Referer': 'https://tiktok.com/',
            'Origin': 'https://tiktok.com'
          },
          credentials: 'omit'
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          console.log(`Successfully fetched segment on attempt ${attempt}`);
          break;
        } else {
          lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
          console.warn(`Attempt ${attempt} failed:`, lastError.message);
        }
      } catch (error) {
        lastError = error;
        console.warn(`Attempt ${attempt} failed:`, error);
        if (attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    if (!response || !response.ok) {
      console.error('Failed to fetch segment after all attempts:', lastError);
      return NextResponse.json(
        { error: `Failed to fetch segment: ${lastError?.message || 'Unknown error'}` },
        { status: response?.status || 500 }
      );
    }
    const segmentData = await response.arrayBuffer();
    const headers = new Headers({
      'Content-Type': response.headers.get('Content-Type') || 'video/mp2t',
      'Content-Length': segmentData.byteLength.toString(),
      'Cache-Control': 'public, max-age=3600', 
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Type',
      'Accept-Ranges': 'bytes',
    });
    const rangeHeader = request.headers.get('range');
    if (rangeHeader) {
      const range = rangeHeader.replace(/bytes=/, '').split('-');
      const start = parseInt(range[0], 10);
      const end = range[1] ? parseInt(range[1], 10) : segmentData.byteLength - 1;
      const chunkSize = (end - start) + 1;

      headers.set('Content-Range', `bytes ${start}-${end}/${segmentData.byteLength}`);
      headers.set('Content-Length', chunkSize.toString());

      const chunk = segmentData.slice(start, end + 1);
      return new NextResponse(chunk, {
        status: 206, 
        headers,
      });
    }

    return new NextResponse(segmentData, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('HLS Segment Proxy error:', error);
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
      'Access-Control-Allow-Headers': 'Range, Content-Type',
    },
  });
}
