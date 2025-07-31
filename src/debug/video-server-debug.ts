/**
 * Video Server Debug Script
 * Use this to debug and validate video server URLs and identify issues
 */

import { animeData } from '@/data/anime';
import { 
  generateVideoUrl, 
  validateEpisodeServers, 
  ServerType,
  checkVideoUrl,
  updateServerStatus
} from '@/lib/video-server-utils';

export interface DebugResult {
  episode: number;
  server: ServerType;
  videoId: string;
  generatedUrl: string;
  isValid: boolean;
  error?: string;
  responseStatus?: number;
}

/**
 * Debug all episodes and servers
 */
export async function debugAllServers(): Promise<DebugResult[]> {
  const results: DebugResult[] = [];
  
  console.log('🔍 Starting comprehensive video server debugging...');
  console.log(`Testing ${animeData.episodes.length} episodes across all servers\n`);

  for (const episode of animeData.episodes) {
    console.log(`📺 Testing Episode ${episode.id}: ${episode.title}`);
    
    // Validate episode server data first
    const validation = validateEpisodeServers(episode);
    console.log(`   Validation results:`, validation);
    
    // Test each server
    const servers: ServerType[] = ['hls', 'helvid', 'hydax'];
    
    for (const server of servers) {
      const videoId = episode.servers[server];
      
      if (!videoId) {
        console.log(`   ❌ ${server}: No video ID available`);
        continue;
      }
      
      console.log(`   🔗 Testing ${server} with ID: ${videoId}`);
      
      try {
        const generatedUrl = generateVideoUrl(server, videoId);
        console.log(`      Generated URL: ${generatedUrl}`);
        
        const result: DebugResult = {
          episode: episode.id,
          server,
          videoId,
          generatedUrl,
          isValid: validation[server]
        };
        
        // For iframe-based servers, we can't directly test due to CORS
        // But we can analyze the URL structure
        if (server === 'helvid' || server === 'hydax') {
          result.isValid = validation[server];
          if (!validation[server]) {
            result.error = `Invalid ${server} ID format: ${videoId}`;
          }
        } else if (server === 'hls') {
          // Test HLS URLs directly
          try {
            const isWorking = await checkVideoUrl(generatedUrl, 5000);
            result.isValid = isWorking;
            if (!isWorking) {
              result.error = 'HLS endpoint not accessible';
            }
          } catch (error) {
            result.isValid = false;
            result.error = `HLS test failed: ${error}`;
          }
        }
        
        results.push(result);
        
        const status = result.isValid ? '✅ VALID' : '❌ INVALID';
        console.log(`      ${status} ${result.error ? `- ${result.error}` : ''}`);
        
      } catch (error) {
        console.log(`      ❌ ERROR: ${error}`);
        results.push({
          episode: episode.id,
          server,
          videoId,
          generatedUrl: '',
          isValid: false,
          error: String(error)
        });
      }
    }
    
    console.log(''); // Empty line for readability
  }
  
  return results;
}

/**
 * Generate debug report
 */
export function generateDebugReport(results: DebugResult[]): string {
  const report = [];
  
  report.push('# Video Server Debug Report');
  report.push(`Generated: ${new Date().toISOString()}`);
  report.push('');
  
  // Summary
  const totalTests = results.length;
  const validTests = results.filter(r => r.isValid).length;
  const invalidTests = totalTests - validTests;
  
  report.push('## Summary');
  report.push(`- Total tests: ${totalTests}`);
  report.push(`- Valid: ${validTests}`);
  report.push(`- Invalid: ${invalidTests}`);
  report.push(`- Success rate: ${((validTests / totalTests) * 100).toFixed(1)}%`);
  report.push('');
  
  // Server-specific results
  const servers: ServerType[] = ['hls', 'helvid', 'hydax'];
  
  report.push('## Results by Server');
  
  servers.forEach(server => {
    const serverResults = results.filter(r => r.server === server);
    const serverValid = serverResults.filter(r => r.isValid).length;
    const serverTotal = serverResults.length;
    
    report.push(`### ${server.toUpperCase()}`);
    report.push(`- Valid: ${serverValid}/${serverTotal}`);
    report.push(`- Success rate: ${((serverValid / serverTotal) * 100).toFixed(1)}%`);
    
    const invalidResults = serverResults.filter(r => !r.isValid);
    if (invalidResults.length > 0) {
      report.push('- Issues:');
      invalidResults.forEach(result => {
        report.push(`  - Episode ${result.episode}: ${result.error || 'Unknown error'}`);
      });
    }
    report.push('');
  });
  
  // Episode-specific results
  report.push('## Results by Episode');
  
  const episodes = [...new Set(results.map(r => r.episode))].sort((a, b) => a - b);
  
  episodes.forEach(episodeId => {
    const episodeResults = results.filter(r => r.episode === episodeId);
    const episodeValid = episodeResults.filter(r => r.isValid).length;
    const episodeTotal = episodeResults.length;
    
    report.push(`### Episode ${episodeId}`);
    report.push(`- Valid servers: ${episodeValid}/${episodeTotal}`);
    
    episodeResults.forEach(result => {
      const status = result.isValid ? '✅' : '❌';
      const error = result.error ? ` (${result.error})` : '';
      report.push(`  - ${result.server}: ${status}${error}`);
    });
    report.push('');
  });
  
  // Detailed URLs
  report.push('## Generated URLs');
  results.forEach(result => {
    const status = result.isValid ? '✅' : '❌';
    report.push(`${status} Episode ${result.episode} - ${result.server}: ${result.generatedUrl}`);
  });
  
  return report.join('\n');
}

