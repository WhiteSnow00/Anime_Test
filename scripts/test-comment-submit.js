// Test comment submission on production
const testCommentSubmission = async (baseUrl) => {
  const testComment = {
    userName: "Test User",
    content: "Test comment from production debug script",
    episodeViewing: 1
  };

  console.log('🧪 Testing comment submission on production...\n');
  console.log('📝 Submitting test comment:', testComment);

  try {
    const response = await fetch(`${baseUrl}/api/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: JSON.stringify(testComment)
    });

    console.log(`\n📊 Response Status: ${response.status}`);
    console.log(`📊 Response Headers:`, Object.fromEntries(response.headers.entries()));

    const responseData = await response.json();
    console.log(`\n📄 Response Body:`, JSON.stringify(responseData, null, 2));

    if (response.status === 200 || response.status === 201) {
      console.log('\n✅ Comment submission successful!');
    } else {
      console.log('\n❌ Comment submission failed!');
      console.log('🔍 Error analysis:');
      
      if (responseData.message) {
        console.log(`   Error Message: ${responseData.message}`);
      }
      if (responseData.debug) {
        console.log(`   Debug Info:`, JSON.stringify(responseData.debug, null, 2));
      }
      
      // Analyze common issues
      if (response.status === 503) {
        console.log('   🔧 This is a database connection error');
      } else if (response.status === 400) {
        console.log('   🔧 This is a validation error');
      } else if (response.status === 500) {
        console.log('   🔧 This is a server error');
      }
    }

  } catch (error) {
    console.log('\n💥 Network or parsing error:', error.message);
  }

  // Also test if we can read comments after
  console.log('\n' + '='.repeat(50));
  console.log('📖 Testing if we can still read comments...');
  
  try {
    const getResponse = await fetch(`${baseUrl}/api/comments`);
    const comments = await getResponse.json();
    console.log(`✅ GET comments status: ${getResponse.status}`);
    console.log(`📊 Total comments: ${comments.count || 0}`);
  } catch (error) {
    console.log(`❌ GET comments failed: ${error.message}`);
  }
};

const deploymentUrl = process.argv[2] || 'https://anime-kana.vercel.app';
testCommentSubmission(deploymentUrl);
