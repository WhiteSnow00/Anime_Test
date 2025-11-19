/**
 * Database Initialization Script
 * 
 * Script khởi tạo database MongoDB với tất cả collections, schemas và indexes cần thiết.
 * Chạy script này một lần để thiết lập cấu trúc database.
 * 
 * Cách sử dụng:
 *   npx tsx scripts/init-database.ts
 * 
 * Hoặc thêm vào package.json:
 *   "scripts": {
 *     "db:init": "tsx scripts/init-database.ts"
 *   }
 */

/* eslint-disable no-console */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;
const DATABASE_NAME = process.env.MONGODB_DB_NAME || 'anime_streaming';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123!';
const MODERATOR_PASSWORD = process.env.MODERATOR_PASSWORD || 'mod123!';

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI is not defined in .env.local');
  process.exit(1);
}

// Define all schemas
const commentSchema = new mongoose.Schema({
  userName: { type: String, required: true, maxlength: 100 },
  displayName: { type: String, maxlength: 100 },
  content: { type: String, required: true, maxlength: 1000 },
  timestamp: { type: Date, default: Date.now },
  isApproved: { type: Boolean, default: true },
  userAgent: { type: String },
  ipAddress: { type: String, maxlength: 45 },
  episodeViewing: { type: Number },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false }
}, {
  collection: 'comments'
});

const commentLikeSchema = new mongoose.Schema({
  commentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  ipAddress: { type: String, required: true, maxlength: 45 },
  timestamp: { type: Date, default: Date.now },
  userAgent: { type: String }
}, {
  collection: 'comment_likes'
});

const commentReplySchema = new mongoose.Schema({
  parentCommentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', required: true },
  id: { type: String, required: true, unique: true },
  userName: { type: String, required: true, maxlength: 100 },
  displayName: { type: String, maxlength: 100 },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false },
  content: { type: String, required: true, maxlength: 1000 },
  timestamp: { type: Date, default: Date.now },
  isApproved: { type: Boolean, default: true },
  userAgent: { type: String },
  ipAddress: { type: String, maxlength: 45 },
  episodeViewing: { type: Number },
  likeCount: { type: Number, default: 0 }
}, {
  collection: 'comment_replies'
});

const adminSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, maxlength: 50 },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['admin', 'moderator'], default: 'moderator' },
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date },
  isActive: { type: Boolean, default: true }
}, {
  collection: 'admins'
});

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, maxlength: 50, trim: true },
  passwordHash: { type: String, required: true },
  email: { type: String, maxlength: 255, sparse: true, unique: true },
  displayName: { type: String, maxlength: 100, trim: true },
  role: { type: String, enum: ['user', 'administrator'], default: 'user' },
  createdAt: { type: Date, default: Date.now },
  lastLogin: { type: Date },
  isActive: { type: Boolean, default: true }
}, {
  collection: 'users'
});

// Define indexes
commentSchema.index({ timestamp: -1 });
commentSchema.index({ isApproved: 1 });
commentSchema.index({ episodeViewing: 1 });
commentSchema.index({ userId: 1 });

commentLikeSchema.index({ commentId: 1, userId: 1 }, { unique: true, sparse: true });
commentLikeSchema.index({ commentId: 1, ipAddress: 1 });
commentLikeSchema.index({ timestamp: -1 });
commentLikeSchema.index({ userId: 1, commentId: 1 });

commentReplySchema.index({ parentCommentId: 1 });
commentReplySchema.index({ timestamp: -1 });
commentReplySchema.index({ isApproved: 1 });
commentReplySchema.index({ userId: 1 });
commentReplySchema.index({ parentCommentId: 1, isApproved: 1, timestamp: 1 });

