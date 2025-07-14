const { MongoClient } = require('mongodb');

async function checkMongoDB() {
  const uri = 'mongodb+srv://kazenosakura100:animelovefanam1@ayaya.jtefs5i.mongodb.net/';
  const client = new MongoClient(uri);
  
  try {
    console.log('Connecting to MongoDB Atlas...');
    await client.connect();
    console.log('✅ Connected to MongoDB Atlas');
    
    const db = client.db('anime_streaming');
    const collection = db.collection('comments');
    
    const count = await collection.countDocuments();
    console.log(`📊 Total comments in MongoDB: ${count}`);
    
    if (count > 0) {
      const sampleComments = await collection.find().limit(5).toArray();
      console.log('\n📝 Sample comments:');
      sampleComments.forEach((comment, index) => {
        console.log(`${index + 1}. ${comment.userName}: ${comment.content?.substring(0, 50)}...`);
        console.log(`   ID: ${comment.id}, Approved: ${comment.isApproved}`);
      });
    } else {
      console.log('ℹ️ No comments found in MongoDB');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
    console.log('Disconnected from MongoDB');
  }
}

checkMongoDB();
