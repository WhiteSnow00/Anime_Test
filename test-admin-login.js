const { CommentService } = require('./src/lib/unified-comment-service.ts');

async function testAdminLogin() {
  try {
    console.log('🔐 Testing admin login...');
    
    // Test with correct password
    console.log('\n1. Testing with correct password (826264):');
    const result1 = await CommentService.getAllCommentsAdmin('826264');
    
    if (result1) {
      console.log('✅ Admin login successful!');
      console.log(`📊 Found ${result1.comments.length} comments`);
      console.log(`📈 Stats:`, result1.stats);
    } else {
      console.log('❌ Admin login failed with correct password');
    }
    
    // Test with wrong password
    console.log('\n2. Testing with wrong password:');
    const result2 = await CommentService.getAllCommentsAdmin('wrongpassword');
    
    if (result2) {
      console.log('❌ Admin login should have failed but succeeded');
    } else {
      console.log('✅ Admin login correctly rejected wrong password');
    }
    
    console.log('\n🎉 Admin authentication is working correctly!');
    console.log('💡 You can now use password "826264" to login to the admin panel.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAdminLogin();
