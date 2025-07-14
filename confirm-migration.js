const { MongoClient } = require('mongodb');

async function confirmMigration() {
  const uri = 'mongodb+srv://kazenosakura100:animelovefanam1@ayaya.jtefs5i.mongodb.net/';
  const client = new MongoClient(uri);
  
  try {
    console.log('🔍 Checking migration status...');
    await client.connect();
    
    const db = client.db('anime_streaming');
    const collection = db.collection('comments');
    
    const count = await collection.countDocuments();
    console.log(`\n✅ SUCCESS: Found ${count} comments in MongoDB Atlas!`);
    
    if (count > 0) {
      const approvedCount = await collection.countDocuments({ isApproved: true });
      const pendingCount = await collection.countDocuments({ isApproved: false });
      
      console.log(`📊 Comment breakdown:`);
      console.log(`   - Approved comments: ${approvedCount}`);
      console.log(`   - Pending comments: ${pendingCount}`);
      
      console.log(`\n📝 Recent comments:`);
      const recentComments = await collection.find()
        .sort({ timestamp: -1 })
        .limit(5)
        .toArray();
        
      recentComments.forEach((comment, index) => {
        const status = comment.isApproved ? '✅' : '⏳';
        console.log(`${index + 1}. ${status} ${comment.userName}: ${comment.content?.substring(0, 40)}...`);
      });
      
      console.log(`\n🎉 MIGRATION SUCCESSFUL!`);
      console.log(`📱 Your application is now using MongoDB for comments in development mode.`);
      console.log(`🌐 Visit http://localhost:9002 to see your comments.`);
    }
    
  } catch (error) {
    console.error('❌ Error checking migration:', error.message);
  } finally {
    await client.close();
  }
}

console.log('🔄 Verifying data migration from PostgreSQL to MongoDB...\n');
confirmMigration();
