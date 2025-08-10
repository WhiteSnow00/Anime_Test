// Service Worker for masking video segment URLs
const CACHE_NAME = 'video-cache-v1';
const urlMap = new Map();

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  const url = event.request.url;
  
  // Intercept segment requests
  if (url.includes('/api/masked-segment/')) {
    event.respondWith(handleMaskedSegment(event.request));
    return;
  }
  
  // Let other requests pass through
  event.respondWith(fetch(event.request));
});

async function handleMaskedSegment(request) {
  const url = new URL(request.url);
  const segmentId = url.searchParams.get('id');
  
  // Get the real URL from our map
  const realUrl = urlMap.get(segmentId);
  
  if (!realUrl) {
    return new Response('Not found', { status: 404 });
  }
  
  // Fetch from real CDN
  try {
    const response = await fetch(realUrl, {
      headers: {
        'Range': request.headers.get('Range') || '',
      }
    });
    
    // Return the real content but DevTools shows masked URL
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: {
        'Content-Type': 'video/mp2t',
        'Content-Length': response.headers.get('Content-Length') || '',
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=3600',
      }
    });
  } catch (error) {
    return new Response('Error fetching segment', { status: 500 });
  }
}

// Listen for messages from main thread to register URL mappings
self.addEventListener('message', (event) => {
  if (event.data.type === 'REGISTER_URL') {
    urlMap.set(event.data.id, event.data.url);
  }
});