/**
 * Check specific Helvid URLs against the working pattern
 */
export function debugHelvidPattern(): void {
  console.log('🔍 Debugging Helvid URL patterns...\n');
  
  const episodes = animeData.episodes;
  const workingEpisode1 = episodes.find(ep => ep.id === 1);
  
  if (!workingEpisode1) {
    console.log('❌ Episode 1 not found');
    return;
  }
  
  console.log('📺 Episode 1 (WORKING):');
  console.log(`   Video ID: ${workingEpisode1.servers.helvid}`);
  console.log(`   Generated URL: ${generateVideoUrl('helvid', workingEpisode1.servers.helvid)}`);
  console.log(`   Pattern: 12-character hex string`);
  console.log('');
  
  episodes.slice(1).forEach(episode => {
    console.log(`📺 Episode ${episode.id} (PROBLEMATIC):`);
    console.log(`   Video ID: ${episode.servers.helvid}`);
    console.log(`   Generated URL: ${generateVideoUrl('helvid', episode.servers.helvid)}`);
    
    // Compare pattern
    const pattern = /^[a-f0-9]{12}$/;
    const isValidPattern = pattern.test(episode.servers.helvid);
    console.log(`   Pattern match: ${isValidPattern ? '✅' : '❌'}`);
    
    if (!isValidPattern) {
      console.log(`   ⚠️  Pattern mismatch - expected 12 hex chars, got: ${episode.servers.helvid}`);
    }
    
    console.log('');
  });
}

/**
 * Test specific URLs manually
 */
export function testSpecificUrls(): void {
  console.log('🔍 Testing specific problematic URLs...\n');
  
  const testUrls = [
    // Episode 1 (working)
    'https://helvid.net/play/index/8c8edb8924a8',
    // Episode 2 (404)
    'https://helvid.net/play/index/34ebbd8b7a07',
    // Episode 3 (404)
    'https://helvid.net/play/index/50909806cf25',
    // Episode 4 (404)
    'https://helvid.net/play/index/28b0a006506a',
  ];
  
  testUrls.forEach((url, index) => {
    console.log(`🔗 Testing URL ${index + 1}: ${url}`);
    console.log(`   This would be loaded in an iframe - manual testing required`);
    console.log('');
  });
  
  console.log('💡 To test these URLs:');
  console.log('1. Open each URL in a new browser tab');
  console.log('2. Check if the video player loads');
  console.log('3. Look for any error messages or 404 pages');
  console.log('4. Compare the behavior between Episode 1 (working) and others');
}

/**
 * Run all debug functions
 */
export async function runFullDebug(): Promise<void> {
  console.log('🚀 Starting full video server debug session...\n');
  
  // 1. Debug Helvid patterns
  debugHelvidPattern();
  
  // 2. Test specific URLs
  testSpecificUrls();
  
  // 3. Run comprehensive tests
  const results = await debugAllServers();
  
  // 4. Generate report
  const report = generateDebugReport(results);
  console.log(report);
  
  // 5. Save report to local storage for later reference
  if (typeof window !== 'undefined') {
    localStorage.setItem('video-server-debug-report', report);
    console.log('\n📄 Debug report saved to localStorage as "video-server-debug-report"');
  }
}

// Export for use in browser console
if (typeof window !== 'undefined') {
  (window as any).videoServerDebug = {
    debugAllServers,
    generateDebugReport,
    debugHelvidPattern,
    testSpecificUrls,
    runFullDebug
  };
}
