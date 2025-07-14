// Simplified MongoDB service that avoids client-side issues
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Only run MongoDB code on the server side
const isServer = typeof window === 'undefined';

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

// Mongoose Schemas - only define on server
let CommentModel: any = null;
let AdminModel: any = null;

if (isServer) {
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
  adminSchema.index({ username: 1 });

  // Models
  CommentModel = mongoose.models.Comment || mongoose.model('Comment', commentSchema);
  AdminModel = mongoose.models.Admin || mongoose.model('Admin', adminSchema);
}

export class SimpleMongoDBService {
  private static isConnected = false;

  // Test MongoDB connection
  static async testConnection(): Promise<boolean> {
    if (!isServer) return false;
    
    try {
      if (!this.isConnected) {
        await this.connect();
      }
      
      // Simple ping test
      if (mongoose.connection.readyState === 1) {
        return true;
      }
      return false;
    } catch (error) {
      console.error('MongoDB connection test failed:', error);
      return false;
    }
  }

  // Connect to MongoDB
  static async connect(): Promise<void> {
    if (!isServer) throw new Error('MongoDB operations are server-side only');
    
    try {
      if (this.isConnected && mongoose.connection.readyState === 1) {
        return;
      }

      if (mongoose.connection.readyState === 0) {
        await mongoose.connect(MONGODB_URI + DATABASE_NAME, {
          maxPoolSize: 10,
          serverSelectionTimeoutMS: 5000,
        });
      }

      this.isConnected = true;
      console.log('Connected to MongoDB successfully');
    } catch (error) {
      console.error('Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  // Initialize database collections and indexes
  static async initDatabase(): Promise<void> {
    if (!isServer) throw new Error('Database initialization is server-side only');
    
    try {
      await this.connect();

      // Create default admin if none exists
      if (AdminModel) {
        const adminCount = await AdminModel.countDocuments();
        if (adminCount === 0) {
          await this.createDefaultAdmins();
        }
      }

      console.log('MongoDB database initialized successfully');
    } catch (error) {
      console.error('Failed to initialize MongoDB database:', error);
      throw error;
    }
  }

  // Create default admin accounts
  static async createDefaultAdmins(): Promise<void> {
    if (!isServer || !AdminModel) return;
    
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
    if (!isServer || !CommentModel) return [];
    
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
    if (!isServer || !CommentModel) throw new Error('Server-side only operation');
    
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
    if (!isServer || !CommentModel) return false;
    
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

  static async toggleApproval(commentId: string): Promise<boolean> {
    if (!isServer || !CommentModel) return false;
    
    try {
      await this.connect();
      
      // First get the current approval status
      const comment = await CommentModel.findOne({ id: commentId });
      if (!comment) {
        console.error('Comment not found:', commentId);
        return false;
      }
      
      // Toggle the approval status
      const newApprovalStatus = !comment.isApproved;
      const result = await CommentModel.updateOne(
        { id: commentId },
        { isApproved: newApprovalStatus }
      );
      
      console.log(`Comment ${commentId} approval toggled to: ${newApprovalStatus}`);
      return result.modifiedCount > 0;
    } catch (error) {
      console.error('Failed to toggle comment approval:', error);
      throw error;
    }
  }

  static async deleteComment(commentId: string): Promise<boolean> {
    if (!isServer || !CommentModel) return false;
    
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
    if (!isServer || !AdminModel) return null;
    
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

  // Admin methods
  static async getAllCommentsAdmin(password: string): Promise<{comments: Comment[], stats: any} | null> {
    if (!isServer || !CommentModel) throw new Error('Server-side only operation');
    
    try {
      // Validate admin password first
      const admin = await this.validateAdmin('admin', password);
      if (!admin) {
        return null;
      }

      await this.connect();
      
      // Get all comments (approved and unapproved)
      const comments = await CommentModel.find({})
        .sort({ timestamp: -1 })
        .lean()
        .exec();
      
      // Calculate stats
      const totalComments = comments.length;
      const approvedComments = comments.filter((c: any) => c.isApproved).length;
      const pendingComments = totalComments - approvedComments;
      
      // Calculate comments from today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const commentsToday = comments.filter((c: any) => {
        const commentDate = new Date(c.timestamp);
        commentDate.setHours(0, 0, 0, 0);
        return commentDate.getTime() === today.getTime();
      }).length;
      
      const stats = {
        totalComments: totalComments,
        approvedComments: approvedComments,
        pendingComments: pendingComments,
        commentsToday: commentsToday
      };
      
      return {
        comments: comments.map((comment: any) => ({
          id: comment.id,
          userName: comment.userName,
          content: comment.content,
          timestamp: comment.timestamp,
          isApproved: comment.isApproved,
          userAgent: comment.userAgent,
          ipAddress: comment.ipAddress,
          episodeViewing: comment.episodeViewing
        })),
        stats
      };
    } catch (error) {
      console.error('Failed to get admin comments:', error);
      throw error;
    }
  }

  // Migration helper
  static async migrateFromPostgreSQL(postgresComments: any[]): Promise<void> {
    if (!isServer || !CommentModel) throw new Error('Server-side only operation');
    
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
    if (!isServer) return;
    
    try {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
      }
      
      this.isConnected = false;
      console.log('Disconnected from MongoDB');
    } catch (error) {
      console.error('Error disconnecting from MongoDB:', error);
    }
  }
}