async function initializeDatabase() {
  console.log('🚀 Starting database initialization...\n');

  try {
    // Connect to MongoDB
    console.log('📡 Connecting to MongoDB...');
    const connectionUri = MONGODB_URI!.endsWith('/') 
      ? MONGODB_URI! + DATABASE_NAME 
      : MONGODB_URI! + '/' + DATABASE_NAME;
    
    await mongoose.connect(connectionUri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    console.log('✅ Connected to MongoDB\n');

    // Create models
    const Comment = mongoose.model('Comment', commentSchema);
    const CommentLike = mongoose.model('CommentLike', commentLikeSchema);
    const CommentReply = mongoose.model('CommentReply', commentReplySchema);
    const Admin = mongoose.model('Admin', adminSchema);
    const User = mongoose.model('User', userSchema);

    // Check and create collections
    const db = mongoose.connection.db;
    const collections = await db!.listCollections().toArray();
    const collectionNames = collections.map(c => c.name);

    console.log('📦 Creating collections and indexes...\n');

    // Create collections if they don't exist
    const collectionsToCreate = [
      { name: 'comments', model: Comment },
      { name: 'comment_likes', model: CommentLike },
      { name: 'comment_replies', model: CommentReply },
      { name: 'admins', model: Admin },
      { name: 'users', model: User }
    ];

    for (const { name, model } of collectionsToCreate) {
      if (!collectionNames.includes(name)) {
        console.log(`  ➕ Creating collection: ${name}`);
        await db!.createCollection(name);
      } else {
        console.log(`  ✓ Collection exists: ${name}`);
      }

      // Ensure indexes are created - handle conflicts by dropping and recreating
      console.log(`  🔍 Creating indexes for: ${name}`);
      try {
        await model.createIndexes();
      } catch (error: any) {
        // If index conflict (code 86), drop existing indexes and retry
        if (error.code === 86 || error.codeName === 'IndexKeySpecsConflict') {
          console.log(`  ⚠️  Index conflict detected, dropping and recreating indexes...`);
          
          try {
            // Drop all indexes except _id
            await db!.collection(name).dropIndexes();
            console.log(`  🗑️  Dropped existing indexes`);
            
            // Retry creating indexes
            await model.createIndexes();
            console.log(`  ✅ Indexes recreated successfully`);
          } catch (retryError) {
            console.error(`  ❌ Failed to recreate indexes:`, retryError);
            throw retryError;
          }
        } else {
          throw error;
        }
      }
    }

    console.log('\n✅ All collections and indexes created successfully\n');

    // Create default admin accounts if they don't exist
    console.log('👤 Checking admin accounts...\n');

    const adminCount = await Admin.countDocuments();
    
    if (adminCount === 0) {
      console.log('  ➕ Creating default admin accounts...');
      
      const defaultAdmins = [
        {
          username: 'admin',
          password: ADMIN_PASSWORD,
          role: 'admin' as const
        },
        {
          username: 'moderator',
          password: MODERATOR_PASSWORD,
          role: 'moderator' as const
        }
      ];

      for (const admin of defaultAdmins) {
        const passwordHash = await bcrypt.hash(admin.password, 12);
        
        await Admin.create({
          username: admin.username,
          passwordHash,
          role: admin.role,
          isActive: true
        });
        
        console.log(`    ✓ Created ${admin.role}: ${admin.username}`);
      }
      
      console.log('\n⚠️  IMPORTANT: Please change these default passwords in production!');
      console.log('   Default credentials:');
      console.log(`   - admin: ${ADMIN_PASSWORD}`);
      console.log(`   - moderator: ${MODERATOR_PASSWORD}\n`);
    } else {
      console.log(`  ✓ Admin accounts already exist (${adminCount} accounts)\n`);
    }

    // Display database statistics
    console.log('📊 Database Statistics:\n');
    
    const stats = {
      comments: await Comment.countDocuments(),
      comment_likes: await CommentLike.countDocuments(),
      comment_replies: await CommentReply.countDocuments(),
      admins: await Admin.countDocuments(),
      users: await User.countDocuments()
    };

    for (const [collection, count] of Object.entries(stats)) {
      console.log(`  ${collection.padEnd(20)}: ${count} documents`);
    }

    console.log('\n✅ Database initialization completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('   1. Update admin passwords in your admin panel');
    console.log('   2. Configure your environment variables');
    console.log('   3. Start your application\n');

  } catch (error) {
    console.error('\n❌ Database initialization failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run initialization
initializeDatabase()
  .then(() => {
    console.log('\n🎉 Database is ready to use!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
