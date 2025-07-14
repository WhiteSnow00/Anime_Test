import { MongoClient, Db, Collection } from 'mongodb';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// MongoDB connection string
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://kazenosakura100:animelovefanam1@ayaya.jtefs5i.mongodb.net/';
const DATABASE_NAME = process.env.MONGODB_DB_NAME || 'anime_streaming';

// Interfaces
export interface Comment {
  _id?: string;
  id: string;
  userName: string;
  content: string;
  timestamp: Date;
  isApproved: boolean;
  userAgent: string;
  ipAddress: string;
  episodeViewing?: number;
}

export interface Admin {
  _id?: string;
  username: string;
  passwordHash: string;
  role: 'admin' | 'moderator';
  createdAt: Date;
  lastLogin?: Date;
  isActive: boolean;
}

// Mongoose Schemas
const commentSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  userName: { type: String, required: true, maxlength: 100 },
  content: { type: String, required: true, maxlength: 1000 },
  timestamp: { type: Date, default: Date.now },
  isApproved: { type: Boolean, default: false },
  userAgent: { type: String },
  ipAddress: { type: String, maxlength: 45 },
  episodeViewing: { type: Number }
}, {
  collection: 'comments'
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

// Create indexes
commentSchema.index({ timestamp: -1 });
commentSchema.index({ isApproved: 1 });
commentSchema.index({ episodeViewing: 1 });
// Note: username index is automatically created by unique: true

// Models
const CommentModel = mongoose.models.Comment || mongoose.model('Comment', commentSchema);
const AdminModel = mongoose.models.Admin || mongoose.model('Admin', adminSchema);

export class MongoDBService {
  private static client: MongoClient | null = null;
  private static db: Db | null = null;
  private static isConnected = false;

  // Test MongoDB connection
  static async testConnection(): Promise<boolean> {
    try {
      if (!this.isConnected) {
        await this.connect();
      }
      
      // Ping the database
      await this.db?.admin().ping();
      return true;
    } catch (error) {
      console.error('MongoDB connection test failed:', error);
      return false;
    }
  }

  // Connect to MongoDB
  static async connect(): Promise<void> {
    try {
      if (this.isConnected && this.client) {
        return;
      }

      // Connect with Mongoose for ODM features
      if (mongoose.connection.readyState === 0) {
        await mongoose.connect(MONGODB_URI + DATABASE_NAME, {
          maxPoolSize: 10,
          serverSelectionTimeoutMS: 5000,
        });
      }

      // Also connect with native driver for admin operations
      this.client = new MongoClient(MONGODB_URI, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
      });
      
      await this.client.connect();
      this.db = this.client.db(DATABASE_NAME);
      this.isConnected = true;

      console.log('Connected to MongoDB successfully');
    } catch (error) {
      console.error('Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  // Initialize database collections and indexes
  static async initDatabase(): Promise<void> {
    try {
      await this.connect();

      // Ensure collections exist and create indexes
      await this.db?.createCollection('comments').catch(() => {}); // Ignore if exists
      await this.db?.createCollection('admins').catch(() => {}); // Ignore if exists

      // Create default admin if none exists
      const adminCount = await AdminModel.countDocuments();
      if (adminCount === 0) {
        await this.createDefaultAdmins();
      }

      console.log('MongoDB database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize MongoDB database:', error);
      throw error;
    }
  }

  // Create default admin accounts
  static async createDefaultAdmins(): Promise<void> {
    const defaultAdmins = [
      {
        username: 'admin',
        password: 'admin123!',
        role: 'admin' as const
      },
      {
        username: 'moderator',
        password: 'mod123!',
        role: 'moderator' as const
      }
    ];

    for (const admin of defaultAdmins) {
      const passwordHash = await bcrypt.hash(admin.password, 12);
      
      await AdminModel.create({
        username: admin.username,
        passwordHash,
        role: admin.role,
        isActive: true
      });
      
      console.log(`Created default ${admin.role}: ${admin.username}`);
    }
  }

  // Comment operations
  static async getComments(): Promise<Comment[]> {
    try {
      await this.connect();
      const comments = await CommentModel.find()
        .sort({ timestamp: -1 })
        .lean();
      
      return comments.map((comment: any) => ({
        _id: comment._id?.toString(),
        id: comment.id,
        userName: comment.userName,
        content: comment.content,
        timestamp: comment.timestamp,
        isApproved: comment.isApproved,
        userAgent: comment.userAgent,
        ipAddress: comment.ipAddress,
        episodeViewing: comment.episodeViewing
      }));
    } catch (error) {
      console.error('Failed to get comments:', error);
      throw error;
    }
  }

  static async addComment(comment: Omit<Comment, '_id'>): Promise<Comment> {
    try {
      await this.connect();
      const newComment = new CommentModel(comment);
      const savedComment = await newComment.save();
      
      return {
        _id: savedComment._id.toString(),
        id: savedComment.id,
        userName: savedComment.userName,
        content: savedComment.content,
        timestamp: savedComment.timestamp,
        isApproved: savedComment.isApproved,
        userAgent: savedComment.userAgent,
        ipAddress: savedComment.ipAddress,
        episodeViewing: savedComment.episodeViewing
      };
    } catch (error) {
      console.error('Failed to add comment:', error);
      throw error;
    }
  }

  static async approveComment(commentId: string): Promise<boolean> {
    try {
      await this.connect();
      const result = await CommentModel.updateOne(
        { id: commentId },
        { isApproved: true }
      );
      
      return result.modifiedCount > 0;
    } catch (error) {
      console.error('Failed to approve comment:', error);
      throw error;
    }
  }

  static async deleteComment(commentId: string): Promise<boolean> {
    try {
      await this.connect();
      const result = await CommentModel.deleteOne({ id: commentId });
      return result.deletedCount > 0;
    } catch (error) {
      console.error('Failed to delete comment:', error);
      throw error;
    }
  }

  // Admin operations
  static async validateAdmin(username: string, password: string): Promise<Admin | null> {
    try {
      await this.connect();
      const admin = await AdminModel.findOne({ 
        username: username.toLowerCase(),
        isActive: true 
      });
      
      if (!admin) {
        return null;
      }

      const isValidPassword = await bcrypt.compare(password, admin.passwordHash);
      if (!isValidPassword) {
        return null;
      }

      // Update last login
      await AdminModel.updateOne(
        { _id: admin._id },
        { lastLogin: new Date() }
      );

      return {
        _id: admin._id.toString(),
        username: admin.username,
        passwordHash: admin.passwordHash,
        role: admin.role,
        createdAt: admin.createdAt,
        lastLogin: admin.lastLogin,
        isActive: admin.isActive
      };
    } catch (error) {
      console.error('Failed to validate admin:', error);
      throw error;
    }
  }

  static async createAdmin(username: string, password: string, role: 'admin' | 'moderator' = 'moderator'): Promise<Admin> {
    try {
      await this.connect();
      
      // Check if admin already exists
      const existingAdmin = await AdminModel.findOne({ username: username.toLowerCase() });
      if (existingAdmin) {
        throw new Error('Admin with this username already exists');
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const newAdmin = new AdminModel({
        username: username.toLowerCase(),
        passwordHash,
        role,
        isActive: true
      });

      const savedAdmin = await newAdmin.save();
      
      return {
        _id: savedAdmin._id.toString(),
        username: savedAdmin.username,
        passwordHash: savedAdmin.passwordHash,
        role: savedAdmin.role,
        createdAt: savedAdmin.createdAt,
        lastLogin: savedAdmin.lastLogin,
        isActive: savedAdmin.isActive
      };
    } catch (error) {
      console.error('Failed to create admin:', error);
      throw error;
    }
  }

  // Migration helper to copy data from PostgreSQL
  static async migrateFromPostgreSQL(postgresComments: any[]): Promise<void> {
    try {
      await this.connect();
      
      console.log(`Starting migration of ${postgresComments.length} comments from PostgreSQL to MongoDB`);
      
      for (const pgComment of postgresComments) {
        const mongoComment = {
          id: pgComment.id,
          userName: pgComment.user_name || pgComment.userName,
          content: pgComment.content,
          timestamp: new Date(pgComment.timestamp),
          isApproved: pgComment.is_approved || pgComment.isApproved,
          userAgent: pgComment.user_agent || pgComment.userAgent || '',
          ipAddress: pgComment.ip_address || pgComment.ipAddress || '',
          episodeViewing: pgComment.episode_viewing || pgComment.episodeViewing
        };

        // Check if comment already exists
        const existingComment = await CommentModel.findOne({ id: mongoComment.id });
        if (!existingComment) {
          await CommentModel.create(mongoComment);
          console.log(`Migrated comment: ${mongoComment.id}`);
        } else {
          console.log(`Comment already exists: ${mongoComment.id}`);
        }
      }
      
      console.log('Migration completed successfully');
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  }

  // Close connections
  static async disconnect(): Promise<void> {
    try {
      if (this.client) {
        await this.client.close();
        this.client = null;
      }
      
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
      
      this.db = null;
      this.isConnected = false;
      console.log('Disconnected from MongoDB');
    } catch (error) {
      console.error('Error disconnecting from MongoDB:', error);
    }
  }
}
