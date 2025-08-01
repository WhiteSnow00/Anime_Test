import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Middleware for cleaning URL tracking parameters while preserving functional ones
 */

const TRACKING_PARAMETERS = new Set([
  // Facebook
  'fbclid',
  'fb_action_ids',
  'fb_action_types',
  'fb_source',
  'fb_ref',
  
  // Google
  'gclid',
  'gclsrc',
  'dclid',
  
  // UTM
  'utm_source',
  'utm_medium', 
  'utm_campaign',
  'utm_term',
  'utm_content',
  'utm_id',
  
  // Other
  'mc_cid',
  'mc_eid',
  '_hsenc',
  '_hsmi',
  'hsCtaTracking',
  'ref',
  'source',
  'campaign',
  'medium',
]);

const FUNCTIONAL_PARAMETERS = new Set([
  // Download functionality
  'url',
  'filename', 
  'type',
  'episodeId',
  
  // Common parameters
  'page',
  'limit',
  'sort',
  'filter',
  'q',
  'search',
  'id',
  'tab',
  'view',
  'lang',
  'locale',
]);

function shouldPreserveParameter(paramName: string, paramValue: string): boolean {
  if (FUNCTIONAL_PARAMETERS.has(paramName.toLowerCase())) {
    return true;
  }
  
  if (TRACKING_PARAMETERS.has(paramName.toLowerCase())) {
    return false;
  }
  
  // Preserve unknown parameters to avoid breaking functionality
  return true;
}

function cleanUrl(url: URL): { cleanedUrl: URL; hasChanges: boolean } {
  const cleanedUrl = new URL(url.toString());
  const originalParams = Array.from(url.searchParams.entries());
  
  cleanedUrl.search = '';
  
  let hasChanges = false;
  
  for (const [paramName, paramValue] of originalParams) {
    if (shouldPreserveParameter(paramName, paramValue)) {
      cleanedUrl.searchParams.set(paramName, paramValue);
    } else {
      hasChanges = true;
      if (process.env.NODE_ENV === 'development') {
        console.log(`🧹 Removed tracking parameter: ${paramName}=${paramValue}`);
      }
    }
  }
  
  return { cleanedUrl, hasChanges };
}

export function middleware(request: NextRequest) {
  const requestUrl = request.nextUrl;
  const pathname = requestUrl.pathname;
  
  // Skip API routes, static files, and Next.js internal routes
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }
  
  // Only process URLs with query parameters
  if (!requestUrl.search || requestUrl.search === '?') {
    return NextResponse.next();
  }
  
  try {
    const { cleanedUrl, hasChanges } = cleanUrl(requestUrl);
    
    if (hasChanges) {
      // 301 redirect for SEO
      const response = NextResponse.redirect(cleanedUrl, 301);
      response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔗 URL cleaned: ${requestUrl.href} → ${cleanedUrl.href}`);
      }
      
      return response;
    }
    
    return NextResponse.next();
    
  } catch (error) {
    console.error('❌ URL cleaning error:', error);
    return NextResponse.next();
  }
}
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)',
  ],
}
