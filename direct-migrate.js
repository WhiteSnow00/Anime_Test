const { MongoClient } = require('mongodb');
const { Pool } = require('pg');

// Database configurations
const MONGODB_URI = 'mongodb+srv://kazenosakura100:animelovefanam1@ayaya.jtefs5i.mongodb.net/';
const MONGODB_DB_NAME = 'anime_streaming';

const POSTGRES_CONFIG = {
  user: 'neon_owner',
  host: 'ep-weathered-mode-a5cqjdw8.us-east-2.aws.neon.tech',
  database: 'ayayadb',
  password: 'animelovefanam1',
  port: 5432,
  ssl: { rejectUnauthorized: false }
};

async function migrateDirect() {
  const mongoClient = new MongoClient(MONGODB_URI);
  const pgPool = new Pool(POSTGRES_CONFIG);
  
  try {
    console.log('🔄 Starting direct migration...');
    
    // Connect to both databases
    await mongoClient.connect();
    console.log('✅ Connected to MongoDB');
    
    const pgClient = await pgPool.connect();
    console.log('✅ Connected to PostgreSQL');
    
    // Get MongoDB collections
    const mongoDB = mongoClient.db(MONGODB_DB_NAME);
    const commentsCollection = mongoDB.collection('comments');
    
    // Get current MongoDB data
    const mongoCount = await commentsCollection.countDocuments();
    console.log(`📊 Current MongoDB comments: ${mongoCount}`);
    
    // Fetch all comments from PostgreSQL
    const pgResult = await pgClient.query(`
      SELECT id, username, content, timestamp, is_approved, user_agent, ip_address, episode_viewing
      FROM comments 
      ORDER BY timestamp DESC
    `);
    
    console.log(`📊 PostgreSQL comments found: ${pgResult.rows.length}`);
    
    let migrated = 0;
    let skipped = 0;
    
    for (const row of pgResult.rows) {
      const comment = {
        id: row.id,
        userName: row.username,
        content: row.content,
        timestamp: new Date(row.timestamp),
        isApproved: row.is_approved,
        userAgent: row.user_agent || '',
        ipAddress: row.ip_address || '',
        episodeViewing: row.episode_viewing || null
      };
      
      // Check if comment already exists in MongoDB
      const existing = await commentsCollection.findOne({ id: comment.id });
      
      if (existing) {
        skipped++;
        console.log(`⏭️ Skipped duplicate: ${comment.id}`);
      } else {
        await commentsCollection.insertOne(comment);
        migrated++;
        console.log(`✅ Migrated: ${comment.id} - ${comment.userName}`);
      }
    }
    
    console.log(`\n🎉 Migration completed!`);
    console.log(`📊 Stats:`);
    console.log(`   - PostgreSQL comments: ${pgResult.rows.length}`);
    console.log(`   - MongoDB comments before: ${mongoCount}`);
    console.log(`   - MongoDB comments after: ${mongoCount + migrated}`);
    console.log(`   - Migrated: ${migrated}`);
    console.log(`   - Skipped (duplicates): ${skipped}`);
    
    // Verify final counts
    const finalMongoCount = await commentsCollection.countDocuments();
    console.log(`\n📊 Final verification:`);
    console.log(`   - Total comments in MongoDB: ${finalMongoCount}`);
    
    // Show some sample comments
    const sampleComments = await commentsCollection.find().limit(3).toArray();
    console.log(`\n📝 Sample comments in MongoDB:`);
    sampleComments.forEach((comment, index) => {
      console.log(`${index + 1}. ${comment.userName}: ${comment.content.substring(0, 50)}...`);
    });
    
    pgClient.release();
    
  } catch (error) {
    console.error('❌ Migration error:', error);
  } finally {
    await mongoClient.close();
    await pgPool.end();
  }
}

migrateDirect();
