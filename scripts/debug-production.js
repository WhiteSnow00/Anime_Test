// Production debugging script
// Run this after deployment to check if your endpoints are working

const testEndpoints = async (baseUrl) => {
  if (!baseUrl) {
    console.log('❌ Please provide your Vercel deployment URL');
    console.log('Usage: node scripts/debug-production.js https://your-app.vercel.app');
    return;
  }

  console.log(`🔍 Testing endpoints for: ${baseUrl}\n`);

  // Test health endpoint
  try {
    console.log('🩺 Testing health endpoint...');
    const healthResponse = await fetch(`${baseUrl}/api/health`);
    const healthData = await healthResponse.json();
    
    console.log(`   Status: ${healthResponse.status}`);
    console.log(`   Response:`, JSON.stringify(healthData, null, 2));
  } catch (error) {
    console.log(`   ❌ Health endpoint failed: ${error.message}`);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test comments GET
  try {
    console.log('💬 Testing comments GET endpoint...');
    const commentsResponse = await fetch(`${baseUrl}/api/comments`);
    const commentsData = await commentsResponse.json();
    
    console.log(`   Status: ${commentsResponse.status}`);
    console.log(`   Response:`, JSON.stringify(commentsData, null, 2));
  } catch (error) {
    console.log(`   ❌ Comments GET failed: ${error.message}`);
  }

  console.log('\n' + '='.repeat(50) + '\n');

  // Test debug endpoint (if enabled)
  try {
    console.log('🐛 Testing debug endpoint...');
    const debugResponse = await fetch(`${baseUrl}/api/debug`);
    const debugData = await debugResponse.json();
    
    console.log(`   Status: ${debugResponse.status}`);
    if (debugResponse.status === 403) {
      console.log('   ℹ️  Debug endpoint disabled in production (this is normal)');
    } else {
      console.log(`   Response:`, JSON.stringify(debugData, null, 2));
    }
  } catch (error) {
    console.log(`   ❌ Debug endpoint failed: ${error.message}`);
  }

  console.log('\n🔧 Next steps if endpoints are failing:');
  console.log('1. Check Vercel Function logs in your dashboard');
  console.log('2. Verify environment variables are set in Vercel');
  console.log('3. Check if MongoDB Atlas allows connections from 0.0.0.0/0');
  console.log('4. Verify MONGODB_URI format includes username and password');
};

// Get URL from command line argument
const deploymentUrl = process.argv[2];
testEndpoints(deploymentUrl);
