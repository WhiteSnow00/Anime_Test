// Simplified MongoDB service that avoids client-side issues
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// Only run MongoDB code on the server side
const isServer = typeof window === 'undefined';

// MongoDB connection configuration - using environment variables for security
const MONGODB_URI = process.env.MONGODB_URI;
const DATABASE_NAME = process.env.MONGODB_DB_NAME || 'anime_streaming';
const MAX_POOL_SIZE = parseInt(process.env.MONGODB_MAX_POOL_SIZE || '25');
const SERVER_SELECTION_TIMEOUT = parseInt(process.env.MONGODB_SERVER_SELECTION_TIMEOUT || '15000');
const MAX_IDLE_TIME = parseInt(process.env.MONGODB_MAX_IDLE_TIME || '1800000');

// Validate required environment variables at runtime, not build time
function validateEnvironment() {
  if (!MONGODB_URI) {
    throw new Error(
      'MONGODB_URI environment variable is required. Please check your .env.local file. ' +
      'Expected format: mongodb+srv://username:password@cluster.mongodb.net/'
    );
  }
}

// Interfaces
export interface Comment {
  _id?: string;
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
    userName: { type: String, required: true, maxlength: 100 },
    content: { type: String, required: true, maxlength: 1000 },
    timestamp: { type: Date, default: Date.now },
    isApproved: { type: Boolean, default: true },
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

  // Models
  CommentModel = mongoose.models.Comment || mongoose.model('Comment', commentSchema);
  AdminModel = mongoose.models.Admin || mongoose.model('Admin', adminSchema);
}

export class SimpleMongoDBService {
  private static isConnected = false;
  private static connectionAttempts = 0;
  private static readonly MAX_RECONNECT_ATTEMPTS = parseInt(process.env.MAX_RECONNECT_ATTEMPTS || '5');
  private static readonly RECONNECT_DELAY_BASE = parseInt(process.env.RECONNECT_DELAY_BASE || '1000');
  private static lastConnectionError: Error | null = null;

  private static logConnectionStatus(message: string, isError = false) {
    if (process.env.ENABLE_DB_LOGGING === 'true') {
      const timestamp = new Date().toISOString();
      const logMessage = `[${timestamp}] MongoDB: ${message}`;
      
      if (isError) {
        console.error(logMessage);
      } else {
        console.log(logMessage);
      }
    }
  }

