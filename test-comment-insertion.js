import fetch from 'node-fetch';

async function testAddComment() {
  console.log('🧪 Testing comment addition...');
  
  const testComment = {
    userName: 'Test User',
    content: 'This is a test comment to check if insertion works',
    episodeViewing: 1
  };
  
  try {
    // Add comment via API
    console.log('📤 Sending comment to API...');
    const response = await fetch('http://localhost:9002/api/comments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testComment)
    });
    
    const result = await response.json();
    console.log('📨 API Response:', result);
    
    if (result.success) {
      console.log(`✅ Comment added successfully to ${result.database}`);
      console.log(`📝 Comment ID: ${result.comment.id}`);
      console.log(`👤 User: ${result.comment.userName}`);
      console.log(`📄 Content: ${result.comment.content}`);
      console.log(`✅ Approved: ${result.comment.isApproved}`);
      
      // Now check if it appears in the admin view
      console.log('\n🔍 Checking admin view...');
      const adminResponse = await fetch('http://localhost:9002/api/comments/admin?password=826264');
      const adminResult = await adminResponse.json();
      
      if (adminResult.success) {
        const foundComment = adminResult.comments.find(c => c.id === result.comment.id);
        if (foundComment) {
          console.log('✅ Comment found in admin view!');
          console.log(`📊 Total comments in DB: ${adminResult.comments.length}`);
        } else {
          console.log('❌ Comment NOT found in admin view!');
          console.log(`📊 Total comments in DB: ${adminResult.comments.length}`);
          console.log('🔍 Recent comments in DB:');
          adminResult.comments.slice(0, 3).forEach((comment, index) => {
            console.log(`   ${index + 1}. ${comment.userName}: ${comment.content.substring(0, 30)}...`);
          });
        }
      } else {
        console.log('❌ Failed to fetch admin comments:', adminResult.error);
      }
      
    } else {
      console.log('❌ Failed to add comment:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAddComment();
