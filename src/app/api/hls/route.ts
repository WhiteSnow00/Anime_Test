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
    const file = searchParams.get('file');
    
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

    // Construct file path
    const filePath = join(process.cwd(), 'src', 'm3u8', file);
    
    try {
      // Read the m3u8 file
      const fileContent = await readFile(filePath, 'utf8');
      
      // Set appropriate headers for HLS streaming
      const headers = new Headers({
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Range, Content-Type',
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

// Handle OPTIONS for CORS
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