  private static async retryOperation<T>(
    operation: () => Promise<T>,
    operationName: string,
    maxRetries = 3
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        if (!this.isConnected || mongoose.connection.readyState !== 1) {
          this.logConnectionStatus(`Reconnecting before ${operationName} (attempt ${attempt + 1})`);
          await this.connect();
        }
        
        const result = await operation();
        
        if (attempt > 0) {
          this.logConnectionStatus(`${operationName} succeeded after ${attempt + 1} attempts`);
        }
        
        return result;
        
      } catch (error) {
        lastError = error as Error;
        this.logConnectionStatus(
          `${operationName} attempt ${attempt + 1} failed: ${lastError.message}`,
          true
        );
        
        const isRetryableError = this.isRetryableError(lastError);
        
        if (!isRetryableError || attempt === maxRetries - 1) {
          break;
        }
        
        const delay = this.calculateBackoffDelay(attempt);
        this.logConnectionStatus(`Retrying ${operationName} in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        
        this.isConnected = false;
      }
    }
    
    throw new Error(
      `${operationName} failed after ${maxRetries} attempts. Last error: ${lastError?.message}`
    );
  }

  private static isRetryableError(error: Error): boolean {
    const retryableErrors = [
      'MongoServerSelectionError',
      'MongoTimeoutError',
      'MongoNetworkError',
      'MongoWriteConcernError',
      'ECONNRESET',
      'ETIMEDOUT',
      'ENOTFOUND',
      'MongoError'
    ];
    
    return retryableErrors.some(errorType => 
      error.name.includes(errorType) || 
      error.message.includes(errorType) ||
      error.message.includes('connection') ||
      error.message.includes('timeout') ||
      error.message.includes('network')
    );
  }

  private static calculateBackoffDelay(attempt: number): number {
    return Math.min(this.RECONNECT_DELAY_BASE * Math.pow(2, attempt), 30000);
  }

  static async connect(): Promise<void> {
    if (!isServer) throw new Error('MongoDB operations are server-side only');
    
    validateEnvironment();
    
    if (this.isConnected && mongoose.connection.readyState === 1) {
      this.logConnectionStatus('Already connected to MongoDB');
      return;
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.MAX_RECONNECT_ATTEMPTS; attempt++) {
      try {
        this.connectionAttempts++;
        this.logConnectionStatus(`Connection attempt ${attempt + 1}/${this.MAX_RECONNECT_ATTEMPTS}`);

        if (mongoose.connection.readyState === 0) {
          await mongoose.connect(MONGODB_URI + DATABASE_NAME, {
            maxPoolSize: MAX_POOL_SIZE,
            serverSelectionTimeoutMS: SERVER_SELECTION_TIMEOUT,
            maxIdleTimeMS: MAX_IDLE_TIME,
            retryWrites: true,
            w: 'majority',
            readPreference: 'primary',
            compressors: ['zlib'],
            heartbeatFrequencyMS: 10000,
          });
        }

        this.isConnected = true;
        this.logConnectionStatus(`Connected to MongoDB successfully (attempt ${attempt + 1})`);
        return;
        
      } catch (error) {
        lastError = error as Error;
        this.lastConnectionError = lastError;
        this.logConnectionStatus(
          `Connection attempt ${attempt + 1} failed: ${lastError.message}`, 
          true
        );

        if (attempt < this.MAX_RECONNECT_ATTEMPTS - 1) {
          const delay = this.calculateBackoffDelay(attempt);
          this.logConnectionStatus(`Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    this.isConnected = false;
    throw new Error(
      `Failed to connect to MongoDB after ${this.MAX_RECONNECT_ATTEMPTS} attempts. ` +
      `Last error: ${lastError?.message}. ` +
      `Please check your connection string and network connectivity.`
    );
  }

  static async getComments(): Promise<Comment[]> {
    if (!isServer || !CommentModel) return [];
    
    return this.retryOperation(
      async () => {
        const comments = await CommentModel.find()
          .sort({ timestamp: -1 })
          .lean();
        
        this.logConnectionStatus(`Retrieved ${comments.length} comments successfully`);
        
        return comments.map((comment: any) => ({
          _id: comment._id?.toString(),
          userName: comment.userName,
          content: comment.content,
          timestamp: comment.timestamp,
          isApproved: comment.isApproved,
          userAgent: comment.userAgent,
          ipAddress: comment.ipAddress,
          episodeViewing: comment.episodeViewing
        }));
      },
      'getComments'
    );
  }

  static async addComment(comment: Omit<Comment, '_id'>): Promise<Comment> {
    if (!isServer || !CommentModel) throw new Error('Server-side only operation');
    
    return this.retryOperation(
      async () => {
        const newComment = new CommentModel(comment);
        const savedComment = await newComment.save();
        
        this.logConnectionStatus(`Comment added successfully: ${savedComment._id}`);
        
        return {
          _id: savedComment._id.toString(),
          userName: savedComment.userName,
          content: savedComment.content,
          timestamp: savedComment.timestamp,
          isApproved: savedComment.isApproved,
          userAgent: savedComment.userAgent,
          ipAddress: savedComment.ipAddress,
          episodeViewing: savedComment.episodeViewing
        };
      },
      'addComment'
    );
  }

  static async approveComment(commentId: string): Promise<boolean> {
    if (!isServer || !CommentModel) return false;
    
    try {
      await this.connect();
      const result = await CommentModel.updateOne(
        { _id: commentId },
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
      
      const comment = await CommentModel.findOne({ _id: commentId });
      if (!comment) {
        console.error('Comment not found:', commentId);
        return false;
      }
      
      const newApprovalStatus = !comment.isApproved;
      const result = await CommentModel.updateOne(
        { _id: commentId },
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
      const result = await CommentModel.deleteOne({ _id: commentId });
      return result.deletedCount > 0;
    } catch (error) {
      console.error('Failed to delete comment:', error);
      throw error;
    }
  }

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

export const mongoDbService = new SimpleMongoDBService();
