// Test toggle functionality
fetch('http://localhost:9002/api/comments/admin?password=826264')
  .then(response => response.json())
  .then(data => {
    console.log('Current comments:', data.comments.length);
    
    // Find an approved comment to test toggle
    const approvedComment = data.comments.find(c => c.isApproved);
    if (approvedComment) {
      console.log('Testing toggle on comment:', approvedComment.id);
      
      return fetch('http://localhost:9002/api/comments/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: '826264',
          action: 'toggle-approval',
          commentId: approvedComment.id
        })
      });
    }
  })
  .then(response => response.json())
  .then(result => {
    console.log('Toggle result:', result);
  })
  .catch(error => {
    console.error('Error:', error);
  });
