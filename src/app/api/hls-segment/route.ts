import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const url = searchParams.get('url');
    const userAgent = request.headers.get('user-agent') || '';
    const isMobile = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
    const isAndroid = /android/i.test(userAgent);

    if (!url) {
      return NextResponse.json(
        { error: 'URL parameter is required' },
        { status: 400 }
      );
    }

    if (!url.includes('tiktokcdn.com') && !url.includes('backblazeb2.com') && !url.includes('play.ninoyo.com')) {
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
        // Android devices need even longer timeouts due to error 224003 issues
        const timeout = isAndroid ? 50000 : (isMobile ? 40000 : 30000);
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'Accept': '*/*',
            'User-Agent': isAndroid
              ? 'Mozilla/5.0 (Linux; Android 10; SM-G973F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Mobile Safari/537.36'
              : (isMobile
                ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1'
                : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'),
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'identity',
            'Connection': 'keep-alive',
            'Cache-Control': isAndroid ? 'max-age=0' : 'no-cache',
            'Pragma': isAndroid ? 'no-cache' : 'no-cache',
            ...(url.includes('tiktokcdn.com') ? {
              'Referer': 'https://tiktok.com/',
              'Origin': 'https://tiktok.com'
            } : {})
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

          // Longer delay for Android and mobile connections
          if (attempt < 3) {
            const delay = isAndroid ? Math.pow(2, attempt) * 2000 : (isMobile ? Math.pow(2, attempt) * 1500 : Math.pow(2, attempt) * 1000);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }
      } catch (error) {
        lastError = error;
        console.warn(`Attempt ${attempt} failed:`, error);
        if (attempt < 3) {
          // Longer delay for Android and mobile connections
          const delay = isAndroid ? Math.pow(2, attempt) * 2000 : (isMobile ? Math.pow(2, attempt) * 1500 : Math.pow(2, attempt) * 1000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    if (!response || !response.ok) {
      console.error('Failed to fetch segment after all attempts:', lastError);
      return NextResponse.json(
        { error: `Failed to fetch segment: ${(lastError as any)?.message || 'Unknown error'}` },
        { status: response?.status || 500 }
      );
    }
    const segmentData = await response.arrayBuffer();
    const headers = new Headers({
      'Content-Type': response.headers.get('Content-Type') || 'video/mp2t',
      'Content-Length': segmentData.byteLength.toString(),
      'Cache-Control': isMobile ? 'public, max-age=1800' : 'public, max-age=3600',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Type',
      'Accept-Ranges': 'bytes',
      'X-Mobile-Optimized': isMobile ? 'true' : 'false',
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
