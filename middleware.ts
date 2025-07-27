import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Next.js Middleware for URL Parameter Cleaning
 * Removes tracking parameters while preserving functional parameters
 * Maintains SEO value with 301 redirects
 */

// Tracking parameters to remove (expandable list)
const TRACKING_PARAMETERS = new Set([
  // Facebook tracking
  'fbclid',
  'fb_action_ids',
  'fb_action_types',
  'fb_source',
  'fb_ref',
  
  // Google tracking  
  'gclid',
  'gclsrc',
  'dclid',
  
  // UTM parameters (marketing tracking)
  'utm_source',
  'utm_medium', 
  'utm_campaign',
  'utm_term',
  'utm_content',
  'utm_id',
  
  // Other common tracking parameters
  'mc_cid',    // MailChimp
  'mc_eid',    // MailChimp
  '_hsenc',    // HubSpot
  '_hsmi',     // HubSpot
  'hsCtaTracking', // HubSpot
  'ref',       // Generic referrer
  'source',    // Generic source
  'campaign',  // Generic campaign
  'medium',    // Generic medium
]);

// Functional parameters that must be preserved (based on your app analysis)
const FUNCTIONAL_PARAMETERS = new Set([
  // Download redirect functionality
  'url',
  'filename', 
  'type',
  'episodeId',
  
  // Common functional parameters
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
  
  // Add any additional functional parameters your app uses
]);

/**
 * Determines if a parameter should be preserved
 */
function shouldPreserveParameter(paramName: string, paramValue: string): boolean {
  // Always preserve functional parameters
  if (FUNCTIONAL_PARAMETERS.has(paramName.toLowerCase())) {
    return true;
  }
  
  // Remove known tracking parameters
  if (TRACKING_PARAMETERS.has(paramName.toLowerCase())) {
    return false;
  }
  
  // For unknown parameters, preserve them to be safe
  // This ensures we don't break functionality for parameters we haven't considered
  return true;
}

/**
 * Cleans URL by removing tracking parameters
 */
function cleanUrl(url: URL): { cleanedUrl: URL; hasChanges: boolean } {
  const cleanedUrl = new URL(url.toString());
  const originalParams = Array.from(url.searchParams.entries());
  
  // Clear all parameters
  cleanedUrl.search = '';
  
  let hasChanges = false;
  
  // Re-add only the parameters we want to keep
  for (const [paramName, paramValue] of originalParams) {
    if (shouldPreserveParameter(paramName, paramValue)) {
      cleanedUrl.searchParams.set(paramName, paramValue);
    } else {
      hasChanges = true;
      // Log removed parameters in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`🧹 Removed tracking parameter: ${paramName}=${paramValue}`);
      }
    }
  }
  
  return { cleanedUrl, hasChanges };
}

/**
 * Main middleware function
 */
export function middleware(request: NextRequest) {
  const requestUrl = request.nextUrl;
  
  // Skip processing for certain paths to improve performance
  const pathname = requestUrl.pathname;
  
  // Skip API routes, static files, and Next.js internal routes
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('.')  // Skip files with extensions
  ) {
    return NextResponse.next();
  }
  
  // Only process URLs with query parameters
  if (!requestUrl.search || requestUrl.search === '?') {
    return NextResponse.next();
  }
  
  try {
    const { cleanedUrl, hasChanges } = cleanUrl(requestUrl);
    
    // If we removed any parameters, redirect to clean URL
    if (hasChanges) {
      // Use 301 redirect for SEO preservation
      const response = NextResponse.redirect(cleanedUrl, 301);
      
      // Add cache headers to improve performance
      response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
      
      // Log successful cleaning in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`🔗 URL cleaned: ${requestUrl.href} → ${cleanedUrl.href}`);
      }
      
      return response;
    }
    
    // No changes needed, continue normally
    return NextResponse.next();
    
  } catch (error) {
    // Log error but don't break the request
    console.error('❌ URL cleaning error:', error);
    return NextResponse.next();
  }
}
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.).*)',
  ],
}
