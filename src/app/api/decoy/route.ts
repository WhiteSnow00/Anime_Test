import { NextRequest, NextResponse } from 'next/server';

/**
 * Decoy API Route
 * Creates fake network traffic to confuse stream tracking attempts
 */

export async function GET(request: NextRequest) {
  // Generate random delay between 100-500ms to simulate real requests
  const delay = Math.floor(Math.random() * 400) + 100;
  
  await new Promise(resolve => setTimeout(resolve, delay));

  // Return fake streaming-like response
  const fakeResponse = {
    stream: `decoy-${Math.random().toString(36).substring(2)}`,
    url: `blob:${Math.random().toString(36)}`,
    segments: Array.from({ length: Math.floor(Math.random() * 10) + 5 }, (_, i) => ({
      id: i,
      duration: Math.random() * 10 + 2,
      url: `fake-segment-${i}-${Math.random().toString(36)}`
    })),
    timestamp: Date.now(),
    protected: true
  };

  return NextResponse.json(fakeResponse, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-cache',
      'X-Decoy-Response': 'true',
    }
  });
}

export async function POST(request: NextRequest) {
  // Handle fake POST requests
  const delay = Math.floor(Math.random() * 300) + 50;
  await new Promise(resolve => setTimeout(resolve, delay));

  return NextResponse.json(
    { success: true, decoy: true, timestamp: Date.now() },
    { status: 200 }
  );
}
