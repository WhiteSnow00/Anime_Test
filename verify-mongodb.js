const { MongoClient } = require('mongodb');

async function verifyMongoDB() {
  const uri = 'mongodb://localhost:27017';
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db('anime_comments');
    const collection = db.collection('comments');
    
    const count = await collection.countDocuments();
    console.log(`📊 Total comments in MongoDB: ${count}`);
    
    const sampleComments = await collection.find().limit(3).toArray();
    console.log('📝 Sample comments:');
    sampleComments.forEach((comment, index) => {
      console.log(`${index + 1}. ${comment.username}: ${comment.text.substring(0, 50)}...`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.close();
  }
}

verifyMongoDB();
