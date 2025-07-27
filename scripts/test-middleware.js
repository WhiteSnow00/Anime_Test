/**
 * Test Script for URL Cleaning Middleware
 * Run with: node scripts/test-middleware.js
 */

// Simulate the middleware logic for testing
const TRACKING_PARAMETERS = new Set([
  'fbclid', 'fb_action_ids', 'fb_action_types', 'fb_source', 'fb_ref',
  'gclid', 'gclsrc', 'dclid',
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'utm_id',
  'mc_cid', 'mc_eid', '_hsenc', '_hsmi', 'hsCtaTracking', 'ref', 'source', 'campaign', 'medium'
]);

const FUNCTIONAL_PARAMETERS = new Set([
  'url', 'filename', 'type', 'episodeId',
  'page', 'limit', 'sort', 'filter', 'q', 'search', 'id', 'tab', 'view', 'lang', 'locale'
]);

function shouldPreserveParameter(paramName, paramValue) {
  if (FUNCTIONAL_PARAMETERS.has(paramName.toLowerCase())) {
    return true;
  }
  if (TRACKING_PARAMETERS.has(paramName.toLowerCase())) {
    return false;
  }
  return true;
}

function testUrlCleaning(testUrl) {
  const url = new URL(testUrl);
  const originalParams = Array.from(url.searchParams.entries());
  
  url.search = '';
  let hasChanges = false;
  let removedParams = [];
  let preservedParams = [];
  
  for (const [paramName, paramValue] of originalParams) {
    if (shouldPreserveParameter(paramName, paramValue)) {
      url.searchParams.set(paramName, paramValue);
      preservedParams.push(`${paramName}=${paramValue}`);
    } else {
      hasChanges = true;
      removedParams.push(`${paramName}=${paramValue}`);
    }
  }
  
  return {
    original: testUrl,
    cleaned: url.href,
    hasChanges,
    removedParams,
    preservedParams
  };
}

// Test cases based on your website
const testCases = [
  // Facebook sharing
  'http://ayaya-kana.id.vn/?fbclid=IwAR1x2y3z4a5b6c7d8e9f0',
  
  // Download redirect with Facebook tracking
  'http://ayaya-kana.id.vn/download-redirect?url=https://drive.google.com&filename=Episode1&type=download&episodeId=1&fbclid=12345',
  
  // Multiple tracking parameters
  'http://ayaya-kana.id.vn/?utm_source=facebook&utm_medium=social&utm_campaign=anime&fbclid=123',
  
  // Google Ads with functional parameters
  'http://ayaya-kana.id.vn/anime?search=naruto&gclid=abc123&utm_source=google',
  
  // Clean URL (should not change)
  'http://ayaya-kana.id.vn/download-redirect?url=test&filename=test&episodeId=1',
  
  // No parameters
  'http://ayaya-kana.id.vn/',
];

console.log('🧪 Testing URL Cleaning Middleware\n');
console.log('='.repeat(80));

testCases.forEach((testUrl, index) => {
  const result = testUrlCleaning(testUrl);
  
  console.log(`\nTest ${index + 1}:`);
  console.log(`Original:  ${result.original}`);
  console.log(`Cleaned:   ${result.cleaned}`);
  console.log(`Changed:   ${result.hasChanges ? '✅ Yes' : '❌ No'}`);
  
  if (result.removedParams.length > 0) {
    console.log(`Removed:   ${result.removedParams.join(', ')}`);
  }
  
  if (result.preservedParams.length > 0) {
    console.log(`Preserved: ${result.preservedParams.join(', ')}`);
  }
  
  console.log('-'.repeat(80));
});

console.log('\n✅ All tests completed!');
console.log('\n📝 Key Points:');
console.log('- Functional parameters (url, filename, type, episodeId) are preserved');
console.log('- Tracking parameters (fbclid, gclid, utm_*) are removed');  
console.log('- Unknown parameters are preserved for safety');
console.log('- Clean URLs remain unchanged');
